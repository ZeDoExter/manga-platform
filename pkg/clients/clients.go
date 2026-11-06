package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"manga-platform/pkg/api"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
)

type HTTPError struct {
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("upstream returned %d: %s", e.StatusCode, e.Message)
}

func statusOf(err error) int {
	if he, ok := err.(*HTTPError); ok {
		return he.StatusCode
	}
	return 0
}

type client struct {
	baseURL string
	http    *http.Client
}

func newClient(baseURL string) client {
	return client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second, Transport: otelhttp.NewTransport(http.DefaultTransport)},
	}
}

func (c client) do(ctx context.Context, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		payload, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return err
	}
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusMultipleChoices {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return &HTTPError{StatusCode: resp.StatusCode, Message: strings.TrimSpace(string(msg))}
	}

	if out == nil || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil && err != io.EOF {
		return err
	}
	return nil
}

type CatalogClient struct {
	client
}

func NewCatalog(baseURL string) *CatalogClient {
	return &CatalogClient{newClient(baseURL)}
}

func (c *CatalogClient) GetChapter(ctx context.Context, chapterID string) (*catalog.Chapter, error) {
	var out catalog.Chapter
	err := c.do(ctx, http.MethodGet, "/chapters/"+url.PathEscape(chapterID), nil, &out)
	if statusOf(err) == http.StatusNotFound {
		return nil, catalog.ErrChapterNotFound
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *CatalogClient) GetStory(ctx context.Context, storyID string) (*catalog.Story, error) {
	var out catalog.Story
	err := c.do(ctx, http.MethodGet, "/stories/"+url.PathEscape(storyID), nil, &out)
	if statusOf(err) == http.StatusNotFound {
		return nil, catalog.ErrStoryNotFound
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *CatalogClient) SetChapterStatus(ctx context.Context, chapterID string, status catalog.ContentStatus) error {
	err := c.do(ctx, http.MethodPatch, "/chapters/"+url.PathEscape(chapterID)+"/status", api.SetChapterStatusRequest{Status: status}, nil)
	if statusOf(err) == http.StatusNotFound {
		return catalog.ErrChapterNotFound
	}
	return err
}

type CommerceClient struct {
	client
}

func NewCommerce(baseURL string) *CommerceClient {
	return &CommerceClient{newClient(baseURL)}
}

func (c *CommerceClient) CheckEntitlement(ctx context.Context, userID, chapterID string) (bool, error) {
	var out api.EntitlementResponse
	err := c.do(ctx, http.MethodGet, "/entitlements/"+url.PathEscape(userID)+"/"+url.PathEscape(chapterID), nil, &out)
	if err != nil {
		return false, err
	}
	return out.Entitled, nil
}

func (c *CommerceClient) ReversePurchaseOnTakedown(ctx context.Context, purchaseID, takedownID string) error {
	err := c.do(ctx, http.MethodPost, "/purchases/"+url.PathEscape(purchaseID)+"/reverse", api.ReversePurchaseRequest{TakedownID: takedownID}, nil)
	if statusOf(err) == http.StatusNotFound {
		return commerce.ErrPurchaseNotFound
	}
	return err
}

type IdentityClient struct {
	client
}

func NewIdentity(baseURL string) *IdentityClient {
	return &IdentityClient{newClient(baseURL)}
}

func (c *IdentityClient) CanEditStory(userID, storyOwnerID string, storyTeamIDs []string) (bool, error) {
	var out api.CanEditStoryResponse
	err := c.do(context.Background(), http.MethodPost, "/users/"+url.PathEscape(userID)+"/can-edit-story",
		api.CanEditStoryRequest{OwnerID: storyOwnerID, TeamIDs: storyTeamIDs}, &out)
	if err != nil {
		return false, err
	}
	return out.Allowed, nil
}

func (c *IdentityClient) SetBanStatus(ctx context.Context, targetUserID string, banned bool) error {
	err := c.do(ctx, http.MethodPost, "/users/"+url.PathEscape(targetUserID)+"/ban", api.SetBanRequest{Banned: banned}, nil)
	if statusOf(err) == http.StatusNotFound {
		return identity.ErrUserNotFound
	}
	return err
}
