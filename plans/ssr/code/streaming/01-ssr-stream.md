# [x] B1 — `ssrStream` (ReadableStream streaming renderer)

## Scope
- **Gap**: `ssr()`/`ssrAsync()` return a complete string only after the whole tree resolves — the client receives nothing until the slowest value settles. Add `ssrStream(node): ReadableStream<string>` that walks the tree as an async generator and yields HTML chunks, flushing buffered output **before each `await`** so the static prefix streams immediately (TTFB). Bare Promises are awaited in-order (consistent with `ssrAsync`). No `<Suspense>` in B1 (out-of-order is B2) — B1 is the in-order streaming foundation.
- **Surface**: yes — new export re-exported by `packages/ssr/lib/index.ts`. → Code + Tests + Docs, one atomic unit.
- **Type**: Code + Tests + Docs.
- **Soft execution dep**: A (`plans/ssr/code/async-ssr/ssr-async.md`) — B1 refactors A's async walker into a shared async-generator form (see Strategy). A must be executed first.

## Decisions (overridable at approval)
1. **Name → `ssrStream`** (parallel to `ssr` / `ssrAsync`).
2. **Return type → web `ReadableStream<string>`** (confirmed in brain-idea). Internally an async generator, wrapped via `new ReadableStream({ async start(controller) { for await (const c of gen) controller.enqueue(c); controller.close(); } })`. `Response` use documented as `ssrStream(app).pipeThrough(new TextEncoderStream())` (standard web API, string→byte).
3. **Chunk granularity → flush buffered output before each `await` and at stream end.** Consumers may collect all chunks (tests) or pipe incrementally.
4. **Errors → propagate**: a rejected Promise calls `controller.error(err)` (the stream errors). Matches `ssr`/`ssrAsync`.
5. **Walker strategy → ONE shared async-generator walker.** Refactor A's `walkChildAsync`/`walkChildrenAsync`/`renderDynamicAsync` into generator form (`walkChildGen`/`walkChildrenGen`/`renderDynamicGen`, `async function*`). `ssrAsync` becomes a thin collect-wrapper (`let s=""; for await (const c of walkChildGen(node)) s+=c; return s;`); `ssrStream` wraps the same generator in `ReadableStream`. A 3rd duplicated walker was rejected (drift ×3); the generator form unifies async-await and streaming. A's `ssrAsync` parity DoD still holds after the refactor.
6. **Cancellation → best-effort in B1.** `ReadableStream` cancel stops enqueuing; in-flight user Promises resolve orphaned (the walker cannot abort a user `fetch` the user didn't wire to an `AbortSignal`). Full `AbortSignal`-to-fetch propagation is a plan-time enhancement, not a B1 blocker (note in Strategy).

## [x] Code
Files: `packages/ssr/lib/ssr.ts` — refactor A's async walker into `async function*` generators; add `ssrStream`.
Delta:
- `async function* walkChildGen(child, pending?): string` (yields HTML chunks; `pending` is an array B2 uses for suspense swaps — unused/no-op in B1, pluggable for B2). Mirrors `walkChildAsync` classification: static text → `yield` raw; number/escaped resolved → `yield`; reactive fn → `resolveValue`, if `isPromise` `yield` buffered-then-`await` then `yield` result; isDynamic → `renderDynamicGen`. Marker wrapping (`MARK_OPEN`+body+`MARK_CLOSE`) yields as one chunk.
- `walkChildrenGen`, `renderDynamicGen` — async-generator mirrors of A's async helpers (forEach/transition/portal/lazy; no suspense branch in B1).
- `export function ssrStream(node: HellaNode): ReadableStream<string>` — wraps a root `walkChildrenGen` in `new ReadableStream({ async start(controller) { try { for await (const c of walkRoot(node)) controller.enqueue(c); controller.close(); } catch (e) { controller.error(e); } } })`.
- Refactor `ssrAsync` to `async function ssrAsync(node) { let out = ""; for await (const c of walkRoot(node)) out += c; return out; }` (collect-wrapper over the same generator). Sync `ssr` and its sync helpers stay byte-for-byte unchanged.
Runnable usage: `const stream = ssrStream(html\`<div>${() => fetch(url).then(r => r.text())}</div>\`); return new Response(stream.pipeThrough(new TextEncoderStream()), { headers: { "content-type": "text/html" } });`

Files: `packages/ssr/lib/index.ts` — add `export { ssrStream } from "./ssr";` (next to `ssr`, `ssrAsync`).

Strategy: The generator refactor is the load-bearing piece — it must preserve `ssrAsync`'s exact output (parity test guards it). Keep sync `ssr`/`walkChild`/`walkChildren`/`renderDynamic` untouched (the fast path). `pending` parameter on `walkChildGen` is the B2 hook (passed `[]` / unused in B1) — adding it now avoids re-touching the walker in B2. Reuse `escapeText`/`serializeProp`/`VOID`/`MARK_*`/`resolveValue`/`isPromise`.

- [x] `ssrStream(node)` returns a `ReadableStream<string>`.
- [x] Refactored async walker is `async function*` (`walkChildGen`/`walkChildrenGen`/`renderDynamicGen`); `ssrAsync` is a collect-wrapper over it; sync `ssr` byte-unchanged.
- [x] `ssrAsync` parity preserved: `await ssrAsync(t) === ssr(t)` for all non-Promise trees (A's existing parity test still passes).
- [x] Collecting all chunks of `ssrStream(t)` equals `await ssrAsync(t)` for non-Promise trees (stream/async parity).
- [x] A Promise-returning child is awaited in-order; its value lands inside one `<!--[-->…<!--]-->` region in the assembled stream.
- [x] Promise `bind:`/`each`/`show` awaited (parity with `ssrAsync`'s async branches).
- [x] Progressive flush: with a delayed Promise, a non-empty chunk arrives BEFORE the Promise resolves, and the stream produces >1 chunk.
- [x] A rejected Promise errors the stream (`controller.error`).
- [x] `index.ts` re-exports `ssrStream`; `ssr`/`ssrAsync` exports unchanged.

## [x] Tests
Files: `packages/ssr/tests/ssr-stream.test.ts` (new). Import `ssrStream`/`ssrAsync`/`ssr` from `@hellajs/ssr/bundle`; `html`/`ForEach`/`Transition` from `@hellajs/dom/bundle`; `signal` from `@hellajs/core`. Helper `async function collect(stream): Promise<string>` (read all chunks). No `resetTestState`. Run via `bun coverage ssr`.

- [x] `await collect(ssrStream(html\`<div>hi</div>\`))` === `"<div>hi</div>"`.
- [x] Stream/async parity suite: for static / signal-child / ForEach / Transition / Portal / Lazy / component trees, `await collect(ssrStream(t))` === `await ssrAsync(t)` === `ssr(t)`.
- [x] `await collect(ssrStream(html\`<p>${() => Promise.resolve(5)}</p>\`))` === `"<p><!--[-->5<!--]--></p>"`.
- [x] Escaped Promise value: `Promise.resolve("<b>")` → `&lt;b&gt;` in the assembled region.
- [x] Promise `bind:` → `<input value="x">`; Promise `each` → ForEach items in a region; Promise `show` → Transition gated.
- [x] Progressive flush: a controllable Promise (resolve manually); assert the first chunk is non-empty, arrives before resolve, and total chunks >1 after resolve.
- [x] Rejection: `ssrStream(html\`<p>${() => Promise.reject(new Error("boom"))}</p>\`)` → reading the stream throws `"boom"`.
- [x] `Response`-shaped smoke: `ssrStream(x).pipeThrough(new TextEncoderStream())` is a valid `ReadableStream<Uint8Array>` (typecheck + a read).

## [x] Docs
Files (new — per `guides/docs.md` §Extending):
- `packages/ssr/docs/api/ssr-stream.mdx` (new, Function doc): `# ssrStream`; `## API` `function ssrStream(node: HellaNode): ReadableStream<string>`; `## Basic Usage` showing `ssrStream(app).pipeThrough(new TextEncoderStream())` into a `Response` (Bun.serve); `## Key Concepts` — yields chunks, flushes before each await (TTFB), bare Promises awaited in-order, errors error the stream; `## Important Considerations` — for out-of-order/parallel async use `<Suspense>` (B2, cross-ref), prefer `ssr`/`ssrAsync` when streaming isn't needed.
- `docs/src/pages/reference/ssr/ssr-stream.mdx` (new wrapper): frontmatter + `import SsrStreamContent from '@ssr/api/ssr-stream.mdx'`, zero prose.

Files (extend existing):
- `packages/ssr/docs/index.mdx` — add `ssrStream` to `### API`.
- `packages/ssr/docs/concepts/ssr.mdx` — note streaming via `ssrStream` (one sentence + cross-ref).
- `packages/ssr/docs/patterns/ssr.mdx` — add `### Streaming responses` pattern (Bun.serve + `pipeThrough(new TextEncoderStream())`).

Files (surface inventory + enumerations):
- `packages/ssr/AGENTS.md` — add `ssrStream` to Public exports; Architecture note on the shared generator walker (`walkChildGen`) consumed by `ssrAsync` (collect) + `ssrStream` (stream). [Post-commit hook regenerates `CLAUDE.md`.]
- `packages/ssr/README.md` — add `ssrStream` to API list (verify first).
- `docs/src/nav.ts` — register `ssrStream` under `reference/ssr`.
- Enumeration pages — grep the site; everywhere `ssr` is enumerated as a reference export, add `ssrStream` (`docs/src/pages/reference/index.mdx` + any `learn/` index).

- [x] `ssr-stream.mdx` created (Function doc template, all sections, no frontmatter).
- [x] Wrapper `reference/ssr/ssr-stream.mdx` created (frontmatter + import, zero prose).
- [x] `index.mdx` API bullet lists `ssrStream`.
- [x] `concepts/ssr.mdx` notes streaming with a cross-reference.
- [x] `patterns/ssr.mdx` has `### Streaming responses` (self-contained, imports).
- [x] `packages/ssr/AGENTS.md` exports table + generator-walker Architecture note updated.
- [x] `README.md` API list updated (if it enumerates).
- [x] `docs/src/nav.ts` registers `ssrStream`.
- [x] Every site enumeration listing `ssr` also lists `ssrStream` (grep-verified).

## Definitions of Done (aggregate gates)
- [x] `bun coverage ssr` green (bundle + tests + lint + typecheck); new test passes; coverage on the generator walker + `ssrStream`.
- [x] `bun dead-exports` clean — `ssrStream` referenced in tests + docs.
- [x] Docs-guide checklist (`guides/docs.md`) passes for every touched/created `.mdx`.
- [x] Zero runtime imports added to `lib/ssr.ts` (the `import type` line is still the only `@hellajs/*` import) — invariant preserved.
- [x] Sync `ssr` AND `ssrAsync` behavior unchanged after the generator refactor (existing `ssr.test.ts` 33 tests + A's `ssr-async.test.ts` parity tests still green).

## Blast radius
- `packages/ssr`: `lib/ssr.ts` (refactor async walker → generator; add `ssrStream`; rewrite `ssrAsync` as collect-wrapper), `lib/index.ts`, `tests/ssr-stream.test.ts` (new), `docs/api/ssr-stream.mdx` (new), `docs/concepts/ssr.mdx`, `docs/patterns/ssr.mdx`, `docs/index.mdx`, `AGENTS.md`, `README.md`.
- `docs/src`: `pages/reference/ssr/ssr-stream.mdx` (new wrapper), `nav.ts`, `reference/index.mdx` (+ any `learn/` enumeration).
- `packages/dom`: **unchanged** in B1. `packages/resource`: **unchanged**.
- No new dependencies. Non-breaking new export (the `ssrAsync` rewrite is behavior-preserving, guarded by parity tests) → minor bump. Changeset created manually, NOT in this plan's DoD.
- Hands off to B2+C: the `pending` parameter on `walkChildGen` + the generator form are the hooks B2's `<Suspense>` out-of-order branch plugs into.

## Execution evidence (2026-07-12)

All items above ticked `[x]` from this run. Consolidated evidence:

- **Code+Tests**: `bun coverage ssr` → **64 pass / 0 fail / 100% lines / 100% funcs**. Refactored A's async walker into one shared `async function*` generator (`walkChildGen`/`walkChildrenGen`/`renderDynamicGen`/`ssrNodeGen`); `ssrAsync` is now a collect-wrapper over it; `ssrStream(node): ReadableStream<string>` wraps it. Sync `ssr` byte-unchanged.
- **A parity preserved**: `ssrAsync` output identical after the refactor (A's 19 parity tests + the new stream/async parity tests green).
- **Typecheck**: `ReadableStream<string>` + `AsyncGenerator<string>` resolve clean under `tsc -p tsconfig.lint.json`.
- **Progressive flush verified**: a non-empty chunk arrives before a delayed Promise resolves; >1 chunk total; assembled stream === `ssrAsync` (test "progressive flush…"). Cancel test exercises `gen.return()`.
- **dead-exports**: `bun dead-exports` → "No dead exports found" (`ssrStream` referenced in tests + docs).
- **Invariant**: `lib/ssr.ts:1` unchanged — type-only import, erased.
- **Docs created**: `packages/ssr/docs/api/ssr-stream.mdx`, `docs/src/pages/reference/ssr/ssr-stream.mdx`.
- **Docs extended**: `packages/ssr/docs/{index,concepts/ssr,patterns/ssr}.mdx`, `packages/ssr/AGENTS.md` (exports + Architecture generator-walker row), `packages/ssr/README.md`, `docs/src/nav.ts` (`{ ssr: ["ssr", "ssr-async", "ssr-stream"] }`).
- **Decisions stood as written** (1 `ssrStream`, 2 `ReadableStream`, 3 chunk-granularity flush-before-await, 4 errors error the stream, 5 generator refactor, 6 best-effort cancel) — no overrides.
