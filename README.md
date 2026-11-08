# DOOTOON — ดูตูน

แพลตฟอร์มอ่านมังงะและนิยายภาษาไทย: เกสต์อ่านตอนฟรี → สมัคร → เติมเหรียญ → ซื้อตอนล็อก → รายได้เข้าครีเอเตอร์ → แอดมิน takedown + คืนเงินผู้ซื้อ

**Live:** https://dootoon.store · **CI/CD:** Azure DevOps (`azure-pipelines.yml`: Lint → Test → Build → Deploy)

## โครงrepo

| Path | คืออะไร |
|---|---|
| `web/` | Next.js frontend (standalone) → `https://dootoon.store` |
| `services/` + `cmd/` | Go microservices: identity, catalog, commerce, reader, library, moderation, community, media, gateway |
| `deploy/k8s/` | K8s manifests + `gateway-prod.yaml` (TLS) + `gitlab-runner.yaml` (retired) |
| `infra/` | Terraform: AKS + ACR + PostgreSQL + Key Vault (`demo-day`/`demo-night` scripts) |
| `docs/` | Spec: goals, requirements (FR-*/NFR-*), architecture, testing, backlog, demo script |
| `azure-pipelines.yml` | CI/CD เต็มวงจร (MS-hosted, ~17 นาที/รอบ) |

## เริ่มเร็ว (local dev)

```bash
docker compose up -d        # Postgres + Go services ขั้นต่ำ
cd web && bun install && bun run dev --port 3125
```

## เปิด/ปิด cloud (ประหยัดงบ)

```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/demo-day.ps1    # เปิด AKS+PG
powershell -ExecutionPolicy Bypass -File infra/scripts/demo-night.ps1  # ปิดทั้งหมด
```

## เอกสาร

อ่าน `docs/` ตามเลข: `00-goals-as-is-to-be` → `01-requirements` → `02-architecture` → `03-testing` → `04-backlog` → `06-demo-script`
