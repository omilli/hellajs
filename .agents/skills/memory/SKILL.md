---
name: memory
description: Curate durable knowledge into a progressive-disclosure memory system. Single writer for memory/ — all other skills read. Critically filters findings before persisting - not everything deserves an entry. Entries earn their place by affecting future runs.
---

# Memory

Curate durable knowledge. Single writer for `memory/` — every other skill reads. Progressive disclosure: `INDEX.md` is the scannable summary (one line per entry); `entries/[tag].md` files are the detail (8-15 lines each). An agent scans the index, then deep-dives only into relevant entries. Total token cost per session: ~500-800.

## Non-negotiables

Two rules govern this skill absolutely.

**Guides are inviolable.** A memory entry never contradicts a guide. If a finding reflects a guide gap, it is a guide-update proposal, not a memory entry. Memory captures decisions and rationale the guides and skills don't already encode — it does not shadow or override them.

**Every change carries its full blast radius.** A memory entry is read by future agents making decisions. A stale or misleading entry is worse than no entry — it sends a future agent down the wrong path. Entries are therefore conservative, precise, and pruned aggressively when they stop applying.

## Step 1 — Receive

Get findings from any source:

- **Feedback handoff** — proposals and their outcomes from a feedback run. The primary source.
- **User direct** — "remember that..." or "note that..."
- **Skill handoff** — any skill can hand off an observation worth persisting.

Each finding arrives as: what happened, what was decided, and the outcome (accepted/rejected/deferred).

## Step 2 — Critically analyze (the filter)

For each finding, ask in order:

1. **Will this affect a future run?** If no — drop. A one-off fix that will never recur doesn't need memory.
2. **Is it already captured in a durable file?** Check AGENTS.md, guides, SKILL.md files. If the knowledge is already there — create a pointer entry (3-5 lines referencing the file + section + one-sentence why), or drop entirely if trivially findable.
3. **Does a similar entry exist?** Read `memory/INDEX.md`. If yes — update the existing entry, don't create a duplicate.
4. **Is the rationale non-obvious?** The decision itself is in the git diff. The WHY is what memory preserves. If the why is trivial ("the guide said so") — drop.

This filter is the difference between curated memory and a dump. Most findings will NOT become entries. A typical feedback run with 5 proposals might produce 2-3 memory entries.

## Step 3 — Write

For each finding that passes the filter:

1. Pick a tag: short kebab-case topic identifier. This IS the filename — make it descriptive enough that `ls entries/` alone tells you what it's about. If a similar tag already exists, refine it (e.g., `plan-surface-detection` vs `plan-multi-task`).
2. Create `memory/entries/[tag].md`:
   ```
   # [descriptive title]

   **Date:** YYYY-MM-DD
   **Type:** decision | rejection | preference | pattern | friction
   **Source:** [what run/conversation produced this]
   **Lives in:** [file + section where the decision is encoded, if applicable]

   ## [Decision | Observation | Rejection]
   [1-2 sentences: what was decided/observed]

   ## Why
   [2-3 sentences: why this choice over alternatives. The non-obvious rationale.]
   ```
3. Insert one line into `memory/INDEX.md` at the correct position (not a blind append):
   ```
   [date] [type] [tag] [one-line summary]
   ```
   Sort order: system-wide entries first (governance, protocols, structure), then by skill (audit, feedback, plan, worker, ...), then by recency within each group. The first 2-3 lines should always be the most foundational decisions — what a new session needs to know first.

**INDEX date lifecycle:** The date starts as the creation date. When ANY skill reads an entry during normal work and the entry influences a decision (a "hit"), update the INDEX date to today — one-line edit. This is rare and cheap, and it makes the date a dual signal: recent = recently useful AND likely still accurate; old = prune candidate. The entry file's `**Date:**` field always preserves the original creation date.

## Step 4 — Prune and verify

Before writing new entries, scan INDEX.md for entries with dates older than 90 days. For each:

1. **Reference check:** Read the entry's `**Lives in:**` field. `grep` the target file for the referenced section. If the section is gone (renamed, removed, or the decision was reversed), prune immediately — the entry is actively misleading.
2. **Never-hit check:** If the INDEX date still equals the creation date (never updated = never influenced a decision since creation), re-read the entry. Still accurate? Update the date. No longer accurate? Prune.
3. **Re-verify:** If the date was updated at some point (entry was useful before) but is now old, re-verify accuracy against the source. Update date if accurate, prune if not.

**Friction entries** older than 60 days that never recurred — prune. One-off friction that didn't become a pattern doesn't deserve permanent memory.

**Pattern entries** where the pattern stopped (skill was fixed, friction stopped) — convert to a decision pointing to the fix, or prune.

**Never prune `rejection` entries** — permanent regardless of date or reference status.

If INDEX.md exceeds 50 lines after pruning, prune more aggressively (friction entries first, then old decisions with no hits).

## Self-check

a. Did I filter aggressively? Most findings should NOT become entries.
b. Did I check INDEX.md for duplicates before creating?
c. Is each entry's rationale non-obvious? (If the why is trivial, the entry shouldn't exist.)
d. Is INDEX.md under 50 lines? If not, prune more.
e. Did I prune stale entries (reference check + never-hit check) before appending new ones?
f. For entries I read this run that influenced a decision — did I update their INDEX dates (hits)?
