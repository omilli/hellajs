---
name: feature
description: Generate grounded feature-enhancement ideas for a HellaJS package. Use when asked to brainstorm, propose, or surface enhancement ideas for any package. Reads ALL lib/tests/docs source plus the package's comparison doc to mine evidence-backed gaps, then hands each viable idea to the plan skill as an evidence map.
---

# Feature

One skill, one package at a time. Read every source file the package exposes plus its comparison doc, mine the gaps and opportunities the evidence supports, then hand each viable idea to the plan skill as an evidence map. Every gap must cite either a `file` in `packages/[package]/lib/`, a test that does not exist, a doc that does not exist, or a row in `[package]-comparison.md` where a competitor has something HellaJS lacks. An idea proposed from memory, without one of those citations, is fabrication — the whole point of this skill is that the ledger is grounded.

Feature owns **discovery** — what is missing. Plan owns **design** — how to close it. Feature does not write the Contract or the Strategy; it hands off the gap plus the evidence that lets plan derive them without re-reading everything.

## Non-negotiables

Two rules govern this skill absolutely. They exist because the project's end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if every skill treats the guides as inviolable and every change as carrying its full blast radius.

**Guides are inviolable.** Every idea this skill proposes is checked against the three guides read in Step 1. An idea that requires breaking a guide is flagged with the specific conflict for the user to resolve — never silently smuggled into a plan. If the conflict reflects a guide that is wrong or stale, emit a **guide-update proposal** (`guides/{file}.md` §{section} + the rule quoted + the conflict + the proposed edit with reasoning) and let the user decide case by case. Proceeding past an unresolved conflict is silent deviation, and silent deviation is how uniformity dies.

**Every change carries its full blast radius.** Before handing off an idea, account for every downstream effect: the tests that must pin the new behavior, the docs that must publish it, cross-package consumers of any changed signature, and backward compatibility. The ledger's Cost field names this blast radius explicitly — not "medium cost" but the actual files and packages affected. An idea whose blast radius is unassessed is not ready for plan.

## Step 1 — Load the package

Ask the user which package to target; one package per invocation, no mixing. Then read, in parallel where possible:

a. `./guides/code.md`, `./guides/tests.md`, `./guides/docs.md` — the lens for every later decision. An idea that requires breaking a guide is flagged with the specific conflict for the user to resolve, never silently smuggled into a plan. Revisit the relevant section whenever an idea touches code structure, test conventions, or doc formatting.
b. `packages/[package]/AGENTS.md` — architectural ground truth, stated design, future-work hints.
c. `packages/[package]/README.md` — stated purpose and public API surface.
d. `packages/[package]/package.json` — dependencies, peer deps, exports map.
e. Every file under `packages/[package]/lib/` — the implementation (Glob to enumerate, then Read every `.ts` / `.tsx` / `.js` file; `lib/internal/` is included).
f. Every file under `packages/[package]/tests/` — what is actually exercised.
g. Every file under `packages/[package]/docs/` — what is actually documented.
h. `packages/[package]/index.ts` — the barrel that defines the public surface. This file is the arbiter of "surface change" at handoff; read it carefully.
i. `packages/[package]/[package]-comparison.md` — the curated gap analysis vs competitors, and the primary seed for competitor-driven ideas. If it does not exist, stop and tell the user to run the comparison skill first.

`lib/internal/` holds the most consequential architectural choices, and the most valuable ideas usually sit next to them — read it in full. If a file is large, read it fully; truncated reads produce wrong conclusions.

## Step 2 — Build the idea ledger

Before proposing anything, record raw evidence into a ledger. Every entry has:

- **Source** — `file` (lib path), `test` (test path or `missing`), `doc` (doc path or `missing`), or `comparison` (section + row in `[package]-comparison.md`).
- **Anchor** — the function, type, heading, or section name where the gap lives. Not a bare line number — names survive edits. This carries through to the evidence map at handoff.
- **Observation** — what the evidence shows (a gap, an unstated assumption, a missing test, a competitor feature, an unexposed internal capability).
- **Idea** — one sentence: what could be added or changed to address the observation.
- **Scope hint** — where the gap lives, derived from the source read: `surface` (a symbol re-exported by `index.ts`, or a field on a public type consumers pass), `internal` (lib/internal, not re-exported), `docs`, `config`, or `tests`. This is discovery's read of the location; plan verifies it by re-reading `index.ts`. Getting this right at discovery time saves plan a round-trip — feature has already read the file and knows whether the gap is in a public type or an internal helper.
- **Value** — High / Medium / Low, with one-sentence justification.
- **Cost** — High / Medium / Low, with one-sentence justification. Name the blast radius explicitly: the packages, files, tests, and docs affected (not "medium cost" — "touches `resource` + the two packages that import its types"). Unassessed blast radius means the idea is not ready for plan.
- **Priority** — P0 / P1 / P2 / P3, derived from Value × Cost. P0 = High value, Low or Medium cost. P1 = High value with High cost, or Medium value with Low cost. P2 = Medium value with Medium or High cost, or Low value with Low cost. P3 = Low value with Medium or High cost. Present the ledger sorted by Priority, P0 first.
- **Type** — Code / Tests / Docs / Config, per the plan skill's taxonomy.

Mine the evidence along these dimensions (skip any that do not apply):

- **Comparison gaps** — every row in the comparison's Built-in Features Matrix where HellaJS lacks a capability a competitor has; every honest-gap sentence in the Bottom Line; every differentiator paragraph hinting at a missing counterpart.
- **Ecosystem patterns** — what every competitor in the comparison doc has that HellaJS does not (devtools, SSR, suspense, form management, persistence adapters, time-travel debugging). Highest-leverage features.
- **Architectural assumptions** — anything the AGENTS.md treats as fixed ("no SSR", "no async scheduler", "client-only"). Each assumption is an idea waiting for someone to challenge it.
- **Adjacent package opportunities** — does this package's API compose poorly with another HellaJS package? Cross-package integration is often the most valuable work.

Be ruthless about dropping ideas: a weak idea that cites no evidence pollutes the plan output, and three solid ideas beat twelve speculative ones. Merge overlapping ideas; drop any idea that cannot cite a Source from this session.

## Step 3 — Filter and prioritize with the user

Walk the ledger with the user in priority order — P0 first, then P1, P2, P3; within a priority, higher Value first. For each idea, present Source, Anchor, Observation, Idea, Scope hint, Value, Cost, Priority, and a recommended verdict:

- **Pursue** — grounded, high value, reasonable cost. Hand to the plan skill.
- **Defer** — grounded but low value or high cost right now. Note why in the ledger; do not plan.
- **Drop** — speculative, redundant, or contradicted by a closer reading of the source. Remove from the ledger.

The plan skill only writes files for confirmed ideas. If the user defers or drops everything, that is a valid outcome — say so and stop.

## Step 4 — Hand off to the plan skill

Ask the user which ideas to pursue, then hand each to the `/plan` skill (`.agents/skills/plan/SKILL.md`) as an **evidence map**. Feature does not write plan files itself — plan owns the artifact contract and the worker skill depends on its shape. Feed plan:

- **Package name and target path**: `./plans/[package]-features/[feature-name].md` for a single idea, or `./plans/[package]-features/[plan-name].md` for a tightly coupled group.
- **Gap** — the one-sentence Observation from the ledger.
- **Scope hint** — `surface` / `internal` / `docs` / `config` / `tests` from the ledger entry. This tells plan which fork to expect, but plan re-verifies by reading `index.ts`.
- **Citations** — `{ file, anchor, what-it-shows }` for every Source behind the idea. Use the Anchor field verbatim (function/type/heading names, not line numbers) so plan can locate the gap without re-reading the whole file.
- **Comparison rows** — section + row from `[package]-comparison.md`, if the idea is competitor-driven.
- **Type tag** (Code / Tests / Docs / Config) so plan seeds the correct DoD block.

Let plan ask its own clarifying questions before writing — do not pre-answer them. Feature ideas usually need scope narrowed (public API surface, backward compatibility, tests/docs inclusion) before they become a contract the worker skill can execute, and bypassing plan's Phase 0 produces shaky contracts. Plan's Phase 2 derives the Contract (Files, delta, scenarios, doc placement) by applying the guides to these citations — that is plan's job, not feature's.

## Step 5 — Self-check before handing off

For each idea marked **Pursue**:

a. Does every Observation cite at least one Source from this session — no memory, no fabrication?
b. Does every citation carry an Anchor (function/type/heading name), not just a file path?
c. Is the Scope hint consistent with the cited file's location (surface only if the symbol is re-exported by `index.ts` or sits on a consumer-passed public type)?
d. Is every Idea consistent with the three guides read in Step 1?
e. Is the Type tag exactly one of Code / Tests / Docs / Config?
f. Was `lib/internal/` read in full (if it exists)?
g. Was `[package]-comparison.md` read in full, including every features-matrix row and every Bottom Line gap?
h. Was `index.ts` read (the arbiter of "surface change")?
i. Did the plan skill ask its own clarifying questions, rather than getting pre-answered ones?

If any answer is no, fix it before handing off.
