---
name: brain-feature
description: >
  Surface grounded enhancement ideas for a codebase or module, then hand each viable one to `brain-plan` as an evidence map. Use when asked to brainstorm, propose, or surface feature/enhancement ideas. Reads the source, tests, and docs (plus any comparison/competitive doc if present) to mine evidence-backed gaps. Every idea must cite a file, a missing test, a missing doc, or a comparison row — an idea proposed from memory is fabrication.
---

# Feature

One skill, one target at a time. Read the source, tests, and docs the target exposes (plus any comparison/competitive-analysis doc, if one exists), mine the gaps and opportunities the evidence supports, then hand each viable idea to `brain-plan` as an evidence map. Every gap must cite either a source file, a test that does not exist, a doc that does not exist, or a row in a comparison doc where a competitor/alternative has something this codebase lacks. An idea proposed from memory, without one of those citations, is fabrication — the whole point of this skill is that the ledger is grounded.

brain-feature owns **discovery** — what is missing. `brain-plan` owns **design** — how to close it. brain-feature does not write the contract or the strategy; it hands off the gap plus the evidence that lets `brain-plan` derive them without re-reading everything.

Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (an idea that requires breaking a repo convention is flagged with the specific conflict for the user to resolve — never silently smuggled into a plan; if the convention itself is stale, emit a convention-update proposal) and full blast radius (the ledger's Cost field names the actual files, tests, and docs affected, not "medium cost").

## Step 1 — Load the target

Ask the user which module/area to target; one target per invocation, no mixing. Then read, in parallel where possible:

a. The repo's conventions/guides if present (style, test, docs guides; an `AGENTS.md` conventions section) — the lens for every later decision. An idea that requires breaking a convention is flagged, never silently smuggled. Revisit the relevant section whenever an idea touches structure, tests, or docs.
b. The target's `AGENTS.md` or architecture doc, if present — stated design, future-work hints.
c. The target's `README.md` — stated purpose and public API surface.
d. The target's manifest/config (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) — dependencies, exports/entry points.
e. Every source file in the target (Glob to enumerate, then Read every source file; internal/private dirs are included).
f. Every test file — what is actually exercised.
g. Every doc file — what is actually documented.
h. The public entry/barrel (`index.ts`, `__init__.py`, `lib.rs`, etc.) — defines the public surface. This file is the arbiter of "surface change" at handoff; read it carefully.
i. The comparison/competitive-analysis doc, if one exists — the primary seed for competitor-driven ideas. If it does not exist, skip this source; do not block on it.

Internal/private dirs hold the most consequential architectural choices, and the most valuable ideas usually sit next to them — read in full. If a file is large, read it fully; truncated reads produce wrong conclusions.

## Step 2 — Build the idea ledger

Before proposing anything, record raw evidence into a ledger. Every entry has:

- **Source** — `file` (source path), `test` (test path or `missing`), `doc` (doc path or `missing`), or `comparison` (section + row in the comparison doc).
- **Anchor** — the function, type, heading, or section name where the gap lives. Not a bare line number — names survive edits. This carries through to the evidence map at handoff.
- **Observation** — what the evidence shows (a gap, an unstated assumption, a missing test, a competitor feature, an unexposed internal capability).
- **Idea** — one sentence: what could be added or changed to address the observation.
- **Scope hint** — where the gap lives, derived from the source read: `surface` (a symbol re-exported by the public entry, or a field on a public type callers pass), `internal` (private dir, not re-exported), `docs`, `config`, or `tests`. This is discovery's read of the location; `brain-plan` verifies it by re-reading the public entry.
- **Value** — High / Medium / Low, with one-sentence justification.
- **Cost** — High / Medium / Low, with one-sentence justification. Name the blast radius explicitly: the modules, files, tests, and docs affected (not "medium cost" — "touches module X + the two modules that import its types"). Unassessed blast radius means the idea is not ready for `brain-plan`.
- **Priority** — P0 / P1 / P2 / P3, derived from Value × Cost. P0 = High value, Low or Medium cost. P1 = High value with High cost, or Medium value with Low cost. P2 = Medium value with Medium or High cost, or Low value with Low cost. P3 = Low value with Medium or High cost. Present the ledger sorted by Priority, P0 first.
- **Type** — Code / Tests / Docs / Config, per the `brain-plan` skill's taxonomy.

Mine the evidence along these dimensions (skip any that do not apply):

- **Comparison gaps** — every row in the comparison doc where a competitor has a capability this codebase lacks; every honest-gap sentence; every differentiator hinting at a missing counterpart.
- **Ecosystem patterns** — what every comparable project has that this one does not (devtools, SSR, CLI, adapters, plugins). Highest-leverage features.
- **Architectural assumptions** — anything the architecture doc treats as fixed. Each assumption is an idea waiting for someone to challenge it.
- **Adjacent-module opportunities** — does this target's API compose poorly with another part of the codebase? Cross-cutting integration is often the most valuable work.

Be ruthless about dropping ideas: a weak idea that cites no evidence pollutes the `brain-plan` output, and three solid ideas beat twelve speculative ones. Merge overlapping ideas; drop any idea that cannot cite a Source from this session.

## Step 3 — Filter and prioritize with the user

Walk the ledger with the user in priority order — P0 first, then P1, P2, P3; within a priority, higher Value first. For each idea, present Source, Anchor, Observation, Idea, Scope hint, Value, Cost, Priority, and a recommended verdict:

- **Pursue** — grounded, high value, reasonable cost. Hand to `brain-plan`.
- **Defer** — grounded but low value or high cost right now. Note why in the ledger; do not plan.
- **Drop** — speculative, redundant, or contradicted by a closer reading of the source. Remove from the ledger.

`brain-plan` only writes files for confirmed ideas. If the user defers or drops everything, that is a valid outcome — say so and stop.

## Step 4 — Hand off to `brain-plan`

Ask the user which ideas to pursue, then hand each to the `brain-plan` skill as an **evidence map**. brain-feature does not write plan files itself — `brain-plan` owns the artifact contract and `brain-worker` depends on its shape. Feed `brain-plan`:

- **Target name and plan path** — where the contract should land (e.g. a `plans/` dir, if the repo uses one).
- **Gap** — the one-sentence Observation from the ledger.
- **Scope hint** — `surface` / `internal` / `docs` / `config` / `tests` from the ledger entry. This tells `brain-plan` which fork to expect, but `brain-plan` re-verifies by reading the public entry.
- **Citations** — `{ file, anchor, what-it-shows }` for every Source behind the idea. Use the Anchor field verbatim (function/type/heading names, not line numbers) so `brain-plan` can locate the gap without re-reading the whole file.
- **Comparison rows** — section + row from the comparison doc, if the idea is competitor-driven.
- **Type tag** (Code / Tests / Docs / Config) so `brain-plan` seeds the correct DoD block.

Let `brain-plan` ask its own clarifying questions before writing — do not pre-answer them. Feature ideas usually need scope narrowed (public API surface, backward compatibility, tests/docs inclusion) before they become a contract `brain-worker` can execute, and bypassing `brain-plan`'s intake produces shaky contracts.

## Step 5 — Self-check before handing off

For each idea marked **Pursue**:

a. Does every Observation cite at least one Source from this session — no memory, no fabrication?
b. Does every citation carry an Anchor (function/type/heading name), not just a file path?
c. Is the Scope hint consistent with the cited file's location (surface only if the symbol is re-exported by the public entry or sits on a consumer-passed public type)?
d. Is every Idea consistent with the conventions/guides read in Step 1?
e. Is the Type tag exactly one of Code / Tests / Docs / Config?
f. Were internal/private dirs read in full (if they exist)?
g. If a comparison doc exists, was it read in full — every features-matrix row and every honest-gap sentence?
h. Was the public entry/barrel read (the arbiter of "surface change")?
i. Did `brain-plan` ask its own clarifying questions, rather than getting pre-answered ones?

If any answer is no, fix it before handing off.
