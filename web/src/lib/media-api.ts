// Client for the media service (image upload/resize/WebP).
// Identity comes from the session cookie; the BFF stamps X-User-* itself.

const BASE = process.env.NEXT_PUBLIC_MEDIA_URL ?? '/api/media';

export interface UploadResult {
  key: string;
  width: number;
  height: number;
  size_bytes: number;
  content_type: string;
  animated_dropped: boolean;
}

async function uploadImage(
  file: File, userID: string, storyID = '', chapterID = '',
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const qs = storyID && chapterID
    ? `?story_id=${encodeURIComponent(storyID)}&chapter_id=${encodeURIComponent(chapterID)}`
    : '';
  // XHR for upload progress (fetch lacks it).
  const { promise, resolve, reject } = Promise.withResolvers<UploadResult>();
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${BASE}/uploads${qs}`);
  // Identity comes from the session cookie; the BFF stamps X-User-* itself.
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
  };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(JSON.parse(xhr.responseText) as UploadResult);
    } else {
      reject(new Error(xhr.responseText.slice(0, 200) || `upload -> ${xhr.status}`));
    }
  };
  xhr.onerror = () => reject(new Error('upload failed'));
  xhr.send(form);
  return promise;
}

// uploadAll sends files with bounded parallelism (default 3).
export async function uploadAll(
  files: File[], userID: string, storyID: string, chapterID: string,
  concurrency = 3, onEach?: (file: File, res: UploadResult | Error) => void,
): Promise<(UploadResult | Error)[]> {
  const out: (UploadResult | Error)[] = new Array(files.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    while (next < files.length) {
      const i = next++;
      try {
        const res = await uploadImage(files[i], userID, storyID, chapterID);
        out[i] = res;
        onEach?.(files[i], res);
      } catch (e) {
        const err = e instanceof Error ? e : new Error('upload failed');
        out[i] = err;
        onEach?.(files[i], err);
      }
    }
  });
  await Promise.all(workers);
  return out;
}
// uploadCover sends one cover image; it lands under stories/<storyID>/cover/
// so it persists (unlike tmp/ staging keys) and every reader can fetch it.
export async function uploadCover(file: File, userID: string, storyID: string): Promise<string> {
  const [res] = await uploadAll([file], userID, storyID, 'cover', 1);
  if (!res || res instanceof Error || !res.key) {
    throw res instanceof Error ? res : new Error('cover upload failed');
  }
  return res.key;
}

export interface BatchItem {
  index: number;
  name: string;
  result?: UploadResult;
  error?: string;
}

// uploadArchive sends one .zip; server returns pages in natural order.
export async function uploadArchive(
  file: File, userID: string, storyID: string, chapterID: string,
  onProgress?: (pct: number) => void,
): Promise<BatchItem[]> {
  const { promise, resolve, reject } = Promise.withResolvers<BatchItem[]>();
  const form = new FormData();
  form.append('file', file, file.name);
  const xhr = new XMLHttpRequest();
  xhr.timeout = 300000; // 5 minutes for large manga chapters
  xhr.open('POST', `${BASE}/uploads/batch?story_id=${encodeURIComponent(storyID)}&chapter_id=${encodeURIComponent(chapterID)}`);
  // Identity comes from the session cookie; the BFF stamps X-User-* itself.
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
  };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(JSON.parse(xhr.responseText) as BatchItem[]);
    } else {
      reject(new Error(xhr.responseText.slice(0, 200) || `batch upload -> ${xhr.status}`));
    }
  };
  xhr.onerror = () => reject(new Error('batch upload failed'));
  xhr.send(form);
  return promise;
}
