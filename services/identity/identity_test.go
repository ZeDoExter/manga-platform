package identity_test

import (
	"context"
	"testing"

	"manga-platform/services/identity"
)

func TestFR_A1_SignUpAndLogin(t *testing.T) {
	ctx := context.Background()
	svc := identity.NewService()

	// 1. Weak password rejected
	_, err := svc.SignUp(ctx, "user@example.com", "123", identity.RoleUser)
	if err != identity.ErrWeakPassword {
		t.Fatalf("expected ErrWeakPassword, got %v", err)
	}

	// 2. Invalid email rejected
	_, err = svc.SignUp(ctx, "not-an-email", "secret123", identity.RoleUser)
	if err != identity.ErrInvalidEmail {
		t.Fatalf("expected ErrInvalidEmail, got %v", err)
	}

	// 3. Valid signup
	user, err := svc.SignUp(ctx, "Alice@Example.COM", "secret123", identity.RoleUser)
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}
	if user.Email != "alice@example.com" {
		t.Errorf("expected normalized email, got %s", user.Email)
	}

	// 4. Duplicate signup rejected
	_, err = svc.SignUp(ctx, "alice@example.com", "otherpassword", identity.RoleUser)
	if err != identity.ErrUserExists {
		t.Fatalf("expected ErrUserExists, got %v", err)
	}

	// 5. Wrong password login rejected
	_, err = svc.Login(ctx, "alice@example.com", "wrongpass")
	if err != identity.ErrInvalidPassword {
		t.Fatalf("expected ErrInvalidPassword, got %v", err)
	}

	// 6. Valid login
	sess, err := svc.Login(ctx, "alice@example.com", "secret123")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if sess.Token == "" {
		t.Fatal("expected non-empty session token")
	}

	// 7. Validate session
	validSess, err := svc.ValidateSession(ctx, sess.Token)
	if err != nil {
		t.Fatalf("ValidateSession failed: %v", err)
	}
	if validSess.UserID != user.ID {
		t.Errorf("session user ID mismatch: %s vs %s", validSess.UserID, user.ID)
	}
}

// TestFR_A2_PerStoryUploaderRights enforces:
// "Uploader rights are per-story. Never implement a global is_uploader check".
func TestFR_A2_PerStoryUploaderRights(t *testing.T) {
	ctx := context.Background()
	svc := identity.NewService()

	uploaderA, _ := svc.SignUp(ctx, "uploaderA@test.com", "pass123", identity.RoleUploader)
	uploaderB, _ := svc.SignUp(ctx, "uploaderB@test.com", "pass123", identity.RoleUploader)
	teamMember, _ := svc.SignUp(ctx, "team@test.com", "pass123", identity.RoleUser)
	admin, _ := svc.SignUp(ctx, "admin@test.com", "pass123", identity.RoleAdmin)

	storyOwnerID := uploaderA.ID
	storyTeamIDs := []string{teamMember.ID}

	// UploaderA is owner -> CAN edit
	canEdit, err := svc.CanEditStory(uploaderA.ID, storyOwnerID, storyTeamIDs)
	if err != nil || !canEdit {
		t.Errorf("story owner should be allowed to edit: canEdit=%v, err=%v", canEdit, err)
	}

	// Team member is in storyTeamIDs -> CAN edit
	canEdit, err = svc.CanEditStory(teamMember.ID, storyOwnerID, storyTeamIDs)
	if err != nil || !canEdit {
		t.Errorf("team member should be allowed to edit: canEdit=%v, err=%v", canEdit, err)
	}

	// UploaderB is an uploader, but NOT owner or team member of this story -> CANNOT edit!
	canEdit, err = svc.CanEditStory(uploaderB.ID, storyOwnerID, storyTeamIDs)
	if err != nil || canEdit {
		t.Errorf("unrelated uploader must NOT be allowed to edit: canEdit=%v, err=%v", canEdit, err)
	}

	// Admin -> CAN edit any story
	canEdit, err = svc.CanEditStory(admin.ID, storyOwnerID, storyTeamIDs)
	if err != nil || !canEdit {
		t.Errorf("admin should be allowed to edit any story: canEdit=%v, err=%v", canEdit, err)
	}
}

// TestFR_D3_BannedUserBlocked tests ban enforcement.
func TestFR_D3_BannedUserBlocked(t *testing.T) {
	ctx := context.Background()
	svc := identity.NewService()

	badUser, _ := svc.SignUp(ctx, "bad@user.com", "pass123", identity.RoleUser)
	sess, _ := svc.Login(ctx, "bad@user.com", "pass123")

	// Admin bans user
	_ = svc.SetBanStatus(ctx, badUser.ID, true)

	// Existing session invalid
	_, err := svc.ValidateSession(ctx, sess.Token)
	if err != identity.ErrUserBanned {
		t.Errorf("expected ErrUserBanned, got %v", err)
	}

	// New login rejected
	_, err = svc.Login(ctx, "bad@user.com", "pass123")
	if err != identity.ErrUserBanned {
		t.Errorf("expected ErrUserBanned, got %v", err)
	}
}
