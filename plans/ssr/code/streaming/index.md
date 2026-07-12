# [x] Plan set: Streaming SSR (B) + Hydration (C)

**Model β** — stream HTML for paint; hydrate once when complete. Full design rationale + resolved decisions: [`design.md`](./design.md) (same folder). **Soft execution dep on A** (`plans/ssr/code/async-ssr/ssr-async.md`) — `ssrStream` reuses A's async walker; A must land first.

## Units (execution order: B1 → B2+C)

- [x] [01 — `ssrStream` (ReadableStream renderer)](./01-ssr-stream.md) — **B1**. In-order chunked streaming on A's async walker; flushes the static prefix before each await (TTFB). ssr-package-only. Shippable alone (no `<Suspense>`).
- [x] [02 — `<Suspense>` primitive + hydrate adoption](./02-suspense-hydrate.md) — **B2+C**. Out-of-order streaming via explicit `<Suspense>`; the hydrate change is a small adoption slice (hydrate core unchanged — β's load-bearing property). `depends_on: [01-ssr-stream]`.

## Aggregate DoD
- [x] B1 top marker `[x]` AND B2+C top marker `[x]`.
- [x] Execution chain respected: A (`ssrAsync`) landed → B1 (`ssrStream`) → B2+C (`<Suspense>`).
- [x] `bun coverage ssr` AND `bun coverage dom` both green after the full chain.
- [x] hydrate core (`packages/dom/lib/internal/hydrate.ts` marker-reader `hydrateSequence`/`hydrateNode`) unchanged in behavior — B2+C only ADDS a `case "suspense":` adoption branch in `hydrateDynamic`.
- [x] Zero runtime imports added to `packages/ssr/lib/ssr.ts` (the `import type` line remains the only `@hellajs/*` import).
