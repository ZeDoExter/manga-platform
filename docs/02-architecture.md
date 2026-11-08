# Stack & Architecture

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Backend language | Go | All services. REST everywhere (see "Why no gRPC" below). |
| Frontend (reader) | Next.js (DOOTOON) | SSR for SEO on public pages |
| Frontend (admin) | Next.js `/admin` page in the same app | Takedown/ban/audit console, no separate codebase |
| Container runtime | Docker | |
| Orchestration | Kubernetes (AKS) | Gateway API + Envoy, not ingress-nginx (EOL Mar 2026) |
| Local dev | Tilt (compose) / minikube (k8s) | `tilt up`, or `TILT_MODE=k8s tilt up`; same Dockerfiles as CI |
| VCS | Azure Repos (+ GitLab mirror) | Repository & collaboration (migrated from GitLab: CI/CD moved to Azure DevOps) |
| CI/CD | Azure DevOps Pipelines | `azure-pipelines.yml`: lint → test (+PG service, 80% commerce gate) → build 10 images → deploy to AKS (~17 min/full run) |
| IaC | Terraform | State local for demo; Azure Storage backend before sharing |
| Cloud | Azure | AKS, ACR, PostgreSQL Flexible Server, Key Vault (images: PVC on AKS for demo, R2 per ADR-001 for launch) |
| Edge / DNS / CDN | Cloudflare (live) | `dootoon.store` + `api`/`obs` via proxy; NSG tightened to Cloudflare IPv4 ranges |
| Primary DB | PostgreSQL | One server; separate schemas per service (catalog/commerce/library) |
| Cache / sessions / progress | PostgreSQL directly (no Redis) | Measured decision, see "Why no Redis" below |
| Object storage | `ImageStore` interface; LocalStore/MemoryStore today, R2 for launch | Served via signed URLs; see ADR-001 |
| Messaging | None yet (direct HTTP calls) | Queue deferred — no async consumers exist; Service Bus stays Phase 2 |
| Observability | OpenTelemetry → OpenObserve | Traces, logs, metrics in one place |
| Load testing | k6 (not yet scripted) | Scripts + numbers are open work, see `03-testing.md` |
| Profiling | Go `net/http/pprof` (not yet wired) | Open work, see `03-testing.md` |

## Services

| Service | Responsibility | Demo scope? |
|---|---|---|
| `identity` | signup/login, sessions, roles (in-memory) | yes |
| `catalog` | stories, chapters, creator team + split, pricing (PG-backed) | yes |
| `reader` | serves chapter content; always calls `entitlement` first | yes |
| `entitlement` | decides can-read + ad-policy per (user, chapter) | yes, embedded in `commerce.CheckEntitlement` (not yet its own process) |
| `commerce` | wallet, ledger, purchases, creator earnings, reversal (PG-backed) | yes |
| `library` | reading position, follows, bookmarks, history (PG-backed) | yes |
| `moderation` | takedown, bans, audit log (in-memory) | yes |
| `media` | image upload/resize/WebP, zip batch, novel HTML sanitize | yes |
| `community` | chapter comments, replies, likes, reports, moderation state | yes (built early; docs said P0-launch) |
| `gateway` | edge reverse proxy `/api/` → reader | yes |
| `notification` | new-chapter alerts | phase 2 |
| `search` | Thai-aware story search | phase 2 |
| `analytics` | views, trending | phase 2 |
| `subscription` | monthly plan billing | phase 2 |

### Local dev ports (current implementation)

| Resource | Port | Notes |
|---|---|---|
| `gateway` | 8080 | public edge; proxies `/api/...` to `reader` |
| `identity` | 8081 | signup, login, session validation, roles |
| `catalog` | 8082 | stories, chapters, pricing, status |
| `commerce` | 8083 | wallet, ledger, purchases, entitlements, reversal |
| `reader` | 8084 | calls `catalog`, `commerce`, `identity` over HTTP |
| `moderation` | 8085 | calls `catalog`, `commerce`, `identity` over HTTP |
| `community` | 8086 | calls `catalog`, `commerce` over HTTP |
| `library` | 8087 | progress, follows, bookmarks, merge |
| `media` | 8088 | uploads, WebP, zip batch, chapter wipe |
| `web` | 3125 (dev) | Next.js DOOTOON; BFF routes under `api/economy/`, `/api/library`, `/api/catalog`, `/api/community` |

In Kubernetes every container listens on `8080`; each `Service` exposes port
`80`, so in-cluster URLs are `http://catalog`, `http://commerce`,
`http://reader`, etc. (`deploy/k8s/`).

Communication: synchronous REST between services. No message queue yet —
there are no async consumers (`notification`/`search`/`analytics` are all
Phase 2), so events like `PurchaseCompleted` would have nobody to consume
them. Add the queue when the first consumer lands, not before.

## Request flow (reading a chapter)

```
Browser
  -> Cloudflare edge (DNS + proxy) -> Gateway API (Envoy) on AKS — TLS via cert-manager + Let's Encrypt (`dootoon-tls`), Cloudflare "Full strict"
  -> web (Next.js, `dootoon.store`) or reader/gateway (`api.dootoon.store`)
  -> reader
       -> commerce.CheckEntitlement  (can this user read this chapter? what ad policy?)
       -> catalog                    (chapter metadata)
       -> signed image URLs (imagestore.SignURL; LocalStore/PVC on AKS today, R2 origin per ADR-001 for launch)
  <- response (content or PAY_REQUIRED / LOGIN_REQUIRED)
```

## Request flow (purchase)

```
Browser -> commerce.PurchaseChapter(user, chapter)
  BEGIN TX (single Postgres transaction, advisory lock per user)
    debit wallet (ledger rows, bonus-first)
    grant entitlement row
    record platform fee + creator earnings split
  COMMIT TX
  (No PurchaseCompleted event yet — no queue, no consumers; see above)
```
## Web economy BFF (current demo)

The Next.js app keeps account state in `localStorage` and uses server route
handlers under `web/src/app/api/economy/` so browser code never calls the Go
services directly. In the demo, the local web account ID is passed to catalog
and commerce as the user/owner ID; identity/session wiring remains separate.

- Reads: `GET /api/economy/wallet`, `/ledger`, `/entitlements`,
  `/creator/earnings`.
- Writes: `POST /api/economy/access`, `/purchase`, `/topup`.
- Before gating or purchasing, the BFF syncs the story and chapter to catalog.
  Chapters use deterministic IDs (`<storyId>-ch-<number>`); duplicate creates
  return `409`, then the BFF PATCHes the chapter title/price.
- Default pricing: chapters 1-3 free, latest chapter free, visual paid chapters
  30 coins, text/original paid chapters 20 coins; creators can override 0-1000.
- Top-up is simulated Stripe test mode (`stripe_test_*` references). A real
  Stripe Checkout session and webhook replace it later.
- Reader access uses the web account as `X-User-ID`; the BFF bypasses the reader
  entitlement gate for the catalog story owner, which is the current shortcut
  for web creators whose IDs are not yet in identity.
- All chapter opens go through the access route. Even free, owned, and unlocked
  chapters are checked against catalog status, so a taken-down or hidden
  story/chapter is rejected before content is shown.

## Azure network layout (as built by `infra/`)

```
VNet 10.42.0.0/16
├── snet-aks   10.42.0.0/24   AKS nodes (pods use an overlay CIDR, not this range)
└── snet-db    10.42.1.0/24   PostgreSQL Flexible Server (delegated subnet)
```

Not built (were in the original sketch, cut as optional): `snet-pe`
(private endpoints) and `snet-ci` (CI subnet) — SaaS runners need neither,
and Key Vault/ACR are reached over Azure's backbone for the demo.

NSG rules (as built):
- `snet-aks`: inbound 443 from Internet (Envoy LB; tighten to Cloudflare
  IP ranges once the domain + proxy are live)
- `snet-db`: inbound 5432 from `snet-aks` only

Managed services beside the VNet: Key Vault, ACR — reached over
Azure's backbone, optionally via private endpoints in Phase 2/3.

Zone note: AKS runs in zone 3 (southeastasia has no zone 1 for AKS),
PostgreSQL in zone 1 (it does support it). Single zone each for the demo.

## Domains (live)

| Host | Routes to | Protection |
|---|---|---|
| `dootoon.store` | Next.js via gateway | Cloudflare proxy |
| `api.dootoon.store` | API gateway | Cloudflare proxy, AKS NSG allows Cloudflare IPv4 only |
| `obs.dootoon.store` | OpenObserve | Cloudflare proxy |

TLS is a real Let's Encrypt certificate (`dootoon-tls`, DNS-01 via Cloudflare), auto-renewed by cert-manager.

## Demo vs Production topology

- **Demo**: single Azure zone, one replica of each stateful piece, no Redis
  pod (see below), no NAT Gateway/Bastion/Front Door (cost control).
  Stateful today: Azure PG (catalog/commerce/library schemas) + a PVC for
  `media` images. `identity`/`moderation`/`community` are still in-memory.
- **Production** (documented for the pitch, not built for the demo): two
  zones, zone-redundant load balancer, PostgreSQL HA with standby,
  autoscaling pod replicas per zone. Same Terraform module, `zone_count`
  variable switches 1 → 2.

## Deliberate cuts (why the demo is simpler than the sketch)

### Why no Redis

Progress is one row per (user, story) with an index on
`(user_id, updated_at DESC)` — reads and debounced upserts are
sub-millisecond on even a B1ms. A cache would add a pod to run, a
flush/retry design (write-behind risks data loss), and merge logic across
two stores, to solve a load problem we have not measured. The
`ProgressRepository` interface lets a cache wrap the PG implementation
later without touching callers; the load test decides if that day comes.

### Why no gRPC

Internal calls are low-frequency CRUD (chapter metadata, entitlement
checks) where REST + JSON over cluster networking is fast enough and
debuggable with curl. gRPC would add protobuf schemas, codegen, and a
second client stack for no measured gain. Revisit if profiling shows
serialization as a hotspot.

### Why no message queue yet

A queue with no consumers is pure overhead. `notification`, `search`,
and `analytics` are all Phase 2; until the first consumer exists,
direct HTTP calls are simpler and easier to trace.

## Things an agent must not silently change

- Do not move money-affecting logic (`commerce`) to be eventually-consistent.
  Purchases stay in a single ACID transaction (NFR-Money-1).
- Do not let `reader` serve content without calling `entitlement` first
  (FR-R3), even for "just testing."
- Do not add a new cloud resource type without checking `NFR-Cost-1` and the
  demo budget constraints in `00-goals-as-is-to-be.md`.

## ADR-001: Store images on Cloudflare R2 (accepted for launch)

**Decision:** manga page images live in Cloudflare R2, not Azure Blob. Azure Blob was considered and rejected for now because its egress cost grows with readers (see cost comparison below). Revisit if R2 costs or operations burden change.

**Why:** R2 charges no egress fees. For a reading site, egress (data leaving the cloud) is the biggest cost and it scales with readers. R2 bills storage plus operations only.

**Pricing used for estimates (verify on the Cloudflare pricing page before committing):**
- Storage $0.015 per GB-month; free tier 10 GB-month
- Class A (writes/lists) $4.50 per million; free 1 million/month
- Class B (reads) $0.36 per million; free 10 million/month
- Egress $0

**Consequences and rules:**
- Presigned URLs (S3 style) only work on the R2 S3-API domain, not on a custom domain. To serve through a custom domain with CDN cache, use token authentication instead: `commerce`/`reader` issues an HMAC-signed, expiring token and Cloudflare (WAF rule or Worker) validates it. Design `reader` so the signing scheme is swappable.
- Uploads from `media-worker` go to R2 through its S3 API using server-side credentials. Credentials are stored in Key Vault and never sent to browsers.
- Cache rules must let repeat requests be answered by Cloudflare's cache instead of reaching R2, to keep Class B operation counts low. Confirm this behavior in Cloudflare docs before relying on the cost numbers.
- Cost alerts on R2 usage are required (NFR-Cost-1).
- Cloudflare's acceptable-use and abuse (DMCA) processes apply to content stored there. The takedown workflow (FR-D2) must also delete or block the object in R2.

### Why two providers (multi-cloud), for anyone explaining the design

This system uses two public cloud providers: Azure for compute, database, secrets and CI/CD; Cloudflare for DNS, CDN, WAF and image storage. The correct term is **multi-cloud** (more than one public cloud provider). "Hybrid cloud" means public cloud mixed with a private or on-premises environment, which this system does not have.

Reasons for splitting:
1. **Cost follows traffic.** Images are almost all of the bandwidth. Azure charges for data leaving it (about $0.087-0.12 per GB after 100 GB free, per third-party summaries of Azure's pricing page); R2 charges none. Example at 100,000 chapter reads per day: roughly $3,800-4,200 per month on Azure without cache versus about $42 on R2 (assumes 15 MB per chapter; see the cost table in chat history or recompute with the vendors' calculators).
2. **Cloudflare is already in the design** for DNS, CDN and WAF, so R2 adds a service on a vendor already in the request path, not a new vendor.
3. **Best fit per job.** Azure runs the Go services on AKS with managed PostgreSQL and Key Vault. Cloudflare serves static images near readers.
4. **Lower lock-in.** Storage sits behind an `ImageStore` interface so the provider can change by configuration.

Honest costs of the split (state these when presenting):
- Two vendors, two bills, two dashboards, two sets of credentials (R2 keys live in Key Vault).
- Uploads from `media-worker` (in Azure) to R2 count as Azure egress. At about 1,000 chapters per month (about 15 GB) this stays inside Azure's 100 GB free allowance, but track it.
- The site needs both vendors up to work fully; monitor both.
- Team needs working knowledge of both platforms.

### Required design rule

All image reads and writes go through an `ImageStore` interface in Go (`Put`, `Get`, `Delete`, `SignURL`). No service may import an R2 or Azure Blob SDK outside the implementation of that interface.

## Comments design (service `community`)

Separate service because comment writes are frequent and bursty, scale differently from `catalog`, and need their own moderation state.

Table sketch (PostgreSQL, owned by `community` only):

```
comments(
  id, story_id, chapter_id, user_id,
  parent_id NULL,              -- NULL = top-level, otherwise a reply
  body, status,                -- visible | hidden | deleted
  like_count, reply_count,
  created_at, edited_at
)
INDEX (chapter_id, created_at)   -- chapter thread
INDEX (story_id, created_at)     -- all-comments view
```

`story_id` is stored on every comment even though `chapter_id` implies it, so the all-comments view is one indexed query, not a join across services.

Rules:
- Pagination uses a cursor (the last seen id/time), not page numbers, so new comments arriving while someone scrolls do not shift the list.
- Redis caches comment counts and the first page of hot chapters for a short time.
- Posting: login required, rate limited per user, blocked-word and link checks, then saved.
- Spoiler guard (FR-CM6): `community` asks `library` for the user's furthest read chapter of that story and marks later chapters' comments as collapsed.
- Events: publishes `CommentPosted`; consumes `ChapterTakenDown` (hide comments), `UserDeleted` (anonymize).
- The `reader` page asks `community` only for counts and the first page; it must not block chapter rendering if `community` is slow (NFR-Perf-2 style rule).
