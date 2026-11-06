---
name: issue-driven-flow
description: How work gets done on the manga platform repo: pick a GitLab issue, branch from master, implement, verify, open MR, merge, close the issue. Use whenever starting a task from an issue, asking "what's the workflow", creating branches/MRs, or updating issue status — even if the user just says "ทำตาม issue" or "flow การทำงานคืออะไร".
---

# Issue-Driven Flow

## Context

Single source of truth: GitLab issues under the `Demo Ready` milestone.
No work lands on `master` except through a merge request with green CI.
Why: committee demo needs traceable history (issue → branch → MR → merge),
and the money/entitlement rules in `manga-project-context` need a review
gate even when the team is one person.

## How to do it

### 1. Pick up an issue

- Open the issue board, take the top `To Do` item (or whatever the user names).
- Move it to `Doing`. If it has no Requirement IDs, add them from
  `docs/01-requirements.md` before writing code.
- If the issue is vague, ask one clarifying question — don't guess scope.

### 2. Branch

```bash
git checkout master && git pull
git checkout -b <type>/<short-name>   # feat/pg-catalog, fix/hpa-reader, chore/k6-scripts
```

Types: `feat` (new), `fix` (bug), `chore` (repo/infra/docs), `ci` (pipeline).
One issue per branch. Never commit to `master` directly.

### 3. Implement

- Follow `CONTRIBUTING.md` rules (money ACID, entitlement gate, per-story rights).
- Reference the issue in commits when it closes sub-steps: `feat(commerce): PG ledger store (refs #1)`.
- Update `docs/` in the same branch if behavior changes — never in a follow-up.

### 4. Verify locally (all must pass before MR)

```bash
go test ./...                    # unit + service tests
go vet ./...                     # static analysis
cd web && npx tsc --noEmit       # frontend types (if web/ touched)
```

Plus the issue's own acceptance check: run the affected flow end-to-end
(e.g. top up → buy → takedown → refund) and note the result in the MR.

### 5. Open the MR

```bash
git push -u origin <branch>
glab mr create --fill --label "<backend|frontend|infra|testing>"
```

Fill the template: summary, Requirement IDs, how verified, checklist.
Link the issue with `Closes #N` in the description so merge auto-closes it.

### 6. Merge

- CI must be green (lint → test + coverage gate 80% → build). Red = fix, never override.
- Merge via UI (squash off — keep history readable per commit).
- Delete the branch after merge (`glab` offers this; say yes).

### 7. Close the loop on the issue

- Auto-closed by `Closes #N`? Verify it actually closed.
- If the issue is only partially done, comment what remains and move it back to `To Do`.
- Move the board card to `Done` if automation didn't.
- If scope grew during work, split the extra into a new issue — don't silently expand.

## Gotchas

- `glab` is authenticated via OS keyring (`glab auth status` to check).
  If it breaks, fall back to the GitLab web UI — never paste tokens in chat.
- Coverage gate only watches `services/commerce/` — a green pipeline does
  not mean other services are tested. Check the new code's tests yourself.
- Minikube must be running for any K8s verification step
  (`wsl minikube status`; start with `wsl minikube start`).
- WSL + Windows path gotcha: repo lives on Windows, kubectl runs in WSL —
  use `wsl minikube kubectl -- ...` or absolute `/mnt/c/...` paths.
- Don't batch unrelated fixes into one MR to "save time" — one issue, one
  branch, one MR. Reviewers (and future you) will thank you.

## Related

- `manga-project-context` — rules that override convenience, doc reading order
- `CONTRIBUTING.md` — the human-readable version of this flow
- `.gitlab/merge_request_templates/Default.md` — the MR template itself
- `docs/01-requirements.md` — FR-*/NFR-* IDs to reference
- `docs/03-testing.md` — what "verified" means per area
