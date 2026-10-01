---
name: skill-builder
description: Create a new project-specific SKILL.md for the manga/novel platform when a service, workflow, or recurring convention has accumulated enough non-obvious detail to be worth encoding. Use when a service's setup/gotchas/patterns keep needing re-explanation, after finishing a nontrivial new service (e.g. commerce, entitlement, media-worker), or when the user says "turn this into a skill" / "make this repeatable." Do not use for one-off tasks or things already covered by docs/00-03.
---

# Skill Builder (project-local)

A lightweight, project-scoped version of skill creation: turn hard-won
context about *this* codebase into a `SKILL.md` so the next session (or the
next agent) doesn't relearn it from scratch.

## When to actually create a skill vs. just update a doc

- Belongs in `docs/02-architecture.md`: stack-level facts, service
  boundaries, network layout — things true about the *design*.
- Belongs in a new `SKILL.md`: operational, "how do I actually do this in
  this repo" knowledge — commands, gotchas, local conventions, things you'd
  otherwise have to rediscover by reading code or failing once. Example
  triggers: "the `commerce` migration tool needs `--allow-money-schema` or
  it refuses to run," "local Tilt setup for `media-worker` needs a fake S3
  endpoint," "our gRPC codegen script has an undocumented flag."

If in doubt, ask: would a new engineer (or a fresh agent session) get this
wrong on the first try without being told? If yes, it's skill material.

## Steps

1. **Scope it to one thing.** One service, one workflow, or one recurring
   pain point per skill — not "everything about commerce."
2. **Name it** `kebab-case`, matching the folder: `.claude/skills/<name>/SKILL.md`.
3. **Write the frontmatter description to be a little pushy** — name the
   concrete triggers (service names, error messages, task phrasings) so it
   actually fires. Compare `manga-project-context`'s description for the
   style: broad triggers named explicitly, not just a vague summary.
4. **Body content**: commands that actually work in this repo, known
   gotchas, and pointers back to `docs/02-architecture.md` for the "why"
   instead of repeating it. Keep it under ~500 lines; split into
   `references/` files if it grows past that.
5. **Cross-link**: add a line to `manga-project-context/SKILL.md`'s reading
   list if the new skill should be consulted broadly, or leave it
   standalone if it's narrow (e.g. only relevant when touching one service).
6. **Verify it triggers**: describe a task that should invoke it and check
   that the description alone would make an agent reach for it, without
   needing the body loaded first.

## Template

```markdown
---
name: <kebab-case-name>
description: <what it does> + <when to use it, named triggers, be specific>
---

# <Human title>

## Context
<Why this exists — link to docs/02-architecture.md rather than repeating it>

## How to do it
<Concrete steps/commands that work in this repo>

## Gotchas
<Things that will bite someone who doesn't know>

## Related
<Links to other skills/docs>
```

## Example: deciding whether something is skill-worthy

- "The `entitlement` service's test suite needs a seeded Redis fixture or
  87% of tests fail with a confusing timeout" → **yes**, skill-worthy
  (non-obvious, costs real time, same for everyone touching the service).
- "Buy a chapter by calling `POST /purchases`" → **no**, that's just the
  API, it belongs in the service's own README/OpenAPI doc, not a skill.
- "Our Terraform module needs `zone_count=1` for demo, `2` for prod" →
  borderline; if it's a one-line fact, put it in
  `docs/02-architecture.md`. If there's more nuance (order of operations,
  known apply failures), make it a skill.

## After creating a skill

Note it in this project's `README.md` under a "Skills" section if one
exists, so a fresh agent session can discover it without stumbling into it
by luck.
