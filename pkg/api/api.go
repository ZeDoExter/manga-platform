package api

import (
	"time"

	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
)

type CreateUserRequest struct {
	Email    string        `json:"email"`
	Password string        `json:"password"`
	Role     identity.Role `json:"role,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type CanEditStoryRequest struct {
	OwnerID string   `json:"owner_id"`
	TeamIDs []string `json:"team_ids"`
}

type CanEditStoryResponse struct {
	Allowed bool `json:"allowed"`
}

type SetBanRequest struct {
	Banned bool `json:"banned"`
}

type CreateStoryRequest struct {
	ID       string                 `json:"id,omitempty"`
	OwnerID  string                 `json:"owner_id"`
	Type     catalog.StoryType      `json:"type"`
	Title    string                 `json:"title"`
	Synopsis string                 `json:"synopsis"`
	Tags     []string               `json:"tags"`
	Splits   []catalog.CreatorSplit `json:"splits"`
}

type CreateChapterRequest struct {
	ID           string     `json:"id,omitempty"`
	OrderIndex   int        `json:"order_index"`
	Title        string     `json:"title"`
	PriceCoins   int64      `json:"price_coins"`
	PageKeys     []string   `json:"page_keys"`
	NovelText    string     `json:"novel_text"`
	AutoUnlockAt *time.Time `json:"auto_unlock_at,omitempty"`
}

type SetChapterStatusRequest struct {
	Status catalog.ContentStatus `json:"status"`
}

type UpdateChapterRequest struct {
	Title      string `json:"title"`
	PriceCoins int64  `json:"price_coins"`
}

type TopUpRequest struct {
	UserID         string            `json:"user_id"`
	Amount         int64             `json:"amount"`
	CoinType       commerce.CoinType `json:"coin_type"`
	RefID          string            `json:"ref_id"`
	IdempotencyKey string            `json:"idempotency_key"`
}

type PurchaseChapterRequest struct {
	UserID         string                  `json:"user_id"`
	StoryID        string                  `json:"story_id"`
	ChapterID      string                  `json:"chapter_id"`
	Price          int64                   `json:"price"`
	CreatorSplits  []commerce.CreatorSplit `json:"creator_splits"`
	IdempotencyKey string                  `json:"idempotency_key"`
}

type ReversePurchaseRequest struct {
	TakedownID string `json:"takedown_id"`
}

type EntitlementResponse struct {
	Entitled bool `json:"entitled"`
}

type LedgerResponse struct {
	Entries []*commerce.LedgerEntry `json:"entries"`
}

type EntitlementsResponse struct {
	Entitlements []*commerce.Entitlement `json:"entitlements"`
}

type CreatorEarningsResponse struct {
	TotalCoins int64                      `json:"total_coins"`
	Entries    []*commerce.CreatorEarning `json:"entries"`
}

type ReadChapterRequest struct {
	UserID    string        `json:"user_id"`
	Role      identity.Role `json:"role"`
	ChapterID string        `json:"chapter_id"`
}
