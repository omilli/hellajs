---
name: brain-feature
description: >
  Surface grounded enhancement ideas for a codebase or module, then hand each viable one to `brain-plan` as an evidence map. Use when asked to brainstorm, propose, or surface feature/enhancement ideas. Reads the source, tests, and docs (plus any comparison/competitive doc if present) to mine evidence-backed gaps. Every idea must cite a file, a missing test, a missing doc, or a comparison row — an idea proposed from memory is fabrication.
---

# Feature

One skill, one target at a time. Read source/tests/docs the target exposes (plus any comparison doc if present), mine the gaps evidence supports, hand each viable idea to `brain-plan` as an evidence map. Every gap must cite a source file, a test that does not exist, a doc that does not exist, or a comparison row where a competitor has something this codebase lacks. An idea from memory without one of those citations is fabrication. brain-feature owns **discovery** (what's missing); `brain-plan` owns **design** (how to close it); feature does not write the contract. Governed by brain-prime.

## Step 1 — Load the target

Ask which module/area; one target per invocation. Read in parallel:

a. Repo conventions/guides if present (style, test, docs guides; `AGENTS.md` conventions) — the lens for every later decision. Revisit whenever an idea touches structure, tests, or docs.
b. Target's `AGENTS.md`/architecture doc, if present — stated design, future-work hints.
c. Target's `README.md` — stated purpose and public API surface.
d. Target's manifest/config (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) — dependencies, exports/entry points.
e. Every source file (Glob to enumerate, then Read each; internal/private dirs included).
f. Every test file — what is actually exercised.
g. Every doc file — what is actually documented.
h. Public entry/barrel (`index.ts`, `__init__.py`, `lib.rs`, etc.) — defines the public surface; arbiter of "surface change" at handoff.
i. Comparison/competitive doc, if present — primary seed for competitor-driven ideas. Absent → skip, don't block.

Internal/private dirs hold the most consequential choices and the most valuable ideas — read in full. Large file → read fully; truncated reads → wrong conclusions.

## Step 2 — Build the idea ledger

Record raw evidence before proposing. Every entry:

- **Source** — `file` | `test` (path or `missing`) | `doc` (path or `missing`) | `comparison` (section + row).
- **Anchor** — function/type/heading/section where the gap lives. Not a line number — names survive edits. Carries to the evidence map.
- **Observation** — what the evidence shows (gap, unstated assumption, missing test, competitor feature, unexposed internal capability).
- **Idea** — one sentence: what could be added/changed.
- **Scope hint** — `surface` (symbol re-exported by the public entry, or field on a public type callers pass) | `internal` (private dir, not re-exported) | `docs` | `config` | `tests`. Discovery's read of location; `brain-plan` re-verifies via the public entry.
- **Value** — High/Medium/Low + one-sentence justification.
- **Cost** — High/Medium/Low + one-sentence justification naming the blast radius explicitly (modules, files, tests, docs affected — not "medium cost" but "touches module X + the two modules that import its types"). Unassessed blast radius → not ready for `brain-plan`.
- **Priority** — P0/P1/P2/P3 from Value × Cost. P0 = High value, Low/Med cost. P1 = High value + High cost, or Med value + Low cost. P2 = Med value + Med/High cost, or Low value + Low cost. P3 = Low value + Med/High cost. Sort by Priority, P0 first.
- **Type** — Code / Tests / Docs / Config (per `brain-plan`'s taxonomy).

Mine along these dimensions (skip any that don't apply):

- **Comparison gaps** — every comparison row where a competitor has a capability this codebase lacks; every honest-gap sentence; every differentiator hinting at a missing counterpart.
- **Ecosystem patterns** — what every comparable project has that this one does not (devtools, SSR, CLI, adapters, plugins). Highest-leverage.
- **Architectural assumptions** — anything the architecture doc treats as fixed. Each is an idea waiting to be challenged.
- **Adjacent-module opportunities** — does this target's API compose poorly with another part of the codebase? Cross-cutting integration is often the most valuable work.

Be ruthless dropping: a weak idea citing no evidence pollutes `brain-plan` output; three solid ideas beat twelve speculative. Merge overlaps; drop any that cannot cite a Source from this session.

## Step 3 — Filter and prioritize with the user

Walk the ledger in priority order (P0 → P3; within a priority, higher Value first): Source, Anchor, Observation, Idea, Scope hint, Value, Cost, Priority, and a recommended verdict:

- **Pursue** — grounded, high value, reasonable cost → `brain-plan`.
- **Defer** — grounded but low value / high cost now. Note why; don't plan.
- **Drop** — speculative, redundant, or contradicted by a closer reading. Remove.

`brain-plan` only writes files for confirmed ideas. User defers/drops everything → say so, stop.

## Step 4 — Hand off to `brain-plan`

Ask which to pursue, then hand each to `brain-plan` as an **evidence map**. Feature does not write plan files — `brain-plan` owns the artifact contract. Feed it:

- **Target name + plan path** — where the contract lands (e.g. a `plans/` dir, if the repo uses one).
- **Gap** — the one-sentence Observation.
- **Scope hint** — from the ledger entry. Tells `brain-plan` which fork to expect, but it re-verifies.
- **Citations** — `{ file, anchor, what-it-shows }` for every Source. Use Anchor verbatim (names, not line numbers).
- **Comparison rows** — section + row, if competitor-driven.
- **Type tag** (Code/Tests/Docs/Config) so `brain-plan` seeds the correct DoD block.

Let `brain-plan` ask its own clarifying questions — don't pre-answer. Feature ideas usually need scope narrowed (public API surface, backward compat, tests/docs inclusion) before becoming a contract.

## Step 5 — Self-check before handing off

For each **Pursue**:

a. Every Observation cites ≥1 Source from this session — no memory, no fabrication?
b. Every citation carries an Anchor (name), not just a file path?
c. Scope hint consistent with the cited file's location (surface only if re-exported by the public entry or on a consumer-passed public type)?
d. Every Idea consistent with the conventions/guides read in Step 1?
e. Type tag exactly one of Code/Tests/Docs/Config?
f. Internal/private dirs read in full (if they exist)?
g. Comparison doc (if present) read in full — every features-matrix row and honest-gap sentence?
h. Public entry/barrel read (arbiter of "surface change")?
i. `brain-plan` asked its own clarifying questions, not pre-answered?

Any no → fix before handing off.

Run the brain-prime handoff gate; friction signals: a convention gap that blocked proposing ideas, or a target whose public surface had to be re-derived because no barrel/entry existed.
