import http from 'k6/http';
import { check, sleep } from 'k6';

// Read-heavy scenario per docs/03-testing.md: read chapter via public gateway.
// Seed story_k6demo/chap_k6demo1 must exist (seeded once via catalog ClusterIP).
// Run: k6 run --env API_URL=https://api.dootoon.store load/read-heavy.js
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

const API = __ENV.API_URL || 'https://api.dootoon.store';
const CHAPTER_ID = __ENV.CHAPTER_ID || 'chap_k6demo1';

export default function () {
  const res = http.get(`${API}/api/chapters/${CHAPTER_ID}/read`, {
    headers: { 'X-User-ID': `k6-user-${__VU}`, 'X-User-Role': 'reader' },
  });
  check(res, { 'read 200': (r) => r.status === 200 });
  sleep(1);
}
