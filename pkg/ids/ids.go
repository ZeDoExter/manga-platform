package ids

import (
	"crypto/rand"
	"encoding/hex"
)

// New returns a prefixed random ID (prefix + "_" + 16 hex chars).
// Shared by all services; replaces 5 identical generateID copies.
func New(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}
