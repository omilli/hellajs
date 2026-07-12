# Streaming SSR (B) + Hydration (C) — design spec

**Status:** brain-idea converged → ready for `brain-plan`. This is the design capture (brain-plan's intake evidence map), not a contract. Plan contracts will be `01-ssr-stream.md` (B1) + `02-suspense-hydrate.md` (B2+C) + `index.md`.

**Update 2026-07-12 (execution):** the swap mechanism was changed from an inline `<script>` (Decisions 2/6/7 as written) to **hydrate-swap** — the server stages resolved children in a `<template id="hsN">` and `hydrate`'s `case "suspense":` (`swapSuspenseStage`) swaps them in during its single pass (no script ships in the HTML). Chosen over the inline-script design for full testability (HappyDOM does not execute scripts inserted via `innerHTML`). Decisions 2/6/7 below updated to reflect this.

**Soft execution dependency:** A (`plans/ssr/code/async-ssr/ssr-async.md`) must land first — `ssrStream` reuses A's async walker. Cross-folder soft order (not a `depends_on`); stated in each unit's Strategy.

## Model: β — stream HTML for paint; hydrate once when complete

Chosen over α (selective/streaming hydration). Rationale: HellaJS hydrate is surgical (`packages/dom/lib/internal/hydrate.ts` — one marker-reader pass, no reconcile, verified this session), so β's deferred single-hydrate is fast even for large pages — the expensive-hydration rationale that forces React into α does not apply. β's swap points become α's incremental-hydrate hooks later if ever needed. α remains a future option, not a commitment.

### Load-bearing decisions (all resolved)

1. **Streaming model → out-of-order via explicit `<Suspense>`.** In-order chunking (cheaper, no C) was rejected: it serializes async (waterfall) and gives no shell-flush benefit. Industry parity (React/Vue/Solid) is out-of-order.
2. **Placement mechanism → hydrate-swap (no inline script).** Out-of-order REQUIRES a runtime placement mechanism (later-emitted content can't move earlier without JS). Instead of an inline `<script>`, the server stages resolved children in a `<template id="hsN">` and `hydrate`'s `case "suspense":` (`swapSuspenseStage`) swaps them in during its single pass. Chosen over the inline-script design for full testability (HappyDOM does not execute scripts inserted via `innerHTML`).
3. **`<Suspense>` primitive → new isDynamic component** in `@hellajs/dom`, `fn.ssr.kind = "suspense"`, paralleling ForEach/Transition/Portal/Lazy. `<Suspense fallback={<Loading/>}>{children}</Suspense>`.
4. **Bare async outside `<Suspense>` → awaited in-order** (stream pauses, then continues). `<Suspense>` is the opt-in to out-of-order. Determined by consistency with A's `ssrAsync` (which already awaits bare Promises) — erroring would be inconsistent; auto-wrapping is un-HellaJS.
5. **Stream return type → web `ReadableStream`.** Native `Response` body (Bun/Deno/workers — documented runtimes); industry standard; zero-dependency (global). Internally implemented as an async generator. Confirmed by user.
6. **hydrate core unchanged; suspense case swaps + adopts.** The marker-reader (`hydrateSequence`/`hydrateNode`) is untouched. `hydrateDynamic` gains only a `case "suspense":` → `swapSuspenseStage` (find the staged `<template>` by sentinel-comment id, replace fallback with its content, remove the template) + `adoptRegion`. No streaming-hydration / late-arriving-segment machinery — the swap runs in the single hydrate pass.
7. **No new client runtime, no inline script.** β ships zero runtime and zero `<script>` — the swap is plain DOM manipulation inside `hydrate`.
8. **Stream renderer reuses A's async walker.** `ssrStream` shares `ssrAsync`'s await machinery; the only addition is the Suspense-descriptor branch that defers-and-swaps. Same reuse decision as A.

### Plan-time items (NOT cruxes — for brain-plan to scope)

- **Error handling** — a rejected Suspense child routes through HellaJS's existing `error:` boundary system (`packages/dom/lib/error.ts`, `internal/dispatch.ts`); the stream emits the boundary's fallback in place of the resolved content.
- **Abort/cancellation** — `ReadableStream` cancel → `AbortController` propagated to in-flight Promises; partial output discarded.
- **Nesting** — Suspense-in-Suspense, Suspense-in-ForEach, ForEach-in-Suspense compose via the existing isDynamic + `SsrMeta` descriptor mechanism (verify in plan).
- **`Lazy` / `resource` unchanged** — same scope decision as A (Lazy is client-progressive; resource no-ops on server at `resource.ts:175`). Users express server-async via Promise getters / `<Suspense>`.
- **id / placeholder format** — reversible, server-side; an id'd wrapper node + the existing `<!--[-->…<!--]-->` region. brain-plan picks the exact shape.

## Proposed unit decomposition (for brain-plan)

Under β, B+C splits into two independently-shippable units (distinct blast radii; B1 useful alone):

- **B1 — `ssrStream` (ReadableStream renderer).** In-order chunked streaming built on A's async walker; yields chunks, awaits bare Promises in-order. ssr-package-only. Shippable alone (chunked-transfer paint benefit). Files: `packages/ssr/lib/ssr.ts`, `lib/index.ts`, new test, docs + surface sync.
- **B2+C — `<Suspense>` primitive + hydrate adoption.** Server: out-of-order branch in `ssrStream` (emit fallback + id'd placeholder, continue, await children, append swap chunk). Client: Suspense's hydrate adoption (unwrap resolved children). `depends_on: [01-ssr-stream]` (same-folder hard dep — Suspense's server branch lives in `ssrStream`). Files: `packages/dom/lib/Suspense.ts` (new), `packages/ssr/lib/ssr.ts` (descriptor branch), `packages/dom/lib/internal/hydrate.ts` (Suspense adoption — small, NOT a core change), tests, docs.

Dependency chain (execution): **A → B1 → B2+C.**
