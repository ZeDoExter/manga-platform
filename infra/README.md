# Azure demo infra (Terraform)

Single-zone demo posture: RG + VNet + ACR + Key Vault + PostgreSQL Flexible
(B1ms) + AKS (B2s x2). No NAT Gateway / Bastion / Front Door (NFR-Cost-1).

## Bring up

```bash
cd infra
terraform init
terraform apply -var="alert_email=you@example.com"
```

Then:

```bash
eval $(terraform output -raw kubeconfig_cmd | sed 's/^az /az /')
# or run the printed command manually
```

## Daily cost guard

`azurerm_consumption_budget_resource_group` alerts at 80% of
`var.daily_budget_usd` (default $1/day). **Azure budgets are alert-only —
they never stop resources.** If the alert fires:

1. `kubectl scale deploy --all --replicas=0` (stops compute burn, keeps data)
2. Or `terraform destroy` (nukes everything; re-apply + re-seed later)

## Tear down (mandatory post-demo)

```bash
terraform destroy
```

## Notes

- ACR `admin_enabled` is demo convenience; prod uses managed identity.
- PG password lives in Terraform state + Key Vault. State is local for
  demo; migrate to an Azure Storage backend before sharing.
- Media images use Cloudflare R2 (`dootoon-img` + `img.dootoon.store`) via `R2Store` (ADR-001). Local dev falls back to in-memory store.
