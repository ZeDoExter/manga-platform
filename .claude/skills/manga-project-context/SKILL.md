---
name: manga-project-context
description: Load project context for the manga/novel reading platform (Go microservices on Azure/AKS) before writing code, designing a new service, or reviewing a PR. Use whenever work touches identity, catalog, reader, entitlement, commerce (coins/ledger/payouts), library (reading progress), moderation/takedown, media-worker, Azure/Terraform infra, or CI/CD for this project. Always check this skill first if the user mentions "the manga platform," "the reading site," coins, chapters, uploaders, or entitlement — even if they don't name the skill.
---

# Manga Platform — Project Context

This skill exists so an agent doesn't have to be re-briefed every session.
It points to the source-of-truth docs and encodes the handful of rules that
must never be silently violated.

## Read first, in this order

1. `docs/00-goals-as-is-to-be.md` — what phase we're in, what's explicitly out of scope
2. `docs/01-requirements.md` — FR-*/NFR-* IDs; reference these in code/tests
3. `docs/02-architecture.md` — service boundaries, Azure network, request flows
4. `docs/03-testing.md` — required test cases and the load-testing plan

Don't re-derive architecture from scratch if these docs answer the question.
If a task contradicts a doc, say so explicitly instead of quietly picking
one interpretation.

## Rules that override convenience

- **Money is ACID and idempotent.** Any change to `commerce` (wallet, ledger,
  purchase, payout, reversal) must stay inside a single transaction and must
  be safe to retry. Never suggest "just update the balance directly" as a
  fix.
- **Entitlement gates every read.** `reader` must call `entitlement` before
  returning chapter content, with no shortcut path for internal tools, demos,
  or "just this once."
- **Uploader rights are per-story.** Never implement a global "is_uploader"
  check where a per-story ownership/team check is what's actually needed.
- **Takedown touches money too.** A moderation takedown must trigger revenue
  reversal and buyer refund (FR-M6) — treat these as one feature, not two.
- **Cost-aware infra.** Any new Azure resource should be checked against
  NFR-Cost-1 and the demo's single-zone, no-NAT-Gateway, no-Bastion posture
  before being added to Terraform.
- **Scope changes get flagged, not absorbed.** Things explicitly marked
  non-goals (e.g. copyright pre-verification, unlimited-read subscription)
  should not be implemented just because a task seems to imply them — raise
  it instead.

## When you learn something new about the project

If a decision is made that changes a doc (new service, changed NFR target,
new non-goal), update the relevant file in `docs/` in the same session —
don't let this skill or the docs drift from reality. If the change is
significant enough to need its own conventions (a new service with its own
patterns worth encoding), use the `skill-builder` skill to create a
dedicated `SKILL.md` for it rather than growing this file indefinitely.
