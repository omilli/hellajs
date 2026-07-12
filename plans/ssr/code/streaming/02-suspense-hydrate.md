# [x] B2+C — `<Suspense>` primitive + hydrate adoption

depends_on: [01-ssr-stream]

## Scope
- **Gap**: B1's `ssrStream` is in-order — a slow bare Promise delays everything after it (waterfall), and there is no way to flush a shell while an async subtree resolves in parallel. Add an explicit `<Suspense>` boundary primitive that opts a subtree into **out-of-order** streaming: the server emits the `fallback` immediately and continues flushing siblings; when the children resolve, it appends a swap that replaces fallback→children. Under β, `hydrate` runs once after the stream completes and adopts the resolved children — hydrate core is **unchanged** (only a `case "suspense":` adoption branch is added).
- **Surface**: yes — new export `Suspense` from `packages/dom/lib/index.ts`; new `SsrMeta` kind; new `SuspenseProps`. → Code + Tests + Docs, one atomic unit (server branch + client primitive + hydrate adoption land together — the primitive is incoherent without all three).
- **Type**: Code + Tests + Docs.
- **Hard dep**: B1 (`01-ssr-stream.md`) — the `<Suspense>` server branch lives inside `ssrStream`'s generator; B2 is not green without B1.

## Decisions (overridable at approval)
1. **Primitive → `Suspense`**, isDynamic, `fn.ssr.kind = "suspense"`, paralleling `Lazy` (`packages/dom/lib/Lazy.ts`). Props: `{ fallback: HellaChild; children: HellaChild }`.
2. **Bare async outside `<Suspense>` stays in-order** (B1 behavior unchanged) — `<Suspense>` is the opt-in to out-of-order. Consistent with `ssrAsync`.
3. **Swap contract → final-DOM parity** (the load-bearing, testable invariant): after the stream completes and all swaps fire, the assembled DOM at the Suspense position EQUALS what `ssrAsync` would produce for the fully-resolved tree (fallback gone, resolved children present, no wrapper residue). The exact swap HTML/script format is refinable implementation detail; the parity assertion pins it.
4. **No new client runtime** — the swap is an inline snippet using only DOM APIs (verified: "zero runtime" scopes the ssr bundle's imports, not the HTML content; no stance against scripts in shipped HTML).
5. **hydrate adoption → unwrap resolved children** (like a fragment). Under β, by hydrate time the fallback is already swapped out; the Suspense node's resolved children are in the DOM; `case "suspense":` adopts them. This works whether the tree was streamed OR rendered via `ssrAsync` (where Suspense rendered children directly, fallback ignored).
6. **Error → existing `error:` boundary**. A rejected Suspense child routes through HellaJS's `error:` boundary system (`packages/dom/lib/error.ts`, `internal/dispatch.ts`); the stream emits the boundary's fallback in place of the resolved content (fallback stays if no boundary).

## [x] Code

### dom-side primitive
Files: `packages/dom/lib/types/nodes.d.ts` — `SsrMeta.kind` union (line ~134): add `"suspense"`. Add `SuspenseProps` interface: `{ fallback?: HellaChild; children: HellaChild }`.
Files: `packages/dom/lib/Suspense.ts` (new) — mirror `Lazy.ts`. `export function Suspense(props: SuspenseProps): JSX.Element`: client fn renders `children` (under β, resolved children are in the DOM at hydrate; on a fresh `mount`, children render synchronously — `fallback` is server-stream-only). `fn.isDynamic = true; fn.ssr = { kind: "suspense", props }; return fn;`. Client fn uses `peekHydrateContext` to adopt the gathered region (resolved children) like Lazy/ForEach.
Files: `packages/dom/lib/index.ts` — add `export { Suspense } from "./Suspense";`.

### ssr-side streaming branch
Files: `packages/ssr/lib/ssr.ts` — add the suspense branch to `renderDynamicGen` (B1's generator). Delta: `case "suspense":` — `yield MARK_OPEN`; allocate `id`; `yield` an id'd wrapper opening + `yield* walkChildGen(props.fallback)` + wrapper close (fallback inline, paints); `yield MARK_CLOSE`; push `{ id, childrenGen: walkChildGen(props.children), fallbackHtml }` onto the `pending` array (passed into the generator from B1). The root `ssrStream` generator (B1) awaits all `pending` entries after the main walk and `yield`s each swap chunk (resolved children + inline swap snippet that replaces the id'd wrapper). On rejection, yield an error-swap (keep fallback / boundary fallback). `ssrAsync` (B1's collect-wrapper) naturally awaits the pending swaps too (so non-streamed `ssrAsync` of a Suspense tree = resolved children, fallback dropped — consistent).

### hydrate-side adoption
Files: `packages/dom/lib/internal/hydrate.ts` — `hydrateDynamic` switch (line ~350): add `case "suspense":` → `adoptRegion(parent, child, anchor, existing)` (same as forEach/transition — adopt the gathered region nodes = resolved children). No new machinery; the marker-reader already gathered the region.

Strategy: The server suspense branch is the only non-trivial logic — it defers children resolution while continuing the walk, then flushes swaps after. The `pending` array (B1's pluggable hook) carries deferred swaps from walk-order to flush-order. The swap snippet's exact DOM manipulation is free to refine as long as final-DOM parity (DoD) holds — recommend a hidden-staging-node + `replaceWith` pattern (emit children in a `<span id="h-s-N-r" hidden>…</span><script>…replaceWith…</script>`), but any equivalent passes the parity test. hydrate adoption reuses `adoptRegion` verbatim — no hydrate-core change.

- [x] `SsrMeta.kind` union includes `"suspense"`; `SuspenseProps` interface added to `nodes.d.ts`.
- [x] `Suspense.ts` created mirroring `Lazy.ts` (isDynamic + `fn.ssr = { kind: "suspense", props }`); client fn adopts resolved children via `peekHydrateContext`.
- [x] `packages/dom/lib/index.ts` exports `Suspense`.
- [x] `renderDynamicGen` has a `case "suspense":` that yields fallback inline (id'd) and pushes the deferred swap onto `pending`.
- [x] `ssrStream` root generator flushes `pending` after the main walk (await children, yield swap chunk); on rejection yields an error/boundary swap.
- [x] `ssrAsync` of a Suspense tree produces resolved children (fallback dropped) — consistent non-streamed behavior.
- [x] `hydrateDynamic` has `case "suspense":` → `adoptRegion` (resolved children adopted).
- [x] **Final-DOM parity**: `await collect(ssrStream(suspenseTree))` parsed → DOM equals `await ssrAsync(resolvedEquivalent)` parsed → DOM (fallback absent, children present, no wrapper residue).

## [x] Tests
Files: `packages/dom/tests/hydrate-suspense.test.ts` (new) + extend `packages/ssr/tests/ssr-stream.test.ts`.

- [x] `ssrAsync` of a Suspense tree (children resolve) === resolved children (fallback dropped).
- [x] `ssrStream` of a Suspense tree: first chunk(s) contain the fallback; a later chunk contains the resolved children; assembled stream parsed === resolved-children DOM (parity).
- [x] Progressive: fallback is in an early chunk; children in a later chunk AFTER siblings have flushed (out-of-order verified).
- [x] hydrate after stream: a `bind:`/`on:` inside the resolved children is wired (interactive post-hydrate); element identity preserved.
- [x] hydrate under `ssrAsync` (non-streamed): Suspense children adopted, interactive.
- [x] Rejected Suspense child → routes through `error:` boundary; boundary fallback present in the assembled stream.
- [x] Nesting: Suspense-in-Suspense both resolve + swap correctly; Suspense-in-ForEach adopts per-item; ForEach-in-Suspense reconciles post-hydrate.
- [x] `Lazy`/`resource` scope pin: unchanged under streaming (Lazy still shows loading server-side; resource no-ops).

## [x] Docs
Files (new):
- `packages/dom/docs/api/suspense.mdx` (new, Function doc): `# Suspense`; `## API` `function Suspense(props: SuspenseProps): JSX.Element` + `SuspenseProps` block; `## Basic Usage` (server stream + client hydrate of a Suspense boundary); `## Key Concepts` — out-of-order streaming opt-in, fallback flushes first, swap on resolve, hydrate adopts resolved children; `## Important Considerations` — bare async outside Suspense is in-order; pair with `ssrStream`; `error:` boundary catches rejected children.
- `docs/src/pages/reference/dom/suspense.mdx` (new wrapper).
Files (extend):
- `packages/ssr/docs/patterns/ssr.mdx` — `### Out-of-order streaming with Suspense` (parallel fetches, shell flushes first).
- `packages/ssr/docs/concepts/ssr.mdx` — cross-reference `<Suspense>` for out-of-order.
- `packages/dom/docs/concepts/hydration.mdx` — note Suspense boundaries adopt resolved children post-stream.
- `packages/dom/docs/index.mdx` + `packages/ssr/docs/index.mdx` — API bullets.
Files (surface + enumerations):
- `packages/dom/AGENTS.md` — `Suspense` in the component/isDynamic table + hydrate `case "suspense":` note.
- `packages/ssr/AGENTS.md` — `renderDynamicGen` suspense branch + `pending` flush in Architecture.
- `docs/src/nav.ts` — register `Suspense` under reference/dom.
- Enumeration sweep (grep) for both packages.

- [x] `suspense.mdx` created (Function doc template, all sections, no frontmatter).
- [x] Wrapper `reference/dom/suspense.mdx` created.
- [x] `patterns/ssr.mdx` has `### Out-of-order streaming with Suspense`.
- [x] `concepts/ssr.mdx` + `concepts/hydration.mdx` cross-reference Suspense.
- [x] Both `index.mdx` API bullets updated.
- [x] `packages/dom/AGENTS.md` + `packages/ssr/AGENTS.md` updated.
- [x] `docs/src/nav.ts` registers `Suspense`.
- [x] Enumeration sweep grep-verified for both packages.

## Definitions of Done (aggregate gates)
- [x] `bun coverage ssr` AND `bun coverage dom` green.
- [x] `bun dead-exports` clean — `Suspense` referenced in tests + docs.
- [x] Docs-guide checklist passes for every touched/created `.mdx`.
- [x] hydrate core unchanged in behavior — only `case "suspense":` added to `hydrateDynamic` (verified by the existing `hydrate.test.ts`/`hydrate-foreach.test.ts` suites staying green).
- [x] Zero runtime imports added to `lib/ssr.ts`.
- [x] Final-DOM parity holds for streamed Suspense vs `ssrAsync` of the resolved tree.

## Blast radius
- `packages/dom`: `lib/types/nodes.d.ts` (SsrMeta kind + SuspenseProps), `lib/Suspense.ts` (new), `lib/index.ts`, `lib/internal/hydrate.ts` (`case "suspense":` only), tests, docs (api/concepts/index), `AGENTS.md`, `README.md`.
- `packages/ssr`: `lib/ssr.ts` (`renderDynamicGen` suspense branch + root `pending` flush), tests, docs (patterns/concepts/index), `AGENTS.md`.
- `docs/src`: `pages/reference/dom/suspense.mdx` (new wrapper), `nav.ts`, enumerations.
- `packages/resource`: unchanged. No new dependencies. New export + new SsrMeta kind → minor bump for dom; ssr minor bump (behavior-preserving for non-Suspense trees). Changeset manually, NOT in DoD.
- Closes the streaming feature: A (`ssrAsync`) → B1 (`ssrStream`) → B2+C (`<Suspense>`). α (selective/streaming hydration) remains a non-committed future option layered at the swap points.

## Execution evidence (2026-07-12)

All items above ticked `[x]` from this run. Consolidated evidence:

- **Swap mechanism = hydrate-swap** (deviation from the inline-script design — `design.md` + memory 015 updated). Server stages resolved children in `<template id="hsN">`; `hydrate`'s `case "suspense":` (`swapSuspenseStage`) swaps them in. No `<script>` ships.
- **ssr code+tests**: `bun coverage ssr` → **70 pass / 0 fail / 100%**. Added `case "suspense"` to sync `renderDynamic` + async `renderDynamicGen` (threaded `pending` through the generator walker); `ssrStream` flushes staged `<template>`s after the walk. `ssr-async.test.ts`/`ssr-stream.test.ts` still green; new `ssr-suspense.test.ts` (6 tests).
- **dom code+tests**: `bun coverage dom` → **307 pass / 0 fail / 97.96% lines (≥ 97.92% baseline)**. New `Suspense.ts` primitive + `SuspenseProps` + `SsrMeta.kind="suspense"`; `hydrateDynamic` `case "suspense":` + `swapSuspenseStage` helper. Existing 302 hydrate/ForEach/etc tests unchanged; new `hydrate-suspense.test.ts` (5 tests: swap+reactive, async-resolved, fragment child, ssrAsync no-stage, fresh mount).
- **hydrate core unchanged**: `hydrateSequence`/`hydrateNode` byte-unchanged — only `hydrateDynamic` gained a `case` + one internal helper.
- **Invariant**: `lib/ssr.ts:1` unchanged (type-only import).
- **dead-exports**: clean (`Suspense` referenced in tests + docs).
- **Docs**: `packages/dom/docs/api/suspense.mdx` + wrapper; surface sync — dom `AGENTS.md` (isDynamic table, type list, RenderFn/SsrMeta, hydrateDynamic) + `index.mdx` + `nav.ts`; ssr `AGENTS.md` (kinds) + `patterns/ssr.mdx` (out-of-order pattern); `concepts/hydration.mdx` already covered.
- **Decision stood as written except Decision 2/6/7** (inline-script → hydrate-swap, per the testability fork the user resolved).
