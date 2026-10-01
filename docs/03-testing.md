# Testing

## Test pyramid

| Level | Covers | Tooling |
|---|---|---|
| Unit | pure logic: entitlement decision, "newer wins" merge, page-number clamping | `go test` + `testify` |
| Integration | service + real Postgres/Redis | `testcontainers-go` |
| E2E | full browser flow | Playwright |
| Load/perf | throughput, latency, resource usage under load | k6 + Go `pprof` |

CI gate (Jenkins): unit + integration run on every push. E2E and load tests
run pre-deploy / on demand.

## Functional test cases — "resume reading position" (FR-L1)

### Happy path
- Read manga to page 7 → close → reopen → lands on page 7
- Novel: read to paragraph 12 → return → shows paragraph 12
- Webtoon: scrolled to image 5 at 40% → return → same position
- "Continue reading" row on home is sorted by most recent, links straight to position
- Reading a new chapter in the same story replaces the saved position (one row per user+story)

### Save behavior
- Rapid page changes (20x) → debounced, not one request per change
- Tab closed right after a page change → last position still saved (`sendBeacon`)
- Network drop during save → retried once connectivity returns
- Duplicate save of the same position → idempotent, same result

### Multi-device
- Read on phone, open on desktop → sees latest position
- Two near-simultaneous saves → last `updated_at` wins, no flapping (race-condition test)
- A stale device sends an old position later → must not overwrite the newer one

### Guest → login
- Guest reads, then signs up/logs in → position uploaded to account
- Guest position and existing account position for the same story → newer one kept
- Cleared `localStorage` → Guest doesn't crash, just has nothing to resume

### Access & content edges
- Coin-locked, unpurchased chapter → "resume" routes to purchase, not content
- Taken-down chapter → falls forward to the next available chapter
- Entire story taken down → "continue reading" row omits it silently
- IDOR check: saving a position using another user's ID in the request body must be rejected (identity comes from the auth token, never the body)

### Bad input
- Page number beyond actual page count → clamp to last page
- Negative, string, or null position values → 400, not 500
- Chapter re-uploaded with a different page count → doesn't crash

### Resilience
- Redis down → falls back to writing Postgres directly (or queues), reading UI doesn't break
- Unflushed Redis data + restart → position not lost
- Concurrent burst of saves (load test) → response time stays in budget (see below)

## Load & performance testing (for the showcase)

Goal: show real RPS/latency/CPU numbers on stage, and show the system
autoscale in front of the audience.

### Tooling

- **k6** — HTTP load generator, scriptable in JS, outputs to OpenObserve/Prometheus for live graphs during the demo.
- **Go `net/http/pprof`** — exposes CPU and heap profiles per service; pull a profile before/during/after load to show where time goes.
- **`kubectl top pods` / Prometheus + OpenObserve dashboard** — live CPU and memory per pod during the run.
- **HPA (Horizontal Pod Autoscaler)** — configured on `reader` and `catalog` (the read-heavy services); the showcase should visibly show pod count climbing under load.

### Scenarios

| Scenario | What it stresses | Target (initial, tune from real numbers) |
|---|---|---|
| Browse + read chapter (read-heavy) | `catalog`, `reader`, `entitlement` | p95 < 300ms API, p95 < 2s full page, up to N concurrent users |
| Image delivery | CDN/Blob path, not Go services directly | confirm Go services see ~0 load from page-image requests |
| Purchase flow | `commerce` transaction path | correctness under concurrency: no double-charge, no negative balance, at least the same p95 target as read path allowed to be looser |
| Sustained soak (10–15 min) | memory leaks, connection pool exhaustion | flat memory/CPU over time, no error-rate creep |
| Spike (sudden 5x traffic) | autoscaling reaction time | HPA scales up within its configured window, error rate stays low during scale-up |

### Example k6 script (read-heavy scenario)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/stories/demo-story/chapters/1`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

Run: `k6 run --env BASE_URL=https://api.yourmanga.com load/read-heavy.js`

### What to capture for the showcase deck

- RPS and p95/p99 latency graph during the ramp (k6 output or OpenObserve)
- CPU and memory per pod, before / during / after load (screenshot from the dashboard)
- Pod count over time showing HPA scaling up and back down
- A single slow-request trace opened in OpenObserve, walked end-to-end
- Error rate during the spike scenario (should stay near zero if HPA reacts in time)
- One `pprof` CPU profile flame graph from the busiest service during peak load

### Reading pprof output

```
go tool pprof -http=:8081 http://reader-service:6060/debug/pprof/profile?seconds=30
```

Opens an interactive flame graph in the browser — use it to point at the
actual function eating CPU, which is a more convincing showcase moment than
just a latency number.

## Coverage target

NFR-Dev-1 sets ≥80% coverage on money (`commerce`) and access (`entitlement`)
logic specifically — not a blanket repo-wide number. Other services can be
lower if their logic is simple CRUD.

## Functional test cases: comments (FR-CM*)

- Guest can read a chapter thread but posting returns "login required"
- Unverified email cannot post
- Post on chapter 5 appears in chapter 5 thread and in the story's all-comments view labelled "chapter 5"
- All-comments view filtered by chapter 5 shows only chapter 5 comments; newest/top sorting returns the right order
- Reply to a reply is rejected (one level only); reply to a top-level comment is accepted
- Cursor pagination: a new comment arriving between page 1 and page 2 does not duplicate or skip items
- Edit allowed inside the window, rejected after; delete is soft and the body disappears from public views
- Blocked word, new-account link, and rate-limit violations are rejected with a clear error, not a 500
- IDOR: deleting or editing someone else's comment by changing the id is rejected
- Locked chapter, user has not unlocked it: posting rejected (FR-CM12 default); reading allowed
- Spoiler guard: user at chapter 3 sees chapter 8 comments collapsed; after reading chapter 8 they expand
- Chapter taken down: its comments disappear from public views and from the all-comments view
- Account deleted: comments remain but the author shows as anonymous
- `community` down or slow: chapter page still renders, with comments section showing a retry message
- Creator hides a comment on own story: hidden publicly, visible to admin, audit row written; creator cannot hide comments on another story
