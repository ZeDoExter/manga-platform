package reader

import (
	"context"
	"errors"
	"time"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
)

var (
	ErrLoginRequired      = errors.New("login required to access coin-locked chapter")
	ErrPaymentRequired    = errors.New("chapter not purchased; entitlement required")
	ErrContentUnavailable = errors.New("chapter is hidden or has been taken down")
)

type AdPolicy string

const (
	AdPolicyInline AdPolicy = "inline" // Guests: ads between pages
	AdPolicyBanner AdPolicy = "banner" // Users / Uploaders: top banner only
	AdPolicyNone   AdPolicy = "none"   // Admins / Subscribers: zero ads
)

type ReadChapterRequest struct {
	UserID    string
	Role      identity.Role
	ChapterID string
}

type ReadChapterResponse struct {
	ChapterID      string            `json:"chapter_id"`
	StoryID        string            `json:"story_id"`
	Title          string            `json:"title"`
	StoryType      catalog.StoryType `json:"story_type"`
	PageSignedURLs []string          `json:"page_signed_urls,omitempty"` // Expiring CDN URLs (FR-R4)
	NovelText      string            `json:"novel_text,omitempty"`
	AdPolicy       AdPolicy          `json:"ad_policy"`
}

type Service struct {
	catalog  *catalog.Service
	commerce *commerce.Service
	identity *identity.Service
	storage  imagestore.ImageStore
}

func NewService(cat *catalog.Service, com *commerce.Service, id *identity.Service, store imagestore.ImageStore) *Service {
	return &Service{
		catalog:  cat,
		commerce: com,
		identity: id,
		storage:  store,
	}
}

// ReadChapter serves chapter content after mandatory entitlement verification (FR-R3).
// Never proxies image bytes; returns expiring signed URLs for CDN retrieval (NFR-Scale-2, FR-R4).
func (s *Service) ReadChapter(ctx context.Context, req ReadChapterRequest) (*ReadChapterResponse, error) {
	// 1. Fetch chapter from catalog
	chap, err := s.catalog.GetChapter(ctx, req.ChapterID)
	if err != nil {
		return nil, err
	}

	// 2. Takedown and visibility check (FR-D2)
	if chap.Status == catalog.StatusTakenDown || chap.Status == catalog.StatusHidden {
		return nil, ErrContentUnavailable
	}

	story, err := s.catalog.GetStory(ctx, chap.StoryID)
	if err != nil {
		return nil, err
	}

	if story.Status == catalog.StatusTakenDown || story.Status == catalog.StatusHidden {
		return nil, ErrContentUnavailable
	}

	// 3. Entitlement gating (FR-R3, FR-X1, FR-X2)
	canRead := false

	// Free chapter check
	if chap.IsFree() {
		canRead = true
	} else if req.Role == identity.RoleAdmin {
		// Admin override
		canRead = true
	} else if req.UserID != "" {
		// Check if user is story owner or creator team member (FR-X2)
		teamIDs := make([]string, 0, len(story.CreatorSplits))
		for _, sp := range story.CreatorSplits {
			teamIDs = append(teamIDs, sp.CreatorID)
		}
		isCreator, _ := s.identity.CanEditStory(req.UserID, story.OwnerID, teamIDs)
		if isCreator {
			canRead = true
		} else {
			// Check purchased entitlement in commerce ledger
			entitled, err := s.commerce.CheckEntitlement(ctx, req.UserID, req.ChapterID)
			if err != nil {
				return nil, err
			}
			canRead = entitled
		}
	}

	if !canRead {
		if req.UserID == "" || req.Role == identity.RoleGuest {
			return nil, ErrLoginRequired
		}
		return nil, ErrPaymentRequired
	}

	// 4. Determine Ad Policy (FR-X3)
	adPolicy := AdPolicyBanner
	if req.Role == identity.RoleGuest || req.UserID == "" {
		adPolicy = AdPolicyInline
	} else if req.Role == identity.RoleAdmin {
		adPolicy = AdPolicyNone
	}

	// 5. Generate content with expiring signed URLs (FR-R4)
	var signedURLs []string
	if story.Type == catalog.StoryTypeManga && len(chap.PageKeys) > 0 {
		signedURLs = make([]string, 0, len(chap.PageKeys))
		for _, pageKey := range chap.PageKeys {
			url, err := s.storage.SignURL(ctx, pageKey, 15*time.Minute)
			if err != nil {
				return nil, err
			}
			signedURLs = append(signedURLs, url)
		}
	}

	return &ReadChapterResponse{
		ChapterID:      chap.ID,
		StoryID:        chap.StoryID,
		Title:          chap.Title,
		StoryType:      story.Type,
		PageSignedURLs: signedURLs,
		NovelText:      chap.NovelText,
		AdPolicy:       adPolicy,
	}, nil
}
