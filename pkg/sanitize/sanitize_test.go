package sanitize_test

import (
	"strings"
	"testing"

	"manga-platform/pkg/sanitize"
)

func TestNovelHTML_StripsScriptAndHandlers(t *testing.T) {
	in := `<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="http://evil">click</a>`
	out := sanitize.NovelHTML(in)
	if strings.Contains(out, "script") || strings.Contains(out, "onerror") || strings.Contains(out, "<a") {
		t.Fatalf("XSS survived: %q", out)
	}
	if !strings.Contains(out, "Hello") || !strings.Contains(out, "click") {
		t.Fatalf("text lost: %q", out)
	}
}

func TestNovelHTML_KeepsAllowlist(t *testing.T) {
	in := `<h2>Title</h2><p>Body <em>em</em> <strong>b</strong></p><blockquote>q</blockquote><hr/>`
	out := sanitize.NovelHTML(in)
	for _, tag := range []string{"<h2>", "<p>", "<em>", "<strong>", "<blockquote>", "<hr"} {
		if !strings.Contains(out, tag) {
			t.Fatalf("allowlisted %s stripped: %q", tag, out)
		}
	}
}

func TestNovelHTML_PlainTextPasses(t *testing.T) {
	out := sanitize.NovelHTML("just text")
	if out != "just text" {
		t.Fatalf("plain text changed: %q", out)
	}
}
