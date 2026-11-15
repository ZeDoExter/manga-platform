# K8s bootstrap: secrets that must exist out-of-band

These Secrets are referenced by manifests but NEVER committed:

| Secret (namespace/key) | Used by | Create with |
|---|---|---|
| `default/postgres-auth` → `DATABASE_URL` | Go services on AKS | Key Vault CSI or `kubectl -n default create secret generic postgres-auth --from-literal=DATABASE_URL='postgres://…'` |
| `default/oolog-auth` → `basic` | Go services (`OOLOG_AUTH`, format `email:password`) | `kubectl -n default create secret generic oolog-auth --from-literal=basic='root@example.com:<NEW-PASSWORD>'` |
| `observability/oolog-auth` → `password`, `basic-b64` | OpenObserve root login + OTel collector export | see rotation steps below |

## Mandatory: rotate the OpenObserve root password

The old password (`Complexpass#123`) lived in git history on a now-public repo.
Treat it as compromised. Before opening `obs.dootoon.store` to anyone:

```powershell
$pw = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("root@example.com:$pw"))
kubectl -n observability create secret generic oolog-auth `
  --from-literal=password="$pw" --from-literal=basic-b64="$b64" `
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n default create secret generic oolog-auth `
  --from-literal=basic="root@example.com:$pw" `
  --dry-run=client -o yaml | kubectl apply -f -
# Fresh installs read ZO_ROOT_USER_PASSWORD on first boot; existing data keeps
# the old password, so also change it in the OpenObserve UI (admin settings),
# then restart affected pods:
kubectl -n default rollout restart deployment/identity deployment/catalog deployment/commerce deployment/reader deployment/moderation deployment/community deployment/library deployment/media
kubectl -n observability rollout restart deployment/otel-collector deployment/openobserve
```

## Apply order (fresh cluster)

```bash
kubectl apply -f deploy/k8s/observability.yaml   # namespace + collector + OpenObserve
kubectl apply -f deploy/k8s/networkpolicy.yaml  # backend ingress firewall
kubectl apply -f deploy/k8s/service.yaml        # ClusterIP services
kubectl apply -f deploy/k8s/deployment.yaml     # workloads (needs Secrets above)
kubectl apply -f deploy/k8s/gateway-prod.yaml   # edge routes + TLS
```
