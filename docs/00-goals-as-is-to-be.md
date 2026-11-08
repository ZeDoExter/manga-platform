# Goals, As-Is, To-Be

## Business goal

Single platform for manga (image chapters) and text novels, with four roles
(Guest, User, Uploader, Admin), a coin economy funding both platform revenue
and creator payouts, and an ad model that's more intrusive for non-paying
Guests than for logged-in Users.

## Technical goal

A demoable, Azure-hosted, Go-microservice system that:
- proves the full money + content flow end-to-end
- deploys via an automated pipeline (Azure Repos → Azure DevOps Pipelines → ACR → AKS)
- is observable (OpenTelemetry traces/logs visible on a dashboard)
- stays inside a limited Azure credit budget
- can scale to a multi-zone production layout later without a rewrite

## Demo definition of done

1. Guest reads a free chapter → signs up → tops up coins (test-mode payment)
   → buys a coin-locked chapter → creator's earned-revenue ledger reflects
   the sale → Admin takes the chapter down → revenue for that sale is
   reversed and the buyer's coins are refunded.
2. A code push triggers an automatic build and deploy.
3. A dashboard shows the trace of a request just made.
4. Load test artifacts (RPS, latency, CPU/memory, autoscaling) are ready to
   show live.
5. Total cloud spend stays within the demo credit.

## As-Is

Greenfield project — no existing system. (If a prior system exists, replace
this section with what it does today and what's being migrated.)

## To-Be, by phase

| Phase | Scope |
|---|---|
| Demo | identity, catalog, reader, entitlement (embedded in commerce), commerce, library, moderation, media, community, gateway. Single Azure zone. No Redis (PG-direct, see 02-architecture). Test-mode payment gateway. |
| Phase 2 | Real payment gateway, notification, search (Thai-aware), analytics, monthly subscription (coin allowance + no ads). |
| Phase 3 | Full creator payout/withdrawal flow, multi-zone HA, mobile app. |

## Non-goals (explicit, to keep scope honest)

- The platform does not verify copyright ownership of uploaded translations
  beyond an uploader attestation; it responds to takedown requests instead
  of pre-screening. Any agent asked to "add copyright verification" should
  flag this as a scope change requiring a decision, not implement it
  silently.
- No native mobile app in the demo or Phase 2.
- No unlimited-read subscription tier (rejected — breaks per-purchase
  creator payout accounting). If revisited, it needs a new revenue-split
  model, not a bolt-on.
