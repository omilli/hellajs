---
name: merge
description: >
  Merge ONE component worktree of a plan set into the main tree as one conventional commit (plan files never committed — ticks updated agent-side, unstaged). Invoked per component by `bun merge <set-folder>` — a fresh instance per outstanding worktree, this skill as its prompt target. Queue derivation, the set index top-marker flip, and the union gate are runner-owned. Use when a merge instance is driven against a named component, or when asked to hand-merge one specific component worktree; for a whole set, run `bun merge <set-folder>` instead of hand-merging components one by one.
---

# Merge

Apply ONE component worktree of a plan set to the main tree as **one conventional commit**. The component's carried plans are the complete merge context — commit message, conflict resolution, and completeness all draw on them.

The orchestrator (`bun merge <set-folder>`, `scripts/merge/run.ts`) derives the queue from plan state, spawns a fresh instance per outstanding component with this skill as the prompt, and gates progress mechanically: main-tree plan ticks + worktree cleanup = merged; partial progress auto-continues with a fresh instance; a stalled attempt reaches the operator (retry / skip / halt). Worker worktree runs end delivered for exactly this handoff.

Two standing rules, user-authorized here, overriding the never-commit default for exactly these commits:

- **One commit per component.** The component lands as its own conventional commit on the base branch, so review and revert work per task. Nothing else commits — no pushes, no amends beyond the memory-fix amend below.
- **Plan files are never committed.** `plans/**` stays untracked; tick markers and index descriptions are updated by the agent in the main-tree copies, unstaged.

**Orchestrator-owned — never do these inside a component merge:** queue derivation (slug matching, merged-state skip, ordering), the set `index.md` top-marker flip, and the union gate (`bun coverage <pkg>`; plugin exception — `guides/tests.md` §Triage & Gate Semantics). The runner executes the gate after the last component and, on red, re-enters this skill with a fix prompt. If the prompt names your component, merge that one and stop.

**Re-entry:** a continuation pass may resume partial progress — main-tree ticks or landed commits from a previous attempt. Verify what already landed (`git log`, `worktree.mjs status <slug>`) before doing anything; never re-merge landed commits.

Mechanics are script-owned (`worktree.mjs` — `commit`, `status`, `clean` as invoked here); this skill adds the judgment the script must never have: completeness and overlap checks, conflict resolution, commit messages, memory-ID collisions.

## Step 1 — Pre-commit checks

An incomplete component would strand the checkpoint; an out-of-order overlap is a queue bug to surface, not paper over.

- **Completeness** — every unit of the component reads `[x]` in the WORKTREE copy of its plan file (the orchestrator pre-checks; re-verify only when something looks off). Incomplete → refuse to merge, report for plan rework, leave the worktree standing (its partial state is the rework input; do not clean it).
- **Overlap vs already-merged siblings** — intersect the component's plan Files lists with merged siblings' (plan-set folder and `memory/` are protocol-owned, excluded). Overlap in ascending-first-unit order is expected: proceed, the conflict path owns resolution. Overlap whose merged sibling has the GREATER first unit is an ordering violation — stop and report rather than guess.

## Step 2 — Commit, cherry-pick, resolve

1. Derive the message from the unit contract: `<type>(<scope>): <imperative subject from the unit title>`; scope = the set's package (`plans/<package>/…`). Type is release-gated (§Core rules): `feat`/`fix` ONLY when the delta lands in a published package's user-facing API; every other delta (docs, scripts, agent-config, tests, tooling, internal structure) takes the matching non-bumping type regardless of novelty. A breaking unit adds `!` + a `BREAKING CHANGE:` footer. The commit-msg hook enforces the format — satisfy it, one body line citing the unit's plan file. Multi-unit components land one commit: mixed bump/non-bump → the user-facing API delta's type if one exists, else the dominant non-bumping type. Never create a changeset; releases are user-only.
2. `worktree.mjs commit <slug> -m "<message>"` — commits the delta on the wt branch with the carried plan folder excluded (the commit's parent is the seed baseline, so carries never ride). Prints the sha.
3. `git cherry-pick <sha>` in the main repo — git's native rename-aware 3-way merge with real conflict stages (a patch apply could abort mid-patch with misleading per-file "cleanly" messages). Clean pick → done. Conflicts → resolve agent-side (below), `git add`, `git cherry-pick --continue`. Empty pick (delta fully subsumed earlier) → `--skip`, note in report.
4. **Conflict resolution is agent-side, plan-contract-grounded.** The plans are the merge context a raw diff lacks — two components editing the same region is usually a planned, explicable overlap. Read BOTH components' plan contracts (Files, deltas, DoDs of every unit touching each conflicted file) and construct the state both contracts describe — a plan-contract union, not a line-level union. Typical unions: behavior fixes re-ported into a later structural split; a later unit's doc rewrites inside an earlier unit's restructured pages; a repo-wide rename swept across files the renaming component never saw (its `rg`-zero DoD defines the union). Worker ride-alongs (feedback edits to skills/guides discovered in the delta) ride the component's commit; list them in the report.

## Step 3 — Update the main-tree plan copies (unstaged)

Copy the worktree's postimage of each unit file over the main-tree copy — authoritative even when the worker rewrote the contract mid-run (an in-session fork resolution supersedes the main-tree draft); land the rewrite whole, flag it in the report. Multiple components ticking the same unit merge arithmetically — ticked in either is ticked, both evidence notes preserved. Correct the set `index.md` description lines for YOUR units when a rewrite falsifies them (the top-marker flip is orchestrator-owned — never touch it).

## Step 4 — Memory-ID collisions, then rebuild

Parallel components each saw the carried knowledge base, so a worker can allocate an ID the main tree has since taken (three parallel "100"s observed in one set).

- After the pick, scan the merged `memory/entries/` for duplicate numeric IDs. On collision: renumber the just-merged entry to the next free ID, record via `memory.ts log`, and `rebuild`.
- Any `memory/` change made here lands INSIDE the component's commit: `git commit --amend --no-edit` (the one amend permitted).
- `memory/index.md` conflicts resolve by taking ours and rebuilding — the derived index regenerates from ground truth. Prefer rename + `log` over `supersede` while duplicate IDs coexist (`supersede` resolves an ID and cannot disambiguate two live entries sharing one).

## Step 5 — Clean the worktree

`worktree.mjs clean <slug>` — a merged component's worktree and branch are spent protocol state; removal is owned here, nowhere else. A refused (incomplete) component is never cleaned: its state is the rework input.

## Step 6 — Report

For the component: commit sha + subject, conflicts resolved (file + the two contracts that grounded each resolution), memory IDs renumbered, plan-contract rewrites landed, ride-alongs. The orchestrator prints this and gates on the mechanical signals (main-tree ticks + worktree gone). The review surface is the commit — rejection is `git revert <sha>` per task; plan/index edits are unstaged and discardable.
