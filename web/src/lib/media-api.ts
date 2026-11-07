// Client for the media service (image upload/resize/WebP).
// Role travels via X-User-Role (gateway injects it in prod).

const BASE = process.env.NEXT_PUBLIC_MEDIA_URL ?? 'http://localhost:8088';

export interface UploadResult {
  key: string;
  width: number;
  height: number;
  size_bytes: number;
  content_type: string;
  animated_dropped: boolean;
}

export async function uploadImage(
  file: File, userID: string, storyID = '', chapterID = '',
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const qs = storyID && chapterID
  // XHR for upload progress (fetch lacks it).
  const { promise, resolve, reject } = Promise.withResolvers<UploadResult>();
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${BASE}/uploads${qs}`);
  xhr.setRequestHeader('X-User-ID', userID);
  xhr.setRequestHeader('X-User-Role', 'uploader');
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

export async function confirmUpload(tmpKey: string, storyID: string, chapterID: string): Promise<string> {
  const res = await fetch(`${BASE}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmp_key: tmpKey, story_id: storyID, chapter_id: chapterID }),
  });
  if (!res.ok) throw new Error(`confirm -> ${res.status}`);
  const body = (await res.json()) as { key: string };
  return body.key;
}
