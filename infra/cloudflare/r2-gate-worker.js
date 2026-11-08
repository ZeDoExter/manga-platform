// Cloudflare Worker: gate img.dootoon.store behind HMAC expiring tokens (FR-R4).
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

    if (!key || !exp || !token) {
      return new Response('Forbidden', { status: 403 });
    }

    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || Date.now() / 1000 > expNum) {
      return new Response('Forbidden', { status: 403 });
    }

    const ok = await verify(key, exp, token, env.HMAC_SECRET);
    if (!ok) {
      return new Response('Forbidden', { status: 403 });
    }

    const obj = await env.IMG_BUCKET.get(key);
    if (!obj) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', 'public, max-age=3600');
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
