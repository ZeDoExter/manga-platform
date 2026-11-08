# Testing

## Test pyramid

| Level | Covers | Tooling |
|---|---|---|
| Unit | pure logic: entitlement decision, "newer wins" merge, page-number clamping | `go test` (stdlib only, no testify) |
| Integration | service + real Postgres (PG service in CI) | `go test -tags integration` |
| E2E | full browser flow | Headless Chromium via scripts (Playwright not adopted) |
| Load/perf | throughput, latency, resource usage under load | k6 + Go `pprof` (both open work, not yet wired) |

CI gate (Azure DevOps Pipelines, `azure-pipelines.yml`): unit + integration run on every push. E2E runs
manually via scripts; load tests are open work (see below).

## Web economy smoke flow

With `catalog`, `commerce`, `reader`, `gateway`, and the Next.js app running:

1. `GET /api/economy/wallet?accountId=<reader>` returns a zero wallet.
2. `POST /api/economy/access` for a paid chapter returns
   `{ allowed: false, reason: "payment", price: N }`.
3. `POST /api/economy/topup` credits the test-mode amount.
4. `POST /api/economy/purchase` debits the wallet, grants the entitlement, and
   creates creator earnings.
5. `POST /api/economy/access` now returns `{ allowed: true }`.
6. `GET /api/economy/ledger`, `/entitlements`, and `/creator/earnings` reflect
   the top-up, purchase, and split.

The same sequence is covered at the service level by
`TestWebEconomy_ListLedgerEntitlementsAndEarnings` and
`TestWebSync_ExplicitIDsAndChapterUpdate`.

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
- PG down → saves fail loudly (no silent queue); reading UI shows cached state, doesn't break
- Concurrent burst of saves (load test) → response time stays in budget (see below)

## Load & performance testing (for the showcase)

Goal: show real RPS/latency/CPU numbers on stage, and show the system
autoscale in front of the audience.

### Tooling

- **k6** — `load/read-heavy.js` (50 VUs, 5 min: 1m ramp + 3m sustain + 1m down).
- **Go `net/http/pprof`** — wired in `pkg/httpapi` (opt-in via `PPROF_PORT`, localhost only, port-forward to reach). During load: `go tool pprof -http=:8081 http://localhost:6060/debug/pprof/profile?seconds=30` for the flame graph.
- **`kubectl top pods` + OpenObserve dashboard** — live CPU and memory per pod during the run (this part works today).
- **HPA (Horizontal Pod Autoscaler)** — `manga-reader-hpa` on `reader` (min 1, max 4, CPU 70%). All 9 Go services are PG-backed and scale-safe now.

### Measured results (2026-11-08, AKS B2s x2, via `https://api.dootoon.store`)

| Metric | Value | Target | Pass |
|---|---|---|---|
| Requests | 10,599 total, ~35 RPS @ 50 VUs | — | — |
| p95 latency | 251ms | < 300ms | ✅ |
| p90 / median | 195ms / 82ms | — | — |
| Error rate | 0.00% (0/10,599) | < 1% | ✅ |
| HPA | reader 1 → 2 replicas live during load | scale up | ✅ |
| Peak pod CPU | catalog 132m, gateway 122m, reader ~65m each | — | — |
| Pod memory | 6-14Mi per Go pod, web 45Mi | — | ✅ |

PG session lookup measured separately at 0.1ms (`EXPLAIN ANALYZE`, PK index) —
Redis stays out per the no-Redis ADR: no measured hotspot justifies the extra pod + flush/merge design.

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
- One `pprof` CPU profile flame graph from the busiest service during peak load (after pprof is wired)

### Reading pprof output (after wiring)

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
