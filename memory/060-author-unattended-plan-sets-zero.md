---
title: Author unattended plan sets with zero fork-shaped phrasing plus an explicit resolve-to-recommended directive
description: Overnight/no-operator `bun worker` runs stall on contract ambiguity — worker instances escalate either/or contract text to operator questions; every fork must be pre-resolved in the plan text and the set must carry an unattended-run directive.
tags: [plan, worker, unattended, plans, overnight, authoring]
confirmed: 2026-01-29
---

# Why

When the operator declares a plan set unattended ("no questions, recommended solutions only"), the contract itself must be question-proof: worker instances treat unresolved either/or contract text ("X or Y — follow the template", "only if A; otherwise B") as a fork and escalate to the operator, stalling an overnight run at spawn time. The fixes, applied to `plans/headless/code/completion` after exactly such a stall:

1. **Zero fork-shaped phrasing.** Sweep the drafted units for ` or `, `only if`, `otherwise`, `whichever`, and rewrite each to the single recommended path stated as a decision. Defer-to-spec clauses ("per the template", "if present") are fine only when they name the registry source as the arbiter.
2. **An unattended-run directive** on the set index and every unit's Scope block: "a recommendation in a contract is a decision, not an option — execute it without asking; on a true gap, deliver-incomplete, never ask."
3. **Mirror updated plan files into the live worktree** (`cp plans/.../<set>/*.md ../hellajs-wt/<set>/plans/.../`) — worker instances read the worktree copies, not the main tree. Safe to overwrite when `worktree.mjs status` shows the copies unticked; if a unit is mid-flight with ticks, edit its worktree copy surgically instead.

# Evidence

- `bun worker plans/headless/code/completion` spawned and immediately asked the operator a question sourced from unit 01's either/or part-shape clause (2026-01-29); the instance had written nothing (`worktree.mjs status` — 0 changed), so the fork came from contract text, not code.
- Fix pass: `rg -n ' or |only if|otherwise|whichever' plans/headless/code/completion/*.md` found three genuine forks (press-family Indicator shape, tabs engine choice, finalization sweep either/or); all resolved to the recommended path, directive added to index + 10 units, mirrored into the worktree (verified `diff -rq` identical).
