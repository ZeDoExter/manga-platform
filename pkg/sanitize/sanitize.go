// Package sanitize cleans novel HTML with a narrow allowlist.
// Used by catalog at chapter-save time (FR-U2) — never trust client HTML.
package sanitize

import (
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var policy = func() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	// Text structure only. No img/a/style/script, no attributes at all.
	p.AllowElements("p", "br", "em", "strong", "h2", "h3", "blockquote", "hr")
	return p
}()

var wsRun = regexp.MustCompile(`[ \t]+\n`)

// NovelHTML strips everything outside the allowlist and normalizes whitespace.
// Empty input stays empty; plain text passes through with <p> wrapping left
// to the renderer.
func NovelHTML(raw string) string {
	clean := policy.Sanitize(raw)
	clean = wsRun.ReplaceAllString(clean, "\n")
	return strings.TrimSpace(clean)
}
