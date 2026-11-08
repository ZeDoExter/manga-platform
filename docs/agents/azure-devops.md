# Azure DevOps setup (one-time)

Pipeline lives in `azure-pipelines.yml` (Lint → Test → Build → Deploy).
Triggers: every branch runs Lint+Test; `master` also builds ACR images and deploys to AKS.

## 1. Create project + repo

1. https://dev.azure.com → New organization `navapoltawan` (if none) → New project `manga-platform` (private, Git).
2. Import repo: Repos → Import → clone URL `https://gitlab.com/navapoltawan/manga-platform.git`
   (use a GitLab PAT with `read_repository` if prompted), OR push locally:
   `git remote add azure <azure-repos-clone-url> && git push azure --all`

## 2. Service connection `dootoon-azure`

Project Settings → Service connections → New → Azure Resource Manager →
Workload Identity federation → Subscription "Azure for Students":

- Scope: resource group `manga-demo-rg`
- Name: `dootoon-azure`
- Grant access permission to all pipelines: ON

Role assignments needed (on `manga-demo-rg` or the specific resources):

| Role | Target | Why |
|---|---|---|
| `AcrPush` | `mangademoacr` | Docker@2 buildAndPush |
| `Azure Kubernetes Service Cluster Admin Role` | `manga-demo-aks` | Kubernetes@1 + KubernetesManifest@1 deploy |

## 3. Create the pipeline

Pipelines → New pipeline → Azure Repos Git → `manga-platform` →
Existing Azure Pipelines YAML file → `/azure-pipelines.yml` → Run.

- Branch runs (feat/*): Lint + Test only.
- Merge to `master`: full run ending at `https://dootoon.store`.
- First run prompts to permit the `dootoon-azure` service connection: Allow.

## 4. Retire GitLab CI (after first green Azure run)

1. Keep GitLab repo as mirror/backup or archive it.
2. Delete the AKS runner: `kubectl delete -f deploy/k8s/gitlab-runner.yaml`
   + `kubectl delete secret gitlab-runner-token`.
3. Delete `.gitlab-ci.yml` (or leave it; GitLab has no runners left so it never runs).
