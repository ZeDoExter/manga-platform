# Azure DevOps setup (one-time)

Pipeline lives in `azure-pipelines.yml` (Lint → Test → Build → Deploy).
Triggers: every branch runs Lint+Test; `master` also builds ACR images and deploys to AKS.

## 1. Create project + repo

1. https://dev.azure.com → New organization `navapoltawan` (if none) → New project `manga-platform` (private, Git).
2. Import repo: Repos → Import → clone URL `https://gitlab.com/navapoltawan/manga-platform.git`
   (use a GitLab PAT with `read_repository` if prompted), OR push locally:
   `git remote add azure <azure-repos-clone-url> && git push azure --all`

## 2. Service connections (done via CLI)

| Name | Type | Used by |
|---|---|---|
| `dootoon-azure` | Azure Resource Manager (SP `dootoon-ado-federated`) | Kubernetes@1 + KubernetesManifest@1 deploy |
| `dootoon-acr` | Docker Registry (`mangademoacr.azurecr.io`) | Docker@2 buildAndPush |

Roles on the SP: Contributor on `manga-demo-rg` + `AcrPush` on `mangademoacr` +
`Azure Kubernetes Service Cluster Admin Role` on `manga-demo-aks`.
Both endpoints approved for all pipelines (`pipelinepermissions` PATCH).

## 3. Pipeline `manga-platform-ci` (definition id 1, yaml `/azure-pipelines.yml`)

- Branch runs (feat/*): Lint + Test only.
- Merge to `master`: full run ending at `https://dootoon.store`.
- First run prompts to permit the `dootoon-azure` service connection: Allow.

## 4. Retire GitLab CI (after first green Azure run)

1. Keep GitLab repo as mirror/backup or archive it.
2. Delete the AKS runner: `kubectl delete -f deploy/k8s/gitlab-runner.yaml`
   + `kubectl delete secret gitlab-runner-token`.
3. Delete `.gitlab-ci.yml` (or leave it; GitLab has no runners left so it never runs).
