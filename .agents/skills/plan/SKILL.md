---
name: plan
description: >
  Lay out a plan — one or more tracked, verifiable contracts (files to touch, binary Definitions of Done, blast radius, hard inter-file deps) — before executing non-trivial work. Use when work spans multiple steps or files, when you want a reviewable spec before implementation, or when handed evidence maps from discovery (idea/audit/critic/feature). Produces one file per independently-shippable unit. Use ONLY for non-trivial work; a one-line fix skips planning entirely.
---

# Plan

Turn a goal — or evidence map(s) from discovery — into plan files: contracts `worker` executes by ticking `[ ]` to `[x]`. One file = one independently-shippable unit; inter-dependent units declare it in frontmatter (`depends_on`). plan produces the artifact; `worker` executes it; `idea` may precede (decide *what* before *how*). Governed by prime.

## Escape hatch

Single obvious edit → no plan. Make the change, verify, stop. Don't formalize trivia.

## Phase 0 — Intake

Plain goal or evidence map(s). An evidence map carries: **Gap** (one sentence, phrased as what will be true), **Scope hint** (`surface`/`internal`/`docs`/`config`/`tests` — plan re-verifies `surface`, never trusts the hint), **Citations** (`{ file, anchor, what-it-shows }`; anchors are function/type/heading names, never line numbers), **Type tag** (Code/Tests/Docs/Config). Scope/citations missing → ask; don't plan into fog — every open question becomes a wrong assumption.

## Phase 1 — Decompose into shippable units

**One file = one independently-shippable unit**: lands and reverts alone with the repo green and coherent. Blast-radius boundary = split boundary.

- Cluster by shared blast radius: same files, or one incorrect without the other = ONE unit. Independent radii = SEPARATE units.
- A Surface:yes change's Code+Tests+Docs (Phase 2) are one atomic unit — never split.
- Don't over-split (units that must land atomically = one) or under-split (many tasks glued in one file = distinct units — split so each tracks/reviews/reverts independently).
- Trivia → escape hatch, not a file.

Outcome: 1..N units. N=1 → Phases 2–5 once. N>1 → Phases 2–4 per unit, sibling files in one `plans/<package>/<category>/<topic>/` folder; Phase 5 stitches with deps; Phase 6 writes the set `index.md`.

## Phase 2 — Surface fork (per unit)

Does the work change a package's public surface (exported symbol, field on a caller-passed type, consumed signature, documented behavior)? Read the surface, don't guess:

- Package barrel `packages/<pkg>/lib/index.ts` — the export arbiter and docs barrel.
- dom's typed-surface mirror: `lib/types/nodes.d.ts` + `lib/types/attributes.d.ts` mirror one contract, no import edge — widen both or neither.
- Plugin entries `plugins/<p>/index.mjs`.
- Documented behavior is surface even when types don't move — docs and `{pkg}-comparison.md` describe the contract callers learn.

`yes` → Code + Tests + Docs land together as one atomic unit. A `yes` Docs view may land as a cited no-change conclusion: when the fix makes code match docs already stating the target contract, the view cites those doc files (worker verifies the citations) instead of authoring ceremony. `no` → one task of the matching type; Tests/Docs views still appear, justifying absence with a cited reason. No public-surface notion (scripts, agent config, tooling) → Surface `no` by definition.

## Phase 3 — Contract crystallization

Derive each artifact from the project's own rules (guides, lint, config conventions), not authorial intuition:

- **Files** — each file to touch, with a content anchor (function/type/heading + relative position), never a line number.
- **Change/delta** — for Surface:yes, the exact signature/shape change + one runnable usage example (if you can't write the call, the design is wrong; the example seeds the Docs task). A delta clause citing repo style or convention carries the measurement that produced it (the `rg` over the package) — an unmeasured style claim inverts silently.
- **State-wiring deltas** — when a delta attaches state (scope, dispose fn, handler, cleanup) to a DOM node, name the carrier's two properties, verified against the owning code: cleanup eligibility (the removal walk actually discovers state on that node kind) and lifetime (the carrier outlives the code being written). Both live outside the delta's own lines; a green typecheck says nothing about them.
- **Behavioral scenarios** (if tests in scope) — one behavior per scenario, phrased as one test, so `worker` transcribes without re-deciding structure.
- **Doc updates** (if docs in scope) — owning file/section + the content extending it.
- **DoD** — binary items, exhaustive mirror of the contract: every Files entry, scenario, doc update, and delta line → a DoD item. Nothing goes unchecked.

**The DoD trap list** (root AGENTS.md §Core rules points here; this is the authoritative enumeration):

1. **Runnable check, never predicted result.** Each item states a command or verifiable inspection, not an outcome prophecy.
2. **No unverified characterization.** Never append "zero violations" / "no false positives" / "passes on the corpus" for an artifact not yet run — it biases the worker toward confirmation. A load-bearing characterization becomes its own falsifiable DoD check.
3. **Type premises get a probe.** A delta premised on type-system behavior (how a mapping, overload, or inference resolves) carries a throwaway `tsc` probe run before the contract is written — deleted after, assertions cited in Strategy. An unprobed type premise reads as fact until a worker's tsc disproves it mid-execution.
4. **Tiered tools scope to the enforced tier.** A DoD over a tiered tool (`doc-snippets`) scopes the promise to the enforced tier or names the tolerated informational class from a probe run — "no errors attributed to X" is unsatisfiable when the informational tier structurally carries benign findings (TS-tutorial duplicate-export TS2323/TS2393 under single-module emission).
5. **Sweep DoDs scope to their artifact class.** A repo-wide sweep DoD (`rg <pattern>`) names the artifact class it polices and excludes `plans/**` — the contract quotes the strings it retargets, so the bare pattern matches the plan's own text and can never pass as written.

## Phase 4 — Strategy per task

2–4 sentences: approach, key decisions, trade-offs rejected. Where design judgment lives so `worker` doesn't re-exercise it. Short — advisory, not a parse target. Add a runnable example if user-facing/API.

## Phase 5 — Cross-task consistency and blast radius

Before finalizing:

- Every code change has matching scenarios; every public delta reflected in doc updates.
- Deps ordered (Code before Tests before Docs; Config wherever its tooling demands).
- Each unit is a vertical slice — resist horizontal (type-)batching across siblings; `worker` finishes one slice before the next.
- **Hard deps only** in `depends_on` — the repo must be red/incoherent without it; soft ordering stays in Strategy prose. Basenames resolve within the topic folder.
- Cross-module callers: for every public delta, `rg` importers repo-wide; a broken caller adds a task in that module, or the delta is backward-compatible by construction. A call-site grep is the floor — §Folder structure names the grep-blind surfaces (dom's type mirror).
- Test scenarios follow `guides/tests.md`; name files after the surface it prescribes.
- Surface inventories synced: adding/renaming/removing a public symbol updates the package `AGENTS.md` file map (`file.ts symbol` anchors) and README API lists — add a Files entry or it goes stale.
- A `lib/` change altering behavior a `{pkg}-comparison.md` cell describes re-verifies that comparison doc inside the same unit — snapshots drift silently.
- Coverage DoD reachable: a multi-branch Code delta enumerates each new branch with the scenario that exercises it (a branchless owner is either untestable by design — say so in Strategy — or a missing scenario). Can't reach DoD → widen Tests or relax DoD explicitly; an unsatisfiable contract is a defect.

Mismatches → back to Phase 3.

## Phase 6 — Propose, then hand to worker

Write one file per unit to `plans/<package>/<category>/<topic>/<unit>.md` (categories observed: `code`, `docs`, `misc`, `config`), frontmatter `depends_on:` if hard deps exist. For N>1 also write `index.md`: `# [ ] Plan set: <topic>` aggregate, shared scope, sibling links with one-line descriptions + hard deps; state the dep graph. On approval, hand to `worker` — don't execute yourself unless it was escape-hatch small.

## Worked example

Illustrative contract (option hypothetical; paths and surfaces real — `signal` is re-exported by `packages/core/lib/index.ts` and already takes an options type). Shows a Surface:yes fork landing Code+Tests+Docs atomically, each task with Files/Delta/Strategy and a binary DoD.

```
# [ ] Add `label` to `signal()`'s options

## Scope
- Gap: signals are anonymous in devtools traces; callers cannot attach a debug label.
- Surface: yes — new field on the options type callers pass; `signal` re-exported by
  `packages/core/lib/index.ts`.
- Type: Code + Tests + Docs (atomic — Surface:yes).

## [ ] Code
Files: `packages/core/lib/signal.ts` — `signal` overloads + the options type.
Delta: optional `label?: string` on the options type; stored on the signal node.
Strategy: extend the options bag — a new param would shift the overload set.
Default unset preserves behavior. Runnable usage: `signal(0, { label: "count" })`.

- [ ] Options type accepts `label`; value stored on the node.
- [ ] Calls without `label` behave identically to today (overload set unchanged).

## [ ] Tests
Files: `packages/core/tests/signals.test.ts`.

- [ ] A labeled signal stores the label; an unlabeled one leaves it undefined
  (both overload shapes exercised).
- [ ] `bun coverage core` green with the new scenarios.

## [ ] Docs
Files: `packages/core/docs/api/signal.mdx`.

- [ ] Options table gains the `label` row using the Code delta's runnable call.
- [ ] No claim elsewhere in the doc contradicts the new option.
```

Note the cross-references that make it a contract: every Code branch has a matching Tests scenario; the Docs example is the Code delta's runnable call; every DoD item ties to a contract artifact. `worker` ticks each `[ ]` only with cited evidence.

Run the prime handoff gate; friction signals: intake missing scope/citations re-derived by re-reading source → `feedback`; delta that broke a caller found late in Phase 5 → `memory` (recallable: changing X breaks caller Y); unit split wrong in hindsight → `feedback` (sharpen Phase 1).

## Self-check

Cross-module callers checked for every public delta (grep + the grep-blind mirrors); each task executable from this plan alone; every DoD item tied to a contract artifact, no orphans; every file a true independently-shippable unit; every `depends_on` a real sibling and a true hard dep; N>1 → `index.md` exists with `[ ]` aggregate + links; test files named per `guides/tests.md`; multi-branch delta → Tests scope reaches the coverage DoD; the five-trap list audited against every DoD item.
