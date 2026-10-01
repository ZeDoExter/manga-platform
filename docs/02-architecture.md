# Stack & Architecture

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Backend language | Go | All services. gRPC for internal calls where it matters, REST at the edge. |
| Frontend (reader) | Next.js | SSR for SEO on public pages |
| Frontend (admin) | React (minimal for demo) | Could use Refine later |
| Container runtime | Docker | |
| Orchestration | Kubernetes (AKS) | |
| Local dev | Tilt | `tilt up` against k3d/Kind; same Dockerfiles as CI |
| VCS | Bitbucket | |
| CI | Jenkins | Build, test, push image to ACR |
| CD | Helm apply (Argo CD later) | |
| IaC | Terraform (OpenTofu-compatible) | State in Azure Storage |
| Cloud | Azure | AKS, ACR, PostgreSQL Flexible Server, Key Vault (image storage is on Cloudflare R2, see ADR-001) |
| Edge / DNS / CDN | Cloudflare | DNS, CDN, WAF, DDoS, in front of Azure origin |
| Primary DB | PostgreSQL | One logical DB per service's own schema |
| Cache / sessions / progress | Redis | In-cluster pod for demo |
| Object storage | Cloudflare R2 (S3-compatible) | Manga pages. Served through a Cloudflare custom domain with cache; access controlled by signed tokens, see ADR-001 |
| Messaging | In-cluster queue for demo; Azure Service Bus for Phase 2 | |
| Observability | OpenTelemetry → OpenObserve | Traces, logs, metrics in one place |
| Load testing | k6 | See `03-testing.md` |
| Profiling | Go `net/http/pprof` | CPU/heap profiles per service |

## Services

| Service | Responsibility | Demo scope? |
|---|---|---|
| `identity` | signup/login, JWT, roles | yes |
| `catalog` | stories, chapters, creator team + split, pricing | yes |
| `reader` | serves chapter content (images/text); always calls `entitlement` first | yes |
| `entitlement` | decides can-read + ad-policy per (user, chapter) | yes |
| `commerce` | wallet, ledger, purchases, creator earnings, payout requests, reversal | yes |
| `library` | reading position, follows, bookmarks, history | yes |
| `moderation` | approvals, takedown, bans, audit log | yes |
| `media-worker` | image resize/WebP conversion, novel HTML sanitization | yes |
| `community` | chapter comments, replies, likes, reports, comment moderation state | launch (P0), not in demo |
| `notification` | new-chapter alerts | phase 2 |
| `search` | Thai-aware story search | phase 2 |
| `analytics` | views, trending | phase 2 |
| `subscription` | monthly plan billing | phase 2 |

Communication: synchronous reads via REST/gRPC between services; async facts
(`ChapterPublished`, `PurchaseCompleted`, `ChapterTakenDown`) go on the queue
for `notification` / `search` / `analytics` / `commerce` (reversal) to
consume.

## Request flow (reading a chapter)

```
Browser
  -> Cloudflare (DNS/CDN/WAF)
  -> AKS ingress
  -> reader
       -> entitlement   (can this user read this chapter? what ad policy?)
       -> catalog        (chapter metadata)
       -> signed image URLs (Cloudflare edge validates token, R2 origin) for manga pages, or DB text for novels
  <- response (content or PAY_REQUIRED / LOGIN_REQUIRED)
```

## Request flow (purchase)

```
Browser -> commerce.PurchaseChapter(user, chapter)
  BEGIN TX
    debit wallet (ledger row)
    grant entitlement row
    record creator earnings split
  COMMIT TX
  -> emit PurchaseCompleted event
```

## Azure network layout

```
VNet 10.42.0.0/16
├── snet-aks   10.42.0.0/24   AKS nodes (pods use an overlay CIDR, not this range)
├── snet-db    10.42.1.0/24   PostgreSQL Flexible Server (delegated subnet)
├── snet-pe    10.42.2.0/24   private endpoints (optional, off for demo)
└── snet-ci    10.42.3.0/24   Jenkins VM
```

NSG rules (demo):
- `snet-aks`: inbound 80/443 from Cloudflare IP ranges only
- `snet-db`: inbound 5432 from `snet-aks` only
- `snet-ci`: inbound SSH/HTTPS from the developer's IP only

Managed services beside the VNet: Key Vault, ACR (images live on Cloudflare R2, outside Azure) — reached over
Azure's backbone, optionally via private endpoints in Phase 2/3.

## Domains (example: yourmanga.com, DNS on Cloudflare)

| Host | Routes to | Protection |
|---|---|---|
| `yourmanga.com`, `www` | Next.js via ingress | Cloudflare proxy |
| `api` | API gateway/ingress | Rate limit |
| `img` | Cloudflare R2 via custom domain (cached) | Signed token checked at the Cloudflare edge |
| `admin` | Admin UI via ingress | Cloudflare Access / IP allow-list |
| `obs` | OpenObserve | IP allow-list |
| `ci` | Jenkins | IP allow-list |

TLS via cert-manager + Let's Encrypt inside the cluster; Cloudflare set to
"Full (strict)" with proxy on, so the AKS ingress IP is never exposed
directly.

## Demo vs Production topology

- **Demo**: single Azure zone, one replica of each stateful piece, Redis as
  a pod, no NAT Gateway/Bastion/Front Door (cost control).
- **Production** (documented for the pitch, not built for the demo): two
  zones, zone-redundant load balancer, PostgreSQL HA with standby,
  autoscaling pod replicas per zone. Same Terraform module, `zone_count`
  variable switches 1 → 2.

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
