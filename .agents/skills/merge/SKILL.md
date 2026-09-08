---
name: merge
description: >
  Merge a plan set's outstanding component worktrees back to the main tree, one conventional commit per task. Use when asked to merge this plan set's outstanding components, when component worktrees are delivered for merge (worker runs end "delivered for merge"), or when applying completed per-component worktrees. One batch per plan set: queue derivation from carried plan state, script-owned per-component commits + cherry-pick with agent-side, plan-contract-grounded conflict resolution, unstaged plan-file tick updates (plans are never committed), memory-ID collision handling, worktree cleanup.
---

# Merge

Apply a plan set's outstanding component worktrees to the main tree as **one commit per task**. The batch is **per plan set**: the carried plans of one set are the complete merge context — queue order, conflict resolution, and completeness all draw on them; cross-set batching has no plan authority to arbitrate with.

Two standing rules shape the whole run (user-authorized here, overriding the repo's never-commit default for exactly these commits):

- **One commit per task.** Each component lands as its own conventional commit on the base branch, so review and revert work per task. Nothing else commits — no pushes, no amends beyond the memory-fix amend below.
- **Plan files are never committed.** `plans/**` stays untracked. Tick markers and index state are updated by the agent directly in the main-tree copies, unstaged.

Mechanics are script-owned (`bun .agents/skills/worker/scripts/worktree.mjs` — `list`, `status`, `diff`, `commit`, `clean`); this skill adds the judgment the script must never have: queue order, completeness and overlap checks, conflict resolution, commit messages, memory-ID collisions.

## Step 0 — Enumerate and derive the queue (per plan set)

Why a derived queue: multiple component worktrees of one set commonly touch one package; merging by hand one-by-one and resolving markers ad hoc is exactly the struggle this skill removes.

1. `worktree.mjs list` — every protocol worktree with its carried plan folder (`plans=`).
2. Group by set folder. The target set is the one named in the request; several outstanding sets → one invocation per set, in whatever order the user names.
3. Derive the queue from plan state:
   - Main-tree top markers `[x]` mean already merged — the main tree is the merged-state record, so a component whose units are all `[x]` in the main tree is skipped, never re-applied.
   - File-overlapping components (plan Files lists intersect beyond the carry-set — the plan-set folder and `memory/` are protocol-owned shared state, excluded) order by ascending first unit; deterministic and it matches the set's own sequencing intent.
   - Disjoint components are order-free.
4. Report the queue before merging anything: per component its slug, first unit, and overlap note. An empty queue (nothing outstanding) is reported and exits clean.

## Step 1 — Pre-commit checks (per component)

Why before commit: an incomplete component would strand the checkpoint, and an out-of-order overlap is a queue bug to surface, not paper over.

- **Completeness** — every unit of the component reads `[x]` in the WORKTREE copy of its plan file. Incomplete → refuse to merge, report it for plan rework, leave the worktree standing (its partial state is the rework input; do not clean it).
- **Overlap vs already-merged siblings** — intersect the component's plan Files lists with the merged siblings' (carry-set excluded). Overlap in ascending-first-unit order is expected: proceed, the conflict path owns the resolution. Overlap whose merged sibling has the GREATER first unit is an ordering violation — stop and report rather than guess.

## Step 2 — Commit, cherry-pick, resolve (per component, in queue order)

1. Derive the commit message from the unit contract: `<type>(<scope>): <imperative subject from the unit title>`. Scope = the set's package (`plans/<package>/...`); type from the unit's Type line — behavior fix → `fix`, new capability → `feat`, docs → `docs`, pure structure → `refactor`, test-only → `test`, agent-config → `chore`. A unit the contract flags as breaking (ships as a major) adds `!` and a `BREAKING CHANGE:` footer. The repo's commit-msg hook (commitlint) enforces the format — satisfy it, one body line citing the unit's plan file.
2. `worktree.mjs commit <slug> -m "<message>"` — commits the component's delta on its wt branch with the carried plan folder excluded (the commit's parent is the seed baseline, so carries never ride). Prints the sha.
3. `git cherry-pick <sha>` in the main repo. Why cherry-pick and not a patch apply: git's native rename-aware 3-way merge with real conflict stages — the patch path could abort mid-patch with misleading per-file "cleanly" messages.
   - Clean pick → the per-task commit lands.
   - Conflicts → standard unmerged stages; resolve agent-side, `git add` the resolved paths, `git cherry-pick --continue`.
   - Empty pick (delta fully subsumed by an earlier commit) → `git cherry-pick --skip`, note it in the report.
4. **Conflict resolution is agent-side, plan-contract-grounded.** The plans are the merge context a raw diff lacks — two components editing the same region is usually a planned, explicable overlap, not an accident. Read BOTH components' plan contracts (Files lists, deltas, DoDs of every unit touching each conflicted file) and construct the state both contracts describe — a plan-contract union, not a line-level union. Typical unions this set shape produces: behavior fixes re-ported into a later structural file split; a later unit's doc rewrites landing inside an earlier unit's restructured pages; a repo-wide rename swept across files the renaming component never saw (its `rg`-zero DoD defines the union). Worker ride-alongs (feedback edits to skills/guides discovered in the delta) ride the component's commit; list them in the report.
5. **Update the main-tree plan copy, unstaged** — copy the worktree's postimage of the unit file over the main-tree copy. The worktree postimage is authoritative even when the worker rewrote the contract mid-run (a fork resolved in-session supersedes the main-tree draft); land the rewrite whole and flag it in the report. When more than one component ticked the same unit, markers merge arithmetically — a box ticked in either is ticked, both evidence notes preserved.

## Step 3 — Recompute the set's `index.md` (unstaged)

After merging the set's LAST outstanding component: scan the main-tree sibling unit top markers; all `[x]` → flip `index.md`'s top marker `[ ]` → `[x]`; any `[ ]` stays `[ ]` (outstanding or refused components remain visible). A unit whose contract was rewritten mid-run also falsifies its `index.md` description line — correct the description in the same pass.

## Step 4 — Memory-ID collisions, then rebuild

Why: parallel components each saw the carried knowledge base, so a worker can allocate an ID the main tree has since taken (three parallel "100"s observed in one set).

- After each component's pick, scan the merged `memory/entries/` for duplicate numeric IDs. On collision, renumber the just-merged entry to the next free ID, record the renumber via `bun .agents/skills/memory/memory.ts log`, and `rebuild`.
- Any `memory/` change made here must land INSIDE the component's commit: `git commit --amend --no-edit` (the one amend this skill permits).
- `memory/index.md` conflicts from the pick resolve by taking ours and rebuilding — the derived index regenerates from ground truth. Prefer rename + `log` over `supersede` while duplicate IDs coexist (`supersede` resolves an ID and cannot disambiguate two live entries sharing one).

## Step 5 — Clean the worktree

`worktree.mjs clean <slug>` — a merged component's worktree and branch are spent protocol state; removal is owned here, nowhere else. A refused (incomplete) component is never cleaned: its state is the rework input.

## Step 6 — Verify the union, then report

The components were each verified green in isolation; the merged union was not. After the last component: run the package's gate (`bun coverage <pkg>`; the plugin exception for plugins — root AGENTS.md §Testing). Red → fix within the affected component's contract before reporting (the unions in Step 2.4 are the usual suspect), keeping fixes inside that component's commit.

Report per component: commit sha + subject, conflicts resolved (file + the two contracts that grounded the resolution), memory IDs renumbered, plan-contract rewrites landed, ride-alongs. Then the set summary: queue processed, `index.md` state, outstanding components remaining (if any). The review surface is the commit series — rejection is `git revert <sha>` per task; plan/index edits are unstaged and discardable.
