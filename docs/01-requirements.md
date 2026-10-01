# Requirements

Priority uses MoSCoW: **M** = Must, **S** = Should, **C** = Could.
Every ID is stable — reference it in code comments, commit messages, and test
names (e.g. `TestFR_L1_ResumePosition`).

## Functional Requirements

### Accounts (FR-A)
| ID | Requirement | Pri |
|---|---|---|
| FR-A1 | Sign up / log in with email (Google/LINE later) | M |
| FR-A2 | 4 roles with RBAC; uploader edit rights are per-story, not global | M |
| FR-A3 | User can apply to become Uploader; Admin approves | S |
| FR-A4 | Email verification, password reset | S |

### Catalog (FR-C)
| ID | Requirement | Pri |
|---|---|---|
| FR-C1 | Story: type (manga/novel), title, cover, synopsis, tags, status | M |
| FR-C2 | Chapter: order, title, price (free/coin), auto-unlock date | M |
| FR-C3 | Creator team per story with revenue split summing to 100% | M |
| FR-C4 | Categories, trending list | S |

### Reading (FR-R)
| ID | Requirement | Pri |
|---|---|---|
| FR-R1 | Read manga in paged and long-scroll (webtoon) modes | M |
| FR-R2 | Read novels with adjustable font size and dark mode | M |
| FR-R3 | Entitlement check before serving any chapter content, every time | M |
| FR-R4 | Manga pages served via expiring links, never permanent URLs | M |
| FR-R5 | Prev/next chapter nav, table of contents | S |

### Access & ads (FR-X)
| ID | Requirement | Pri |
|---|---|---|
| FR-X1 | Guest reads free chapters; coin-locked chapters require login | M |
| FR-X2 | Purchased chapters stay unlocked forever; Uploader reads own story free, others' paid | M |
| FR-X3 | Ad policy by role: Guest = inline between pages, User/Uploader = top banner only, subscriber/Admin = none | M |
| FR-X4 | Latest chapter auto-unlocks free after N days | S |

### Library (FR-L)
| ID | Requirement | Pri |
|---|---|---|
| FR-L1 | Persist and resume reading position (page / paragraph+percent) | M |
| FR-L2 | Follow stories, bookmarks (User and above) | M |
| FR-L3 | "Continue reading" row on home, reading history | S |
| FR-L4 | Guest position stored client-side, merged into account on signup | S |

### Coins & money (FR-M)
| ID | Requirement | Pri |
|---|---|---|
| FR-M1 | Top up coins via payment gateway, confirmed by webhook | M |
| FR-M2 | Append-only ledger backs wallet balance; purchased vs bonus coins tracked separately | M |
| FR-M3 | Buying a chapter = debit coins + grant entitlement + record creator earnings, atomically | M |
| FR-M4 | Split earnings among a story's creator team per their percentages | M |
| FR-M5 | Creator earnings dashboard + withdrawal request (hold period + minimum) | S |
| FR-M6 | Takedown triggers reversal: refund buyer coins, claw back creator earnings | S |
| FR-M7 | Monthly subscription: coin allowance + no ads | C |

### Uploader (FR-U)
| ID | Requirement | Pri |
|---|---|---|
| FR-U1 | Create story/chapter, upload multiple images or paste novel text | M |
| FR-U2 | Auto image compression/WebP conversion; novel HTML sanitization | M |
| FR-U3 | Attestation of rights at upload time | M |
| FR-U4 | Scheduled chapter release, pricing, edit/delete own chapters | S |
| FR-U5 | Per-story stats (views, revenue) | S |

### Admin (FR-D)
| ID | Requirement | Pri |
|---|---|---|
| FR-D1 | Approve/hide/delete stories and chapters | M |
| FR-D2 | Takedown workflow: hide → suspend revenue (FR-M6) → notify uploader | M |
| FR-D3 | Ban/unban users, escalate for repeat offenders | M |
| FR-D4 | Audit log for every admin action | M |
| FR-D5 | Overview dashboard | S |

### Phase 2
| ID | Requirement | Pri |
|---|---|---|
| FR-S1 | Search with Thai word segmentation | S |
| FR-N1 | Notify followers of new chapters | S |

## Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-Perf-1 | Performance | Story/chapter page loads p95 < 2s; read-path API p95 < 300ms |
| NFR-Perf-2 | Performance | Saving reading position must never block or visibly delay the reading UI |
| NFR-Scale-1 | Scalability | Services are stateless; horizontal scale via more pods, no code change |
| NFR-Scale-2 | Scalability | Images served via CDN, never proxied through a Go service |
| NFR-Avail-1 | Availability | Production target 99.9% (multi-zone); demo has no uptime guarantee |
| NFR-DR-1 | Disaster recovery | RPO ≤ 15 min, RTO ≤ 1 hour, automated DB backups |
| NFR-Money-1 | Correctness | Purchases are ACID and idempotent; wallet balance never goes negative; reconcilable against the gateway |
| NFR-Sec-1 | Security | HTTPS everywhere, hashed passwords (argon2/bcrypt), short-lived tokens, RBAC on every endpoint (no IDOR), secrets in Key Vault, rate limiting, WAF, NSG-restricted network, OWASP Top 10 reviewed |
| NFR-Content-1 | Content protection | Expiring content links; never serve content the requester isn't entitled to; best-effort anti-hotlink |
| NFR-Privacy-1 | Privacy | Minimal data collection, privacy policy, account deletion; PDPA-aware if serving Thai users; no card data stored directly (delegate to gateway, PCI DSS scope reduction) |
| NFR-Legal-1 | Legal | Takedown workflow, upload-time rights attestation, repeat-offender escalation, content rating if mature content exists |
| NFR-Obs-1 | Observability | Structured JSON logs with `trace_id`, metrics, alerting, dashboard |
| NFR-Dev-1 | Dev process | CI/CD automated, IaC-managed infra, ≥80% test coverage on money/entitlement logic, local dev via Tilt |
| NFR-Port-1 | Portability | Containerized, Terraform-managed — cloud-portable by design |
| NFR-Cost-1 | Cost | Demo stays within Azure credit; budget alerts on; resources destroyed post-demo |
| NFR-UX-1 | Usability | Mobile-first, dark mode, Thai/English, SSR on public pages for SEO |

## Risks

| Risk | Mitigation |
|---|---|
| Copyright exposure (esp. translations) | Upload-time attestation, takedown + revenue reversal (FR-M6), demo uses own/public-domain content |
| Payment gateway rejection/suspension | Review ToS before going live; test-mode for demo |
| Cloud credit overrun | Single zone, `terraform destroy` post-demo, budget alerts |
| Coin fraud / chargebacks | Ledger design, payout hold period, webhook idempotency |

## Addendum: requirements for a real launch (not demo)

Added when the project moved from demo to a real product. Priority tiers match `04-backlog.md`: P0 = needed before public launch, P1 = first months after launch, P2 = later.

| ID | Requirement | Tier |
|---|---|---|
| FR-K1 | Creators verify identity (KYC) before their first withdrawal | P0 |
| FR-K2 | Withdrawal records keep the data needed for tax reporting (confirm rules with an accountant) | P0 |
| FR-G1 | Content carries an age rating; 17+ content is hidden by default and needs age confirmation | P0 |
| FR-CM1 | Comments on chapters, with report button, blocked-word list and admin moderation tools | P0 |
| FR-S1a | Thai-aware search moved up from Phase 2 (supersedes FR-S1 timing) | P0 |
| FR-N1a | New-chapter notifications by email and LINE before any app | P0 |
| FR-SEO1 | Public pages are server-rendered with sitemap, structured data and clean URLs | P0 |
| FR-PAY1 | Payment methods for Thai users: PromptPay QR, card, e-wallet (subject to gateway support) | P0 |
| FR-T1 | Translation team roles per chapter: translator, proofreader, editor, publisher | P1 |
| FR-T2 | Scheduled release, per-chapter pricing, stats on where readers drop off | P1 |
| FR-E1 | Early access: new chapters paid first, then free after N days (extends FR-X4) | P1 |
| FR-E2 | Tips: readers send coins directly to a creator | P1 |
| FR-E3 | Follow a specific creator, not just a story | P1 |
| FR-E4 | Shareable reading lists | P1 |
| FR-E5 | Daily check-in rewarding free-read tickets or bonus coins (bonus coins never count as creator revenue) | P1 |
| FR-M7a | Monthly subscription promoted from Could to P1 | P1 |
| FR-RD1 | Text-to-speech for novels, character-name glossary | P2 |
| FR-RC1 | Recommendations: start with "readers of X also read Y", ML later | P2 |
| FR-BADGE1 | "Licensed" badge, only after a real verification process exists | P2 |
| FR-APP1 | Installable web app (PWA) first; native app later | P2 |

## Addendum: comments (expands FR-CM1)

| ID | Requirement | Tier |
|---|---|---|
| FR-CM2 | Every chapter has its own comment thread under the reader | P0 |
| FR-CM3 | A story page has an "all comments" view that lists comments from every chapter, each labelled with its chapter, filterable by chapter, sortable by newest/top | P0 |
| FR-CM4 | Guests can read comments; posting needs a logged-in user with a verified email | P0 |
| FR-CM5 | Replies are one level deep (reply to a top-level comment); authors can edit within a short window and delete their own (soft delete) | P0 |
| FR-CM6 | Spoiler guard: in the all-comments view, comments from chapters the user has not reached are collapsed behind a warning, using the reading position from `library` | P1 |
| FR-CM7 | Moderation: report button, blocked-word list, link restrictions for new accounts, rate limit per user, hide/restore by admin, audit log of every moderation action | P0 |
| FR-CM8 | Creator team can pin a comment and hide comments on their own story; hidden comments stay visible to admins and every hide is audited | P1 |
| FR-CM9 | Likes on comments and sort by top | P1 |
| FR-CM10 | Notify a user when someone replies to their comment | P1 |
| FR-CM11 | When a chapter or story is taken down, its comments are hidden automatically; when an account is deleted, its comments are anonymized (PDPA) | P0 |
| FR-CM12 | Posting on a coin-locked chapter requires that the user has unlocked it (open decision, see backlog notes) | P0 |
