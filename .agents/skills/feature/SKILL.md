---
name: feature
description: Generate grounded feature-enhancement ideas for a HellaJS package. Use when asked to brainstorm, propose, or surface enhancement ideas for any package. Reads ALL lib/tests/docs source plus the package's comparison doc to mine evidence-backed gaps and opportunities, then hands off to the plan skill to write each idea as a plan document under ./plans/[package]-features/.
---

# Feature

One skill, one package at a time. Read every source file the package exposes plus its comparison doc, mine the gaps and opportunities the evidence supports, then hand each viable idea to the plan skill to write as a plan document. Never propose an idea from memory — every gap must cite either a `file` in `packages/[package]/lib/`, a test that doesn't exist, a doc that doesn't exist, or a row in `[package]-comparison.md` where a competitor has something HellaJS lacks.

## Step 1 — Load the package

Ask the user which package to target. One package per invocation — do not mix. Then read, in this exact order, and in parallel where possible:

a. `./guides/code.md`, `./guides/tests.md`, `./guides/docs.md` — the project style guides, in full. These are the lens for every later decision: every Observation, Idea, and Definition of Done item must be consistent with these guides. An idea that requires breaking a guide is flagged with the specific guide conflict for the user to resolve — it is never silently smuggled into a plan. Revisit the relevant guide section whenever an idea touches code structure, test conventions, or doc formatting.
b. `packages/[package]/AGENTS.md` — architectural ground truth, stated design, future-work hints.
c. `packages/[package]/README.md` — stated purpose and public API surface.
d. `packages/[package]/package.json` — dependencies, peer deps, exports map.
e. Every file under `packages/[package]/lib/` — the actual implementation (use Glob to enumerate, then Read every `.ts` / `.tsx` / `.js` file. `lib/internal/` is included, non-negotiable).
f. Every file under `packages/[package]/tests/` — what is actually exercised.
g. Every file under `packages/[package]/docs/` — what is actually documented.
h. `packages/[package]/[package]-comparison.md` — the curated gap analysis vs competitors. If this file does not exist, stop and tell the user to run the comparison skill first. The comparison doc is the primary seed for competitor-driven ideas.

Do not skip `lib/internal/`. The most consequential architectural choices live there, and the most valuable feature ideas usually sit next to them. If a file is large, read it fully — truncated reads produce wrong conclusions.

## Step 2 — Build the idea ledger

Before proposing anything, record raw evidence into a ledger. Every ledger entry has:

- **Source** — `file` (lib path), `test` (test path or `missing`), `doc` (doc path or `missing`), or `comparison` (section + row in `[package]-comparison.md`).
- **Observation** — what the evidence shows (a gap, an unstated assumption, a missing test, a competitor feature, an unexposed internal capability).
- **Idea** — one sentence: what could be added or changed to address the observation.
- **Value** — High / Medium / Low, with one-sentence justification.
- **Cost** — High / Medium / Low, with one-sentence justification (file blast radius, new deps, breaking change risk).
- **Priority** — P0 / P1 / P2 / P3, derived from Value × Cost. P0 = High value with Low or Medium cost. P1 = High value with High cost, or Medium value with Low cost. P2 = Medium value with Medium or High cost, or Low value with Low cost. P3 = Low value with Medium or High cost. The ledger is sorted by Priority (P0 first) when presented to the user.
- **Type** — Code / Tests / Docs / Config, per the plan skill's taxonomy.

Mine the evidence along these dimensions (skip any that do not apply to the package):

- **Comparison gaps** — every row in the comparison's Built-in Features Matrix where HellaJS lacks a capability a competitor has. Every "honest gap" sentence in the Bottom Line section. Every differentiator paragraph that hints at a missing counterpart.
- **Untested public surface** — every exported symbol in `index.ts` (and re-exports) that has no test file or no behavior assertion. Untested means either unimportant (delete candidate) or important but missing (feature candidate).
- **Undocumented public surface** — every exported symbol with no doc file. Documentation gaps are feature opportunities in disguise: the capability exists, but no one knows how to use it.
- **Internal capabilities not exposed** — anything in `lib/internal/` that could be promoted to a stable public export. The internals often contain primitives one step away from a public feature.
- **Ecosystem patterns** — what every competitor in the comparison doc has that HellaJS does not (e.g., devtools, SSR, suspense, form management, persistence adapters, time-travel debugging). These are the highest-leverage features.
- **Architectural assumptions** — anything the AGENTS.md treats as fixed (e.g., "no SSR", "no async scheduler", "client-only"). Each assumption is a feature idea waiting for someone to challenge it.
- **Adjacent package opportunities** — does this package's API surface compose poorly with another HellaJS package? Cross-package integration is often the most valuable work.

Be ruthless about dropping ideas. A weak idea that cites no evidence pollutes the plan output. Better to ship three solid ideas than twelve speculative ones. If two ideas overlap, merge them; if an idea cannot cite a Source from this session, drop it.

## Step 3 — Filter and prioritize with the user

Walk the ledger with the user in priority order — P0 first, then P1, P2, P3. Within the same priority, higher Value first. For each idea, present: Source, Observation, Idea, Value, Cost, Priority. Recommend a verdict:

- **Pursue** — grounded, high value, reasonable cost. Hand to the plan skill.
- **Defer** — grounded but low value or high cost right now. Note why in the ledger; do not plan.
- **Drop** — speculative, redundant, or contradicted by closer reading of the source. Remove from the ledger.

Do not write plan files for deferred or dropped ideas. The plan skill only writes files for ideas the user confirms as **Pursue**. If the user asks to defer or drop everything, that is a valid outcome — say so and stop.

## Step 4 — Hand off to the plan skill

For every idea the user marks **Pursue**, load the plan skill (`.agents/skills/plan/SKILL.md`) and feed it:

- The package name and target path: `./plans/[package]-features/[feature-name].md` (single idea) or `./plans/[package]-features/[plan-name]/[feature-name].md` (tightly coupled group of ideas).
- The idea ledger entry as the scope.
- The Type tag (Code / Tests / Docs / Config) so plan seeds the correct Definition of Done block.
- The cited evidence so the plan's Solution section grounds every decision in source.

Let the plan skill ask its own clarifying questions before writing. Do not bypass plan's "Before writing" step — feature ideas often need scope narrowed (public API surface, backward compatibility, tests/docs inclusion) before they become a contract the worker skill can execute.

If the user confirms multiple ideas, plan writes one file per idea (the multi-task plan structure from `.agents/skills/plan/TEMPLATE.md`). The plan skill's hard rules (no numbered lists, no digits in filenames, binary DoD items, `[ ]` / `[x]` as the only markers) apply — feature does not override them.

## Step 5 — Self-check before handing off

For each idea marked **Pursue**, verify:

a. Does every Observation cite at least one Source from this session (no memory, no fabrication)?
b. Did I read `./guides/code.md`, `./guides/tests.md`, and `./guides/docs.md` in full before recording any ledger entry, and does every Idea remain consistent with them?
c. Is the Type tag exactly one of Code / Tests / Docs / Config?
d. Did I read `lib/internal/` in full if it exists?
e. Did I read the `[package]-comparison.md` in full, including every row of the features matrix and every gap in the Bottom Line?
f. Did I let the plan skill ask its own clarifying questions, rather than pre-answering them?

If any answer is no, do not hand off — fix it first.

## Hard rules

- Never propose an idea you cannot point to in source, tests, docs, or the comparison doc.
- One package per invocation.
- Never write plan files directly. The plan skill writes them — feature only feeds it evidence and scope.
- Never override the plan skill's template, naming, or Definition of Done rules.
- Do not propose ideas that contradict `./guides/code.md`, `./guides/tests.md`, or `./guides/docs.md`. If an idea requires breaking a guide, flag the guide conflict explicitly and let the user decide.
- No emojis.
