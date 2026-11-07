# Demo day: start everything, scale to 2 nodes, enable OpenObserve.
# Usage: .\demo-day.ps1
$ErrorActionPreference = "Stop"
$AZ = "C:/Program Files (x86)/Microsoft SDKs/Azure/CLI2/python.exe"

Write-Host "== Starting PostgreSQL ==" -ForegroundColor Cyan
& $AZ -m azure.cli postgres flexible-server start -g manga-demo-rg -n manga-demo-pg --no-wait

Write-Host "== Starting AKS ==" -ForegroundColor Cyan
& $AZ -m azure.cli aks start -g manga-demo-rg -n manga-demo-aks --no-wait

Write-Host "== Waiting for cluster (up to 10 min) ==" -ForegroundColor Cyan
& $AZ -m azure.cli aks wait -g manga-demo-rg -n manga-demo-aks --created --timeout 600 2>$null

Write-Host "== Scaling to 2 nodes ==" -ForegroundColor Cyan
& $AZ -m azure.cli aks scale -g manga-demo-rg -n manga-demo-aks --node-count 2 --no-wait

Write-Host "== Enabling OpenObserve ==" -ForegroundColor Cyan
kubectl scale deploy/openobserve -n observability --replicas=1

Write-Host ""
Write-Host "Demo infra starting. Check: kubectl get nodes ; kubectl get pods -A" -ForegroundColor Green
