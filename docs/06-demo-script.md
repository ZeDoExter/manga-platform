# Demo Script — DOOTOON on Azure (~10 min)

Setup (once, before the room): `demo-day.ps1` (AKS + PG up), verify
`https://dootoon.store`, `https://api.dootoon.store/healthz`,
`https://obs.dootoon.store`. Open tabs: DOOTOON web, OpenObserve
dashboard, Azure DevOps pipeline runs.

## 1. The product (2 min) — DOOTOON web

- Home: continue-reading, Top 10, trending. "Every number here is live."
- Open a manga chapter, scroll: progress saves (debounced), survives refresh.
- Bookmarks page + library follows. Login via Google or email at `/login`.

## 2. The money (3 min) — wallet + purchase + takedown

- Wallet: top up test coins (Stripe test-mode, idempotent — replay it,
  balance stays put).
- Buy a locked chapter: wallet debited, entitlement granted, creator
  earnings + platform 30% recorded. Show the split math on the ledger page.
- Admin Dashboard (`/admin`, System Admin role): KPI cards + 14-day unlock
  chart + takedown form → chapter `taken_down`, buyer refunded, creators
  clawed back, audit log row appears. "Money and moderation are one transaction."

## 3. The platform (3 min) — OpenObserve + Azure DevOps

- OpenObserve dashboard: request rate, p95, errors, slowest traces —
  all from OTel, no code changes per service.
- Click a slow trace: gateway → reader → catalog/commerce in one view.
- Azure DevOps: pipeline green (Lint → Test → Build → Deploy),
  coverage gate, SHA-pinned images. "One person, full traceability."

## 4. The infra (2 min) — AKS

- `kubectl get pods`: 9 Go services + web + OpenObserve.
- Gateway API (Envoy): `dootoon.store` / `api.dootoon.store` /
  `obs.dootoon.store` behind Cloudflare proxy + Let's Encrypt TLS.
- Kill a catalog pod live: traffic continues, data survives (PG, not memory).
- HPA on reader (mention; k6 run is follow-up work).

## Backup lines (if asked)

- "Why OpenObserve over Grafana?" — one pod vs four, SQL vs 3 query
  languages, push vs pull through NAT. OTel means we can switch later.
- "Why Gateway API over NGINX?" — ingress-nginx EOL March 2026; Envoy
  locally maps 1:1 to Azure App Gateway for Containers.
- "Redis?" — measured first: PG handles progress writes at demo scale;
  the repository interface lets us wrap a cache later without touching callers.
- "Why Azure DevOps over GitLab CI?" — GitLab.com free tier ran out of
  compute minutes and throttled unauthenticated web traffic; Azure DevOps
  keeps repo + pipeline + ACR + AKS on one bill with MS-hosted agents.

## Reset between runs

```bash
kubectl exec deploy/postgres-0 -- psql -U manga -d manga -c \
  "DELETE FROM commerce.entitlements; DELETE FROM commerce.creator_earnings; \
   DELETE FROM commerce.purchases; DELETE FROM commerce.ledger_entries; \
   DELETE FROM catalog.chapters; DELETE FROM catalog.creator_splits; \
   DELETE FROM catalog.stories;"
python scripts/seed-demo.py
```
(Identity is still in-memory: users survive pod restarts only until the
identity pod itself restarts — re-seed then.)

## Shutdown after demo

```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/demo-night.ps1
```
