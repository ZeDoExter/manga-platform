package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

var (
	ErrUserExists        = errors.New("email already registered")
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidPassword   = errors.New("invalid email or password")
	ErrUserBanned        = errors.New("user account is banned")
	ErrInvalidEmail      = errors.New("invalid email address")
	ErrWeakPassword      = errors.New("password must be at least 6 characters")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrPermissionDenied  = errors.New("permission denied")
)

type Role string

const (
	RoleGuest    Role = "guest"
	RoleUser     Role = "user"
	RoleUploader Role = "uploader"
	RoleAdmin    Role = "admin"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Salt         string    `json:"-"`
	Role         Role      `json:"role"`
	Banned       bool      `json:"banned"`
	CreatedAt    time.Time `json:"created_at"`
}

type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	Role      Role      `json:"role"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Service holds validation + business rules; persistence goes through Store.
type Service struct {
	store Store
}

// NewService creates an in-memory service (default for tests and local dev
// without DATABASE_URL).
func NewService() *Service {
	return &Service{store: NewMemoryStore()}
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(store Store) *Service {
	return &Service{store: store}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func hashPassword(password, salt string) string {
	h := sha256.New()
	h.Write([]byte(salt + ":" + password))
	return hex.EncodeToString(h.Sum(nil))
}

// SignUp registers a new user account (FR-A1). Default role is RoleUser.
func (s *Service) SignUp(ctx context.Context, email, password string, role Role) (*User, error) {
	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" || !strings.Contains(normEmail, "@") {
		return nil, ErrInvalidEmail
	}
	if len(password) < 6 {
		return nil, ErrWeakPassword
	}
	if role == "" {
		role = RoleUser
	}

	saltBytes := make([]byte, 16)
	_, _ = rand.Read(saltBytes)
	salt := hex.EncodeToString(saltBytes)
	hash := hashPassword(password, salt)

	user := &User{
		ID:           generateID("usr"),
		Email:        normEmail,
		PasswordHash: hash,
		Salt:         salt,
		Role:         role,
		Banned:       false,
		CreatedAt:    time.Now(),
	}

	if err := s.store.InsertUser(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// Login verifies credentials and creates an active session token (FR-A1).
func (s *Service) Login(ctx context.Context, email, password string) (*Session, error) {
	normEmail := strings.ToLower(strings.TrimSpace(email))

	user, err := s.store.GetUserByEmail(ctx, normEmail)
	if err != nil {
		return nil, ErrInvalidPassword
	}
	if user.Banned {
		return nil, ErrUserBanned
	}

	expectedHash := hashPassword(password, user.Salt)
	if subtle.ConstantTimeCompare([]byte(user.PasswordHash), []byte(expectedHash)) != 1 {
		return nil, ErrInvalidPassword
	}

	// Create session
	tokenBytes := make([]byte, 24)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	session := &Session{
		Token:     token,
		UserID:    user.ID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	if err := s.store.InsertSession(ctx, session); err != nil {
		return nil, err
	}

	return session, nil
}

// ValidateSession retrieves the session and validates expiry.
func (s *Service) ValidateSession(ctx context.Context, token string) (*Session, error) {
	session, err := s.store.GetSession(ctx, token)
	if err != nil {
		return nil, ErrUnauthorized
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, ErrUnauthorized
	}

	user, err := s.store.GetUser(ctx, session.UserID)
	if err != nil || user.Banned {
		return nil, ErrUserBanned
	}

	return session, nil
}

// CanEditStory enforces the invariant: "Uploader rights are per-story, not global" (FR-A2).
// Admins can edit any story. Uploaders can only edit stories they own or are team members of.
func (s *Service) CanEditStory(userID string, storyOwnerID string, storyTeamIDs []string) (bool, error) {
	user, err := s.store.GetUser(context.Background(), userID)
	if err != nil {
		return false, ErrUserNotFound
	}
	if user.Banned {
		return false, ErrUserBanned
	}

	if user.Role == RoleAdmin {
		return true, nil
	}

	// Owner check
	if user.ID == storyOwnerID {
		return true, nil
	}

	// Team member check
	for _, teamMemberID := range storyTeamIDs {
		if user.ID == teamMemberID {
			return true, nil
		}
	}

	return false, nil
}

// SetBanStatus allows Admins to ban or unban users (FR-D3).
func (s *Service) SetBanStatus(ctx context.Context, targetUserID string, banned bool) error {
	return s.store.SetBanStatus(ctx, targetUserID, banned)
}
