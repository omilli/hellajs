---
name: merge
description: >
  Merge a plan set's outstanding component worktrees back to the main tree. Use when asked to merge this plan set's outstanding components, when component worktrees are delivered for merge (worker runs end "delivered for merge"), or when applying completed per-component worktrees. One batch per plan set: queue derivation from carried plan state, script-owned 3-way apply with agent-side, plan-contract-grounded conflict resolution, set-aggregate recompute, memory-ID collision handling, worktree cleanup. Everything lands uncommitted — the user's diff review is the single human checkpoint.
---

# Merge

Apply a plan set's outstanding component worktrees to the main tree. The batch is **per plan set**: the carried plans of one set are the complete merge context — queue order, conflict resolution, and completeness all draw on them; cross-set batching has no plan authority to arbitrate with. Everything lands **uncommitted**: the user reviews exactly one diff per component (the never-commit rule holds; rejection = revert).

Mechanics are script-owned (`bun .agents/skills/worker/scripts/worktree.mjs` — `list`, `status`, `diff`, `apply`, `clean`); this skill adds the judgment the script must never have: queue order, completeness and overlap checks, conflict resolution, memory-ID collisions. The script stays mechanical by design — it surfaces a conflict and stops; resolution authority lives here.

## Step 0 — Enumerate and derive the queue (per plan set)

Why a derived queue: multiple component worktrees of one set commonly touch one package; merging by hand one-by-one and resolving markers ad hoc is exactly the struggle this skill removes.

1. `worktree.mjs list` — every protocol worktree with its carried plan folder (`plans=`).
2. Group by set folder. The target set is the one named in the request; several outstanding sets → one invocation per set, in whatever order the user names.
3. Derive the queue from plan state:
   - Main-tree top markers `[x]` mean already merged — the main tree is the merged-state record, so a component whose units are all `[x]` in the main tree is skipped, never re-applied.
   - File-overlapping components (plan Files lists intersect beyond the carry-set — the plan-set folder and `memory/` are protocol-owned shared state, excluded) order by ascending first unit; deterministic and it matches the set's own sequencing intent.
   - Disjoint components are order-free.
4. Report the queue before merging anything: per component its slug, first unit, and overlap note. An empty queue (nothing outstanding) is reported and exits clean.

## Step 1 — Pre-apply checks (per component)

Why before apply: an incomplete component would strand the checkpoint, and an out-of-order overlap is a queue bug to surface, not paper over.

- **Completeness** — every unit of the component reads `[x]` in the WORKTREE copy of its plan file. Incomplete → refuse to apply, report it for plan rework, leave the worktree standing (its partial state is the rework input; do not clean it).
- **Overlap vs already-merged siblings** — intersect the component's plan Files lists with the merged siblings' (carry-set excluded). Overlap in ascending-first-unit order is expected: proceed, the conflict path owns the resolution. Overlap whose merged sibling has the GREATER first unit is an ordering violation — stop and report rather than guess.

## Step 2 — Apply (script-owned) and resolve conflicts (agent-side)

`bun .agents/skills/worker/scripts/worktree.mjs apply <slug>` — default target is the main repo root.

- Clean apply → the component's delta lands in the main tree. Staged-but-uncommitted is fine; nothing here commits.
- The script exits non-zero on conflict and reports the file(s). It never silently resolves, never partially applies quietly.

**Conflict resolution (agent-side, plan-contract-grounded).** Why agent-side: the plans are the merge context a raw diff lacks — two components editing the same region is usually a planned, explicable overlap, not an accident.

1. Read BOTH components' plan contracts — the Files lists, deltas, and DoDs of every unit touching each conflicted file.
2. Resolve semantically: construct the state both contracts describe (a plan-contract union, not a line-level union). Plan-file tick markers merge arithmetically — a box ticked in either component is ticked, with both evidence notes preserved.
3. Strip conflict markers, land the resolved result uncommitted.
4. The user's review of the final diff is the checkpoint; rejection = revert.

## Step 3 — Recompute the set's `index.md`

Why here and not in any worktree: every worktree carried a stale shared copy of `index.md`, so the set aggregate is deterministic derivation from merged state, never itself merged.

After applying the set's LAST outstanding component: scan the main-tree sibling unit top markers; all `[x]` → flip `index.md`'s top marker `[ ]` → `[x]`; any `[ ]` stays `[ ]` (outstanding or refused components remain visible).

## Step 4 — Memory-ID collisions, then rebuild

Why: parallel components each saw the carried knowledge base, so `memory.ts add` can allocate the same next ID in two trees.

- After applying, scan the merged `memory/entries/` for duplicate numeric IDs. On collision, renumber the later-queued component's entry: allocate the next ID, carry the content over, retire the duplicate via `bun .agents/skills/memory/memory.ts supersede <dup> <new>`.
- Any `memory/` files merged → `bun .agents/skills/memory/memory.ts rebuild` (an applied `index.md` copy can lag the merged entries; the derived index regenerates from ground truth).

## Step 5 — Clean the worktree

`worktree.mjs clean <slug>` — a merged component's worktree and branch are spent protocol state; removal is owned here, nowhere else. A refused (incomplete) component is never cleaned: its state is the rework input.

## Step 6 — Report

Per component: files applied (summary), conflicts resolved (file + the two contracts that grounded the resolution), memory IDs renumbered, worktree cleaned. Then the set summary: queue processed, `index.md` state, outstanding components remaining (if any). Remind the user everything landed uncommitted — the diff review is the checkpoint.
