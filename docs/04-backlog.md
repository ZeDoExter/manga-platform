# Backlog (real product)

Ordered work list for AI agents and humans. Read `01-requirements.md` first; every item points to requirement IDs.

**Tiers:** P0 = before public launch, P1 = first months after launch, P2 = later.
**Size** is a rough estimate for one developer: S = 1-2 days, M = 3-5 days, L = 1-2 weeks, XL = more than 2 weeks (split it before starting). Treat sizes as guesses to revise after the first sprint.
**Definition of done:** code merged, tests for the acceptance line pass, docs updated in the same change, metrics/log fields added if the item touches money or access.

## Epic A: Money and payouts (P0)

| ID | Item | Services | Req | Size | Depends on |
|---|---|---|---|---|---|
| B-A1 | Real payment gateway integration with webhook signature check and idempotency | commerce | FR-M1, FR-PAY1 | L | ledger tables |
| B-A2 | PromptPay QR, card, e-wallet flows and failed/expired payment handling | commerce | FR-PAY1 | M | B-A1 |
| B-A3 | Reconciliation job: daily match ledger against gateway report, alert on mismatch | commerce | NFR-Money-1 | M | B-A1 |
| B-A4 | Creator identity verification (KYC) flow | identity, commerce | FR-K1 | L | provider choice |
| B-A5 | Withdrawal requests with hold period, minimum, tax-report data | commerce | FR-M5, FR-K2 | L | B-A4 |
| B-A6 | Reversal on takedown: refund buyers, claw back earnings | commerce, moderation | FR-M6 | M | B-A1 |

Acceptance for B-A1: replaying the same webhook 10 times credits coins once; a bad signature is rejected and logged.

## Epic B: Trust, safety, legal (P0)

| ID | Item | Services | Req | Size | Depends on |
|---|---|---|---|---|---|
| B-B1 | Takedown form, case status page, response-time tracking, audit log | moderation | FR-D2, FR-D4 | M | none |
| B-B2 | Takedown also blocks the object in R2 and purges CDN cache | moderation, reader | FR-D2 | S | B-B1, R2 setup |
| B-B3 | Rights attestation at upload with stored record | catalog | FR-U3 | S | none |
| B-B4 | Age rating field and 17+ gate with age confirmation | catalog, reader | FR-G1 | M | none |
| B-B5 | Report button for stories, chapters, comments, users | moderation | FR-CM1 | M | none |
| B-B6 | Repeat-offender rules: warnings, upload suspension, ban | moderation | FR-D3 | M | B-B1 |
| B-B7 | Privacy policy, terms, consent, account deletion | identity | NFR-Privacy-1 | M | none |

## Epic C: Discovery and reach (P0)

| ID | Item | Services | Req | Size | Depends on |
|---|---|---|---|---|---|
| B-C1 | Thai-aware search (pick engine, test with real Thai titles, tags, translator names) | search | FR-S1a | L | catalog events |
| B-C2 | Server-rendered public pages, sitemap, structured data, clean URLs | frontend | FR-SEO1 | M | none |
| B-C3 | New-chapter notifications by email and LINE | notification | FR-N1a | L | events queue |
| B-C4a | Chapter comment thread: post, list with cursor pagination, one-level replies, edit window, soft delete | community | FR-CM2, FR-CM4, FR-CM5, FR-CM12 | L | identity |
| B-C4b | Story-wide all-comments view with chapter labels, chapter filter, newest/top sort | community, frontend | FR-CM3 | M | B-C4a |
| B-C4c | Comment moderation: report, blocked words, new-account link limits, rate limit, admin hide/restore, audit log | community, moderation | FR-CM7 | M | B-C4a, B-B5 |
| B-C4d | Takedown and account-deletion handling for comments | community | FR-CM11 | S | B-C4a, B-B1 |

## Epic D: Storage on R2 (P0)

| ID | Item | Services | Req | Size | Depends on |
|---|---|---|---|---|---|
| B-D1 | R2 bucket, custom image domain, cache rules | infra | NFR-Scale-2 | S | domain on Cloudflare |
| B-D2 | media-worker uploads to R2 via S3 API, credentials from Key Vault | media-worker | FR-U2 | M | B-D1 |
| B-D3 | Signed expiring image tokens validated at the Cloudflare edge | reader, infra | FR-R4 | M | B-D1 |
| B-D4 | R2 usage and cost alerts, plus alert on Azure egress from uploads | infra | NFR-Cost-1 | S | B-D1 |
| B-D5 | `ImageStore` Go interface with an R2 implementation and a local/fake implementation for tests | media-worker, reader | NFR-Port-1 | S | none |

Acceptance for B-D3: an expired or altered token gets 403; a valid token loads the image; the token cannot be reused for another chapter.

Open decision for B-C4a (FR-CM12): may someone comment on a coin-locked chapter they have not unlocked? Default in these docs: no, they can read comments but not post. Reason: comments reveal content and unlocked-only posting keeps threads relevant and cuts spam. Change this line if the decision changes.

## Epic E: Creator tools (P1)

| ID | Item | Services | Req | Size |
|---|---|---|---|---|
| B-E1 | Team roles per chapter (translate, proofread, edit, publish) | catalog | FR-T1 | L |
| B-E2 | Scheduled release and per-chapter pricing | catalog | FR-T2, FR-U4 | M |
| B-E3 | Reader drop-off statistics per chapter | analytics | FR-T2, FR-U5 | L |
| B-E4 | Creator earnings dashboard with per-chapter breakdown | commerce | FR-M5 | M |

## Epic F: Retention and revenue (P1)

| ID | Item | Services | Req | Size |
|---|---|---|---|---|
| B-F1 | Early access chapters (paid first, free after N days) | catalog, entitlement | FR-E1, FR-X4 | M |
| B-F2 | Tips to creators | commerce | FR-E2 | M |
| B-F3 | Follow a creator, notify on their new chapters | library, notification | FR-E3 | M |
| B-F4 | Shareable reading lists | library | FR-E4 | M |
| B-F5 | Daily check-in with free-read tickets and bonus coins | commerce, library | FR-E5 | M |
| B-F6 | Monthly subscription: coin allowance and no ads | subscription, commerce | FR-M7a | XL |
| B-F7 | Spoiler guard in the all-comments view using reading position | community, library | FR-CM6 | M |
| B-F8 | Creator pin and hide on own story, with audit | community | FR-CM8 | M |
| B-F9 | Comment likes and sort by top | community | FR-CM9 | S |
| B-F10 | Reply notifications | community, notification | FR-CM10 | S |

## Epic G: Later (P2)

| ID | Item | Req | Size |
|---|---|---|---|
| B-G1 | Text-to-speech and name glossary for novels | FR-RD1 | L |
| B-G2 | "Readers also read" recommendations | FR-RC1 | L |
| B-G3 | "Licensed" badge with a real verification process | FR-BADGE1 | L |
| B-G4 | Installable web app (PWA), later native app | FR-APP1 | L |

## Suggested order

1. Define `ImageStore` (B-D5), then set up R2 and images (Epic D) and takedown basics (B-B1..B-B3): they touch everything else.
2. Payment and ledger correctness (B-A1..B-A3, B-A6) before any real money moves.
3. Search, SEO, notifications, comments (Epic C) while payout and KYC (B-A4, B-A5) are built.
4. Launch gate: all P0 items done, load test from `03-testing.md` passed, takedown drill run once end to end.
5. Then Epics E and F, measured against retention (share of readers who come back within 7 and 30 days).

## Rules for agents working from this file

- Do not start an item whose dependency is unfinished without saying so.
- Do not split a money item across services to "go faster" (see NFR-Money-1).
- If an item's size turns out to be XL, split it and update this file first.
- Mark finished items with the merge commit reference in this table.
