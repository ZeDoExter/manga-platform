package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
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

type Service struct {
	mu       sync.RWMutex
	users    map[string]*User    // key: user_id
	byEmail  map[string]*User    // key: normalized email
	sessions map[string]*Session // key: token
}

func NewService() *Service {
	return &Service{
		users:    make(map[string]*User),
		byEmail:  make(map[string]*User),
		sessions: make(map[string]*Session),
	}
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

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.byEmail[normEmail]; exists {
		return nil, ErrUserExists
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

	s.users[user.ID] = user
	s.byEmail[normEmail] = user
	return user, nil
}

// Login verifies credentials and creates an active session token (FR-A1).
func (s *Service) Login(ctx context.Context, email, password string) (*Session, error) {
	normEmail := strings.ToLower(strings.TrimSpace(email))

	s.mu.RLock()
	user, exists := s.byEmail[normEmail]
	s.mu.RUnlock()

	if !exists {
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

	s.mu.Lock()
	s.sessions[token] = session
	s.mu.Unlock()

	return session, nil
}

// ValidateSession retrieves the session and validates expiry.
func (s *Service) ValidateSession(ctx context.Context, token string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, exists := s.sessions[token]
	if !exists || time.Now().After(session.ExpiresAt) {
		return nil, ErrUnauthorized
	}

	user, userExists := s.users[session.UserID]
	if !userExists || user.Banned {
		return nil, ErrUserBanned
	}

	return session, nil
}

// CanEditStory enforces the invariant: "Uploader rights are per-story, not global" (FR-A2).
// Admins can edit any story. Uploaders can only edit stories they own or are team members of.
func (s *Service) CanEditStory(userID string, storyOwnerID string, storyTeamIDs []string) (bool, error) {
	s.mu.RLock()
	user, exists := s.users[userID]
	s.mu.RUnlock()

	if !exists {
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
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[targetUserID]
	if !exists {
		return ErrUserNotFound
	}
	user.Banned = banned
	return nil
}
