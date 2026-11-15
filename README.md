# DOOTOON — ดูตูน

แพลตฟอร์มอ่านมังงะและนิยายภาษาไทย: เกสต์อ่านตอนฟรี → สมัคร → เติมเหรียญ → ซื้อตอนล็อก → รายได้เข้าครีเอเตอร์ → แอดมิน takedown + คืนเงินผู้ซื้อ

**Live:** https://dootoon.store · **CI/CD:** Azure DevOps (`azure-pipelines.yml`: Lint → Test → Build → Deploy)

## โครงrepo

| Path | คืออะไร |
|---|---|
| `web/` | Next.js frontend (standalone) → `https://dootoon.store` |
| `services/` + `cmd/` | Go microservices: identity, catalog, commerce, reader, library, moderation, community, media, gateway |
| `deploy/k8s/` | K8s manifests + `gateway-prod.yaml` (TLS) |
| `infra/` | Terraform: AKS + ACR + PostgreSQL + Key Vault (`demo-day`/`demo-night` scripts) |
| `docs/` | Spec: goals, requirements (FR-*/NFR-*), architecture, testing, backlog, demo script |
| `azure-pipelines.yml` | CI/CD เต็มวงจร (MS-hosted, ~17 นาที/รอบ) |

## เริ่ม (local dev)

```bash
docker compose up -d        # Postgres + Go services ขั้นต่ำ
cd web && bun install && bun run dev --port 3125
```