---
name: feature
description: >
  Surface grounded enhancement ideas for a codebase or module, then hand each viable one to `plan` as an evidence map. Use when asked to propose or surface feature/enhancement ideas, or to mine a codebase for what's missing. Reads the source, tests, and docs (plus a comparison/competitive doc if present) to mine evidence-backed gaps. Every idea must cite a file, a missing test, a missing doc, or a comparison row — an idea proposed from memory is fabrication.
---

# Feature

One skill, one target at a time. Read what the target exposes, mine the gaps evidence supports, hand each viable idea to `plan` as an evidence map. Every gap must cite a source file, a test that does not exist, a doc that does not exist, or a comparison row where a competitor has something this package lacks. An idea from memory without one of those citations is fabrication. feature owns **discovery** (what's missing); `plan` owns **design** (how to close it). Governed by prime.

## Step 1 — Load the target

Ask which module/area; one target per invocation. Read in parallel:

a. Root AGENTS.md (§Style guides, §Testing) + the target package's `AGENTS.md` — the lens for every later decision. Revisit whenever an idea touches structure, tests, or docs.
b. Target's `README.md` + `docs/` (`api/`, `concepts/`, `patterns/`, `index.mdx`) — stated purpose and the documented contract (docs are the public contract; AGENTS.md is internals — §Packages).
c. `package.json` — dependencies, exports, entry points.
d. Every `lib/` source file, `lib/internal/` included — the most consequential choices live there. Bounded slices for large files; truncated reads → wrong conclusions.
e. Every `tests/` file — what is actually exercised.
f. `lib/index.ts` barrel — the public surface; arbiter of "surface change" at handoff.
g. `{pkg}-comparison.md` — primary seed for competitor-driven ideas: every row where a competitor has a capability this package lacks, every honest-gap sentence, every differentiator hinting at a missing counterpart. Absent → skip, don't block.
h. `memory/index.md` — grep the target's symbols; prior verified decisions bound what's worth proposing.

## Step 2 — Build the idea ledger

Record raw evidence before proposing. Every entry:

- **Source** — `file` | `test` (path or `missing`) | `doc` (path or `missing`) | `comparison` (section + row).
- **Anchor** — function/type/heading/section where the gap lives. Not a line number — names survive edits. Carries to the evidence map.
- **Observation** — what the evidence shows (gap, unstated assumption, missing test, competitor feature, unexposed internal capability).
- **Idea** — one sentence: what could be added/changed.
- **Scope hint** — `surface` (re-exported by `lib/index.ts`, or a field on a public type callers pass) | `internal` (not re-exported) | `docs` | `config` | `tests`. Discovery's read of location; `plan` re-verifies against the barrel.
- **Value** — High/Medium/Low + one-sentence justification.
- **Cost** — High/Medium/Low + one-sentence justification naming the blast radius explicitly (modules, files, tests, docs affected — not "medium cost" but "touches `lib/cache.ts` + the two modules importing its types").
- **Priority** — P0/P1/P2/P3 from Value × Cost. P0 = High value, Low/Med cost. P1 = High value + High cost, or Med value + Low cost. P2 = Med value + Med/High cost, or Low value + Low cost. P3 = Low value + Med/High cost. Sort by Priority, P0 first.
- **Type** — Code / Tests / Docs / Config.

Mine along these dimensions (skip any that don't apply):

- **Comparison gaps** — every competitor-has/lacks row (dimension g). A pursued idea that adds competitor-behavior cells to the comparison doc cites the competitor source per cell or routes the row through the `comparison` skill (§Folder structure) — workers without web access cannot fill them.
- **Ecosystem patterns** — what every comparable reactive/DOM-framework package has that this one does not (devtools, SSR adapters, CLIs). Highest-leverage.
- **Architectural assumptions** — anything the package's `AGENTS.md` treats as fixed. Each is an idea waiting to be challenged.
- **Adjacent-module opportunities** — does this target's API compose poorly with another `@hellajs/*` package? Cross-package integration is often the most valuable work.

Be ruthless dropping: a weak idea citing no evidence pollutes `plan` output; three solid ideas beat twelve speculative. Merge overlaps; drop any that cannot cite a Source from this session.

## Step 3 — Filter and prioritize with the user

Walk the ledger in priority order (P0 → P3; within a priority, higher Value first): Source, Anchor, Observation, Idea, Scope hint, Value, Cost, Priority, and a recommended verdict:

- **Pursue** — grounded, high value, reasonable cost → `plan`.
- **Defer** — grounded but low value / high cost now. Note why; don't plan.
- **Drop** — speculative, redundant, or contradicted by a closer reading. Remove.

`plan` only writes files for confirmed ideas. User defers/drops everything → say so, stop.

## Step 4 — Hand off to `plan`

Ask which to pursue, then hand each to `plan` as an **evidence map**. Feature does not write plan files — `plan` owns the artifact contract. Feed it:

- **Target name + plan path** — `plans/<package>/<category>/<topic>/` (categories observed: `code`, `docs`, `misc`, `config`).
- **Gap** — the one-sentence Observation.
- **Scope hint** — from the ledger entry. Tells `plan` which fork to expect, but it re-verifies.
- **Citations** — `{ file, anchor, what-it-shows }` for every Source. Use Anchor verbatim (names, not line numbers).
- **Comparison rows** — section + row, if competitor-driven.
- **Type tag** (Code/Tests/Docs/Config) so `plan` seeds the correct DoD block.

Let `plan` ask its own clarifying questions — don't pre-answer. Feature ideas usually need scope narrowed (public API surface, backward compat, tests/docs inclusion) before becoming a contract.

## Step 5 — Self-check before handing off

For each **Pursue**: every Observation cites Source + Anchor from this session (no memory, no fabrication); scope hint matches the cited file's actual location (surface only if re-exported by `lib/index.ts` or on a consumer-passed public type); Type tag exactly one of Code/Tests/Docs/Config; `lib/internal/` and the comparison doc (if present) read in full; `plan` asked its own clarifying questions, not pre-answered. Any gap → fix before handing off.

Run the prime handoff gate; friction signals: convention gap that blocked proposing ideas → `feedback` (skill should handle absent conventions more explicitly); target whose public surface had to be re-derived because the barrel was non-obvious → `memory` (recallable fact about this codebase's structure).
