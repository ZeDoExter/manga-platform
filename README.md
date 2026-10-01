# Manga & Novel Reading Platform — Agent Knowledge Base

This folder is the source of truth for an AI coding agent (Claude Code, Cursor,
or similar) working on this project. Read `docs/` in order before writing code.
Skills live under `.claude/skills/` and are auto-discoverable by Claude Code.

## Reading order for an agent

1. `docs/00-goals-as-is-to-be.md` — why this project exists, what "done" means
2. `docs/01-requirements.md` — functional (FR-*) and non-functional (NFR-*) requirements, with IDs to reference in commits/PRs/tests
3. `docs/02-architecture.md` — service list, tech stack, Azure network layout, data flow
4. `docs/03-testing.md` — required test cases, load/performance testing plan
5. `docs/04-backlog.md` — ordered work list for the real launch, with sizes and dependencies

## Project facts an agent should never violate

- Backend language: **Go**. No other backend language without explicit approval.
- 4 roles: `guest`, `user`, `uploader`, `admin`. Authorization is per-story for uploaders, not global.
- Money logic (wallet/ledger/payouts) must be ACID and idempotent. Never "fix" a money bug with a quick patch that skips the transaction boundary.
- Content delivery (manga pages, novel text) must always pass through the `entitlement` check before being served. Never bypass this for convenience in a demo.
- Cloud target: Azure. IaC: Terraform. CI/CD: Bitbucket → Jenkins. Local dev: Tilt.
- The platform explicitly disclaims ownership of uploaded content and operates a takedown process (see FR-D2, FR-U3). Any feature touching content removal must also touch `commerce` (revenue reversal) — see NFR "Content protection" and FR-M6.

## Conventions

- Requirement IDs (`FR-A1`, `NFR-Perf-1`, etc.) should be referenced in commit messages and test names so coverage is traceable, e.g. `test_FR_L1_resume_position_after_reload`.
- Every new service gets its own `SKILL.md` once it has enough conventions worth encoding (see `.claude/skills/skill-builder/SKILL.md`).
- Diagrams referenced in `02-architecture.md` are descriptive (ASCII/tables); regenerate visuals from them, don't treat prose as stale.

## Skills (`.claude/skills/`)

| Skill | Use for |
|---|---|
| `manga-project-context` | Load before any work on the platform — points to the right doc and lists rules that must never be silently violated |
| `skill-builder` | Create a new project-local skill once a service/workflow has accumulated non-obvious operational knowledge worth encoding |

## Status

This is a **living document set** for a project currently in the demo/prototype phase (see `docs/00-goals-as-is-to-be.md` for phase scope). Update the relevant doc in the same change that changes behavior — don't let code and docs drift.
