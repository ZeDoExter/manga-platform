# After demo: stop everything to halt the meter (disks keep ~$5-8/mo).
# Usage: .\demo-night.ps1
$ErrorActionPreference = "Stop"
$AZ = "C:/Program Files (x86)/Microsoft SDKs/Azure/CLI2/python.exe"

Write-Host "== Scaling AKS to 0 via stop ==" -ForegroundColor Cyan
& $AZ -m azure.cli aks stop -g manga-demo-rg -n manga-demo-aks --no-wait

Write-Host "== Stopping PostgreSQL ==" -ForegroundColor Cyan
& $AZ -m azure.cli postgres flexible-server stop -g manga-demo-rg -n manga-demo-pg --no-wait

Write-Host ""
Write-Host "Shutdown initiated. Verify in portal: AKS Stopped + PG Stopped." -ForegroundColor Green
Write-Host "To nuke everything: terraform destroy" -ForegroundColor Yellow
