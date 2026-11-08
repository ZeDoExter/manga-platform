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

// Watermark text stamped on every uploaded page (anti-scrape + branding).
const watermarkText = "DOOTOON • dootoon.store"

var watermarkFace font.Face

func init() {
	f, err := opentype.Parse(goregular.TTF)
	if err != nil {
		return
	}
	face, err := opentype.NewFace(f, &opentype.FaceOptions{Size: 28, DPI: 72})
	if err != nil {
		return
	}
	watermarkFace = face
}

// applyWatermark draws a semi-transparent diagonal "DOOTOON" band across the
// image plus a bottom-right badge. Mutates dst in place; safe no-op if the
// font failed to load. Call after resize, before WebP encode.
func applyWatermark(dst *image.RGBA) {
	if watermarkFace == nil {
		return
	}
	b := dst.Bounds()
	w, h := b.Dx(), b.Dy()
	if w < 200 || h < 200 {
		return
	}

	// Bottom-right badge: dark pill + white text.
	d := &font.Drawer{Dst: dst, Src: image.White, Face: watermarkFace}
	textW := d.MeasureString(watermarkText).Ceil()
	pad := 14
	badgeW, badgeH := textW+pad*2, 44
	x0, y0 := b.Max.X-badgeW-16, b.Max.Y-badgeH-16
	draw.Draw(dst, image.Rect(x0, y0, x0+badgeW, y0+badgeH),
		&image.Uniform{color.RGBA{21, 18, 15, 200}}, image.Point{}, draw.Over)
	d.Dot = fixed.Point26_6{
		X: fixed.I(x0 + pad),
		Y: fixed.I(y0 + 31),
	}
	d.DrawString(watermarkText)

	// Diagonal center band for large pages (harder to crop out).
	if w >= 600 && h >= 600 {
		band := image.NewRGBA(image.Rect(0, 0, w, 54))
		draw.Draw(band, band.Bounds(), &image.Uniform{color.RGBA{21, 18, 15, 110}}, image.Point{}, draw.Src)
		bd := &font.Drawer{Dst: band, Src: &image.Uniform{color.RGBA{255, 255, 255, 180}}, Face: watermarkFace}
		tw := bd.MeasureString(watermarkText).Ceil()
		bd.Dot = fixed.Point26_6{X: fixed.I((w - tw) / 2), Y: fixed.I(36)}
		bd.DrawString(watermarkText)
		midY := b.Min.Y + h/2 - 27
		draw.Draw(dst, image.Rect(b.Min.X, midY, b.Max.X, midY+54), band, image.Point{}, draw.Over)
	}
}

// ensureRGBA converts any image to *image.RGBA for watermarking.
func ensureRGBA(img image.Image) *image.RGBA {
	if r, ok := img.(*image.RGBA); ok {
		return r
	}
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Src)
	return dst
}
