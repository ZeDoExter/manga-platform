// Client-side page prep: downscale huge scans to reading size + JPEG.
// Typical phone scan (4000px PNG ~6MB) -> 1600px JPEG ~500KB, ~12x less upload.
// JPEG (not WebP): the media service only decodes jpeg/png input.
// Never throws: on any failure the original file passes through untouched.

const MAX_DIM = 1600;
const QUALITY = 0.85;
const SKIP_UNDER_BYTES = 400 * 1024;

export async function compressPage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const longest = Math.max(1, Math.max(bmp.width, bmp.height));
    const scale = Math.min(1, MAX_DIM / longest);
    if (scale === 1 && (file.type === "image/jpeg" || file.size < SKIP_UNDER_BYTES)) {
      bmp.close();
      return file;
    }
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
    const { promise: blobPromise, resolve: resolveBlob } = Promise.withResolvers<Blob | null>();
    canvas.toBlob(resolveBlob, "image/jpeg", QUALITY);
    const blob = await blobPromise;
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
