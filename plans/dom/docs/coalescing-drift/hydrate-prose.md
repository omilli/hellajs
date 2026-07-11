# [x] Fix stale "coalesced text is rebuilt" hydration docs + JSDoc

## Scope
- **Gap**: Three spots in `@hellajs/dom` claim reactive text adjacent to static text is "rebuilt locally" because "the server coalesces it." That behavior was reverted by the marker rework (memory 013) — `ssr()` now bounds every dynamic region in its own `<!--[-->…<!--]-->` pair and `hydrate` adopts each region in place with **no rebuild**. The three stale spots contradict the rest of the repo: `packages/dom/AGENTS.md` ("no coalescing/rebuild"), `packages/dom/dom-comparison.md` ("no coalescing rebuild"), `packages/ssr/docs/api/ssr.mdx` ("without rebuilding coalesced text"), `ssr-comparison.md` ("never rebuilding coalesced text"), and the passing test `packages/ssr/tests/hydrate-integration.test.ts` ("hydrates without rebuild (coalescing gone)").
- **Surface**: no — the `hydrate` signature and behavior are unchanged; only incorrect prose/JSDoc is corrected.
- **Type**: Docs (one atomic unit; the three spots share one blast radius and must land together — leaving any one stale contradicts the other two).

## [x] Docs

### Files 1–3 + deltas

**File 1** — `packages/dom/docs/api/hydrate.mdx`, under `## Important Considerations`.
Anchor: `### Coalesced Text Runs Are Rebuilt` (the stale gotcha subsection: heading + one paragraph).
Delta: **DELETE the entire `### Coalesced Text Runs Are Rebuilt` subsection** (heading + paragraph). There is no gotcha left to document — marker-bounded adoption is the normal path already covered under `### Adopt, Don't Re-Render`. Do not disturb the surrounding subsections (`### Reactive State Must Initialize to Server Values`, `### mount vs hydrate`).

**File 2** — `packages/dom/docs/concepts/hydration.mdx`, `<details><summary>Internal Mechanics</summary>` block, last sentence of the paragraph.
Anchor: the sentence `The server stringifier concatenates adjacent text, so reactive text adjacent to static text is rebuilt locally rather than split.`
Delta: **REPLACE** that sentence with an accurate marker-reader description, e.g.: ``Every dynamic region (a reactive child, a control-flow component, or a nested fragment) is bounded by `<!--[-->…<!--]-->` comment markers the server emits; `hydrate` reads those Comment nodes to locate and adopt each region in place — no structural inference, no text rebuild.`` Keep the preceding sentences (walk-in-parallel, handlers registered, static attrs skipped, ForEach/Transition seed from existing nodes) intact; keep the `<details>`/`<summary>Internal Mechanics</summary>` structure.

**File 3** — `packages/dom/lib/hydrate.ts`, `hydrate()` JSDoc, last sentence before `@param`.
Anchor: `Element-bounded structure and keyed lists are adopted; reactive text adjacent to static text is rebuilt locally (the server coalesces it).`
Delta: **REPLACE** with an accurate sentence, e.g.: ``Element-bounded structure, keyed lists, and every marker-bounded reactive region are adopted in place — the server bounds each dynamic region in `<!--[-->…<!--]-->` markers the walker reads.`` Leave `@param` / `@returns` lines and the function signature untouched.

### Strategy
Pure doc-drift correction — root cause is the marker rework reverting coalescing/rebuild but leaving these three prose spots on the old behavior. Align prose with code. Delete the spurious gotcha rather than rewriting it: there is no remaining coalescing limitation to warn about, and the adoption behavior is already documented under "Adopt, Don't Re-Render". Rejected alternatives: (a) keep a rewritten "Coalesced Text Runs" subsection — would document a non-issue under Important Considerations; (b) add markers detail to the API doc — already covered by `ssr`'s own docs and the concept doc's mechanics block.

## [x] Tests (justify absence — no new tests)
The behavior the stale docs described ("rebuilt") is already asserted to **not** happen:
- `packages/ssr/tests/hydrate-integration.test.ts` — test `"ssr adjacent reactive text hydrates without rebuild (coalescing gone)"`.
- `packages/dom/tests/hydrate.test.ts` — test `"adopts a marker-bounded reactive text region between static text"`.

The code is correct; only the docs were wrong. No test change.

## Definitions of Done

### Docs deltas
- [x] File 1: `### Coalesced Text Runs Are Rebuilt` subsection (heading + paragraph) fully removed from `hydrate.mdx`; `## Important Considerations` retains its other subsections undisturbed. — verified `sed -n '60,72p' packages/dom/docs/api/hydrate.mdx` (the two remaining subsections now adjacent).
- [x] File 2: stale sentence in `hydration.mdx` `<details>` replaced with the marker-bounded adoption description; surrounding paragraph + `<details>`/`<summary>Internal Mechanics</summary>` structure intact. — verified `sed -n '57,63p' packages/dom/docs/concepts/hydration.mdx`.
- [x] File 3: stale JSDoc sentence in `hydrate.ts` replaced; `@param`/`@returns` lines and the `hydrate` signature untouched. — verified `sed -n '14,22p' packages/dom/lib/hydrate.ts`.

### Consistency sweep
- [x] `rg -n -i "rebuilt locally|server coalesces|coalesced text run|concatenates adjacent text" packages/dom/` returns no stale claims. — ran the wider pattern `rebuilt locally|server coalesces|coalesced text run|concatenates adjacent text|coalescing|coalesces|rebuilt`; only correct claims remain (`AGENTS.md`/`CLAUDE.md:97` "no coalescing/rebuild", `dom-comparison.md:264` "no coalescing rebuild") + unrelated `custom-elements.mdx:23` "nullish coalescing".
- [x] Corrected prose matches `packages/dom/AGENTS.md` (Marker contract), `packages/ssr/docs/api/ssr.mdx`, both `*-comparison.md` docs, and the `hydrate-integration.test.ts` test title — no new contradiction introduced. — both corrected sentences now state marker-bounded in-place adoption, aligning with `AGENTS.md:97` and `dom-comparison.md:264`.

### Docs-guide verification (`guides/docs.md` checklist, the `.mdx` gate)
- [x] Package docs carry no frontmatter (none added).
- [x] Cross-references still full-path + backtick-wrapped where present; no `## Related` section. — no links touched (`mount`, `$ref`, `$collection`, `ForEach`, `ssr` all intact).
- [x] No test-framework assertions (`expect`/`toBe`/…) introduced.
- [x] Tone: present tense, no hedging (API doc = factual; concept `<details>` = educational). — "is bounded … reads … to locate and adopt … in place"; "are adopted in place".
- [x] Length: removing a subsection only shortens `hydrate.mdx`; still within targets.

### Code gate
- [x] `bun coverage dom` green (the `hydrate.ts` JSDoc edit is in a bundled source file → rebuild + lint + typecheck + tests). Docs `.mdx` changes are not exercised by coverage; the docs-guide checklist above is their gate. — 302 pass, 0 fail, 97.92% lines; lint/typecheck clean (part of `bun coverage`).

## Blast radius
- Files touched: 3, all in `packages/dom` (2 `.mdx` + 1 `.ts` JSDoc).
- Docs-site wrappers (`docs/src/pages/learn/concepts/hydration.mdx`, `docs/src/pages/reference/dom/hydrate.mdx`) are thin `import @dom/...` wrappers — auto-fixed, no edit.
- No `CLAUDE.md` / `.github/instructions/*` sync (AGENTS.md is already correct and is not edited).
- No comparison-doc edits (both already correct).
- No test changes. No public API change (JSDoc prose only).
