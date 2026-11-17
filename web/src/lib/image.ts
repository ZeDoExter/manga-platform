// Client-side page prep: resize + badge + WebP encode, so the server can
// store uploads untouched (verified by the badge accent square).
// Typical phone scan (4000px PNG ~6MB) -> 1600px WebP q80 ~400KB.
// Single lossy generation (was: client JPEG q92, then server re-encode).
// Never throws: on any failure the original file passes through untouched
// (the server then badges + encodes it on the slow path).

const MAX_WIDTH = 1600;
const QUALITY = 0.8;

// Badge mirrors services/media/watermark.go: dark pill, orange accent
// square, DOOTOON text, bottom-right. The server verifies the accent
// square only (font-independent), so canvas text metrics stay local.
function paintBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (w < 240 || h < 240) return;
  ctx.font = "600 18px system-ui, sans-serif";
  const textW = Math.ceil(ctx.measureText("DOOTOON").width);
  const badgeW = textW + 48;
  const badgeH = 32;
  const x0 = w - badgeW - 16;
  const y0 = h - badgeH - 16;
  ctx.fillStyle = "rgba(21,18,15,0.84)";
  ctx.fillRect(x0, y0, badgeW, badgeH);
  ctx.fillStyle = "#ff4a22";
  ctx.fillRect(x0 + 6, y0 + 6, 20, 20);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DOOTOON", x0 + 33, y0 + 22);
}

export async function compressPage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / Math.max(1, bmp.width));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    paintBadge(ctx, canvas.width, canvas.height);
    const { promise: blobPromise, resolve: resolveBlob } = Promise.withResolvers<Blob | null>();
    canvas.toBlob(resolveBlob, "image/webp", QUALITY);
    const blob = await blobPromise;
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
