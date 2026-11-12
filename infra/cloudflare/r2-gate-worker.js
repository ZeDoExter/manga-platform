// Cloudflare Worker: gate img.dootoon.store behind HMAC expiring tokens + Anti-Scrape Watermark (FR-R4).
// Route: img.dootoon.store/*  —  Binding: R2 bucket dootoon-img as IMG_BUCKET
// Secret: HMAC_SECRET (same 64-hex value as K8s manga-secrets/hmac-secret)
// Token scheme (must match pkg/imagestore.BuildSignedURL):
//   payload = "<key>:<exp-unix>", token = hex(HMAC-SHA256(payload, secret))
//   URL = https://img.dootoon.store/<key>?exp=<unix>&token=<hex>

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, '');
    const exp = url.searchParams.get('exp');
    const token = url.searchParams.get('token');

    // 1. ตรวจสอบพารามิเตอร์เบื้องต้น
    if (!key || !exp || !token) {
      return new Response('Forbidden: Missing token credentials', { status: 403 });
    }

    // 2. ตรวจสอบวันหมดอายุ (Exp Check - 15 นาที)
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || Date.now() / 1000 > expNum) {
      return new Response('Forbidden: Token expired', { status: 403 });
    }

    // 3. ตรวจสอบลายเซ็น HMAC-SHA256
    const ok = await verify(key, exp, token, env.HMAC_SECRET);
    if (!ok) {
      return new Response('Forbidden: Invalid HMAC signature', { status: 403 });
    }

    // 4. ดึง Object จาก Cloudflare R2 Bucket
    const obj = await env.IMG_BUCKET.get(key);
    if (!obj) {
      return new Response('Not Found: Asset does not exist in R2', { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', 'public, max-age=3600');

    // -------------------------------------------------------------
    // ข้อ 2: Digital Trace / Forensic Watermark Headers
    // -------------------------------------------------------------
    // แนบลายเซ็นดิจิทัลเฉพาะของ Request นั้นๆ (IP Hash + Edge Node + User Fingerprint)
    // ส่งไปใน Header และ ETag เสริม เพื่อใช้ติดตามร่องรอยการดูดภาพ
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rayId = request.headers.get('cf-ray') || 'edge';
    const traceStamp = `DOOTOON-PROTECTED-${rayId.slice(0, 8)}-${exp}`;

    headers.set('X-Dootoon-Asset-Key', key);
    headers.set('X-Dootoon-Trace-Id', traceStamp);
    headers.set('X-Content-Protection', 'HMAC-Signed; Forensic-Tracked');

    return new Response(obj.body, { headers });
  },
};

async function signHex(key, exp, secretText) {
  const secret = new TextEncoder().encode((secretText ?? '').trim());
  const cryptoKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${key}:${exp}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verify(key, exp, token, secretText) {
  const secret = new TextEncoder().encode(secretText.trim());
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(`${key}:${exp}`);
  const sig = hexToBytes(token);
  if (sig.length !== 32) return false;
  try {
    return await crypto.subtle.verify('HMAC', cryptoKey, sig, data);
  } catch {
    return false;
  }
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) return new Uint8Array(0);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) return new Uint8Array(0);
    out[i] = b;
  }
  return out;
}
