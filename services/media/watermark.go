package media

import (
	"image"
	"image/color"
	"image/draw"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

// Clean brand name only, matching top-left nav logo (no links).
const watermarkText = "DOOTOON"

var watermarkFace font.Face

func init() {
	f, err := opentype.Parse(goregular.TTF)
	if err != nil {
		return
	}
	face, err := opentype.NewFace(f, &opentype.FaceOptions{
		Size:    18,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		return
	}
	watermarkFace = face
}

// applyWatermark draws a clean, subtle DOOTOON logo badge at the bottom-right corner,
// matching the top-left navbar brand logo.
// No diagonal stripes, no links across the art.
func applyWatermark(dst *image.RGBA) {
	if watermarkFace == nil {
		return
	}
	b := dst.Bounds()
	w, h := b.Dx(), b.Dy()
	if w < 240 || h < 240 {
		return
	}

	d := &font.Drawer{Dst: dst, Src: image.White, Face: watermarkFace}
	textW := d.MeasureString(watermarkText).Ceil()

	accentSize := 20
	badgeW := textW + accentSize + 28
	badgeH := 32

	x0 := b.Max.X - badgeW - 16
	y0 := b.Max.Y - badgeH - 16

	// 1. Dark pill background with rounded look
	draw.Draw(dst, image.Rect(x0, y0, x0+badgeW, y0+badgeH),
		&image.Uniform{color.RGBA{21, 18, 15, 215}}, image.Point{}, draw.Over)

	// 2. Signature orange square icon matching navbar logo
	accentX := x0 + 6
	accentY := y0 + (badgeH-accentSize)/2
	draw.Draw(dst, image.Rect(accentX, accentY, accentX+accentSize, accentY+accentSize),
		&image.Uniform{color.RGBA{255, 74, 34, 255}}, image.Point{}, draw.Over)

	// 3. DOOTOON text
	d.Dot = fixed.Point26_6{
		X: fixed.I(accentX + accentSize + 7),
		Y: fixed.I(y0 + 22),
	}
	d.DrawString(watermarkText)
}

// ensureRGBA converts any image to *image.RGBA for watermarking.
func ensureRGBA(img image.Image) *image.RGBA {
	if r, ok := img.(*image.RGBA); ok {
		return r
	}
	b := img.Bounds()
	dst := image.NewRGBA(b)
	draw.Draw(dst, b, img, b.Min, draw.Src)
	return dst
}


// hasClientBadge reports whether the image already carries a client-painted
// badge: it scans the bottom-right corner for a solid 8x8 block of the
// badge accent orange. Font-independent (text is never inspected).
// Lenient by design: a miss only costs the slow server-encode path,
// so false negatives are safe and false positives just skip a redundant badge.
func hasClientBadge(img image.Image) bool {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w < 240 || h < 240 {
		return false
	}
	x1, y1 := b.Max.X-8, b.Max.Y-8
	x0, y0 := b.Max.X-220, b.Max.Y-60
	if x0 < b.Min.X {
		x0 = b.Min.X
	}
	if y0 < b.Min.Y {
		y0 = b.Min.Y
	}
	for y := y0; y <= y1; y += 2 {
		for x := x0; x <= x1; x += 2 {
			if orangeBlock(img, x, y) {
				return true
			}
		}
	}
	return false
}

// orangeBlock reports whether the 8x8 block at (x, y) is all near-badge-orange.
// Tolerance absorbs WebP lossy drift on flat fills (typically < 10).
func orangeBlock(img image.Image, x, y int) bool {
	for dy := range 8 {
		for dx := range 8 {
			r, g, bl, _ := img.At(x+dx, y+dy).RGBA()
			r8, g8, b8 := r>>8, g>>8, bl>>8
			dr := int(r8) - 255
			if dr < 0 {
				dr = -dr
			}
			dg := int(g8) - 74
			if dg < 0 {
				dg = -dg
			}
			db := int(b8) - 34
			if db < 0 {
				db = -db
			}
			if dr > 48 || dg > 48 || db > 48 {
				return false
			}
		}
	}
	return true
}
