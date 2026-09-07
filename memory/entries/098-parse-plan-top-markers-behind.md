---
type: decision
title: Parse plan top markers behind `depends_on` frontmatter and make synthetic fixtures mirror real unit shape
description: Plan units carry `depends_on` frontmatter before the `# [x]` marker (never read line 1), and synthetic fixtures must mirror real artifact shape or green verification hides marker-blindness.
tags: [scripts, automation, testing]
timestamp: 2026-09-07
last_confirmed: 2026-09-07
triggers: [plans-runner, top-marker, fixture-fidelity, frontmatter, isTicked]
---
# Why

The plans orchestrator's completion signal is a unit file's top marker (`# [ ]` → `# [x]`). Real plan units open with YAML frontmatter (`depends_on`, required by the worker skill's Step 0 gate), so the marker heading is never line 1. Any line-1 read is blind to completion twice over: pre-ticked units get a fresh expensive worker instance (wasted tokens), and a successful pass's marker flip is invisible → an unearned continuation pass plus the spurious ask-retry-skip-halt gate. The verification fixture escaped blame because its synthetic units had no frontmatter — the skip path tested green against a shape that never occurs in real sets. General lesson: a synthetic fixture that does not mirror the real artifact's shape verifies nothing about real runs; when gate logic changes, fixture shape must be checked against the real shape in the same pass.

# Evidence

- Bug reproduced: `isTicked("plans/resource/misc/audit-fixes/01-resource-contract.md")` returned false while the marker read `# [x]` on line 4 behind `---\ndepends_on: []\n---`; cost = two user runs re-verifying a complete unit and hitting the gate despite completion.
- Fix: `scripts/plans/set.ts` `isTicked` now returns the first line matching `^#\s*\[[ x]\]` anywhere in the file; verified by a 9-case probe (frontmattered ticked/unticked across the real set and fixture, plus line-1 ticked/unticked) and `bun lint` exit 0.
- Fixture gap fixed alongside: `.plans-runner/fixture/{01-completable,02-rejected,03-preticked}.md` now carry `depends_on: []` frontmatter so the fixture run exercises pre-tick skip and post-settle flip detection against the real shape (pre-fix `03-preticked.md` had the marker on line 1).
