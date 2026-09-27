---
type: decision
title: Parse plan top markers behind `depends_on` frontmatter and make synthetic fixtures mirror real unit shape
description: Plan units carry `depends_on` frontmatter before the `# [x]` marker (never read line 1), and synthetic fixtures must mirror real artifact shape or green verification hides marker-blindness.
tags: [scripts, automation, testing]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [plans-runner, top-marker, fixture-fidelity, frontmatter, isTicked]
---
# Why

The plans orchestrator's completion signal is a unit file's top marker (`# [ ]` → `# [x]`). Real plan units open with YAML frontmatter (`depends_on`, required by the worker skill's Step 0 gate), so the marker heading is never line 1. Any line-1 read is blind to completion twice over: pre-ticked units get a fresh expensive worker instance (wasted tokens), and a successful pass's marker flip is invisible → an unearned continuation pass plus the spurious ask-retry-skip-halt gate. The verification fixture escaped blame because its synthetic units had no frontmatter — the skip path tested green against a shape that never occurs in real sets. General lesson: a synthetic fixture that does not mirror the real artifact's shape verifies nothing about real runs; when gate logic changes, fixture shape must be checked against the real shape in the same pass.

# Evidence

- Bug (original): `isTicked` read line 1 only, so a marker on line 4 behind `---\ndepends_on: []\n---` read unticked; cost = two user runs re-verifying a complete unit and hitting the gate despite completion.
- Fix confirmed in current source: `scripts/worker/set.ts` `isTicked` finds the first line matching `^#\s*\[[ x]\]` anywhere in the file; its JSDoc states real units carry YAML frontmatter before the heading. Consumed by `scripts/worker/run.ts`, `scripts/merge/{run,queue}.ts`, `scripts/agent/worktree.ts`.
- Real-unit shape confirmed on current sets: `plans/agents/config/tdd-evidence/01-evidence-capture-script.md` and `plans/ui/code/registry-canonical-placeholders/01-canonicals-under-lint-gates.md` both open with frontmatter before `# [ ]`; worker skill Step 0 gates on frontmatter `depends_on`. (Original evidence artifacts — set `plans/resource/misc/audit-fixes/`, fixture folder `.plans-runner/fixture/` — since deleted; the fixture-fidelity lesson stands.)
