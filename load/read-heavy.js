import http from 'k6/http';
import { check, sleep } from 'k6';

// Read-heavy scenario per docs/03-testing.md: browse catalog + read chapter + progress.
// Run: k6 run --env BASE_URL=https://api.dootoon.store load/read-heavy.js
// Targets: API p95 < 300ms, error rate < 1%.

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL;

export function setup() {
  // Seed one story + chapter for the read path (idempotent via fixed IDs).
  const story = {
    id: 'k6-demo-story',
    owner_id: 'k6-uploader',
    type: 'manga',
    title: 'k6 Demo Story',
    synopsis: 'load test seed',
    tags: ['k6'],
    splits: [{ creator_id: 'k6-uploader', percentage: 100 }],
  };
  http.post(`${BASE}/stories`, JSON.stringify(story), { headers: { 'Content-Type': 'application/json' } });
  const ch = {
    id: 'k6-demo-story-ch-1',
    order_index: 1,
    title: 'Chapter 1',
    price_coins: 0,
    page_keys: ['k6/p1.webp'],
  };
  http.post(`${BASE}/stories/k6-demo-story/chapters`, JSON.stringify(ch), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export default function () {
  let res = http.get(`${BASE}/stories`);
  check(res, { 'stories 200': (r) => r.status === 200 });

  res = http.get(`${BASE}/stories/k6-demo-story/chapters`, {
    headers: { 'X-User-ID': `k6-user-${__VU}`, 'X-User-Role': 'reader' },
  });
  check(res, { 'chapters 200': (r) => r.status === 200 });

  res = http.get(`${BASE}/api/chapters/k6-demo-story-ch-1/read`, {
    headers: { 'X-User-ID': `k6-user-${__VU}`, 'X-User-Role': 'reader' },
  });
  check(res, { 'read 200': (r) => r.status === 200 });

  sleep(1);
}
