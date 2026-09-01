Pure HTML stringifier over `@hellajs/dom`'s HellaNode AST. Zero runtime imports from any `@hellajs/*` package (type-only `HellaNode`/`SsrMeta` imports, erased). Source truth is `lib/`; tests/docs serve it.

## Public exports (`lib/index.ts`)

| Export | Purpose |
|---|---|
| `ssr` | Callable namespace (`SsrFn`, assembled in `lib/ssr.ts` via `Object.assign`): `ssr(node): string` sync serialize; `ssr.async(node): Promise<string>` awaits any Promise a resolved value (child, function-ref prop, `each`, `show`) returns; `ssr.stream(node, options?): ReadableStream<string>` yields HTML chunks, flushing the static prefix before each await — `options.nonce` threads an escaped CSP `nonce="…"` attribute onto the `$hs` bootstrap + every per-swap script (omitted → unattributed, byte-identical). All three emit byte-identical markers. |
| `doc` | `doc(options: DocOptions): string | ReadableStream<string>` — one overload pair discriminated by `body` type: string body → string document; `ReadableStream<string>` body → streaming document (shell first, chunks piped, closing tags last). `mount?` wraps the body in both modes; head via the shared `buildHead`. `data?` serializes JSON into a `<script type="application/json" id="hella-data">` payload after the mount wrapper in both modes (joins the stream-mode suffix, flushes last); unserializable `data` throws at the call site. Stream-mode: body-stream error → `controller.error`; cancel propagates to the body via the held reader. |

## Architecture (`lib/`)

One public name per file (`lib/index.ts` is a pure re-export barrel); the `ssr` namespace assembles in `lib/ssr.ts` — its member implementations (`ssrAsync`/`ssrStream`) stay in their own files, exported `@internal` (attached, not barrel-exported). `doc` carries both overloads in one file (`mount`'s `parseMount` co-located). The shared async walker lives under `lib/internal/` — it gained ≥2 callers (`ssrAsync` + `ssrStream`), meeting the `internal/` placement criterion.

| File | Purpose |
|---|---|
| `lib/ssr.ts` | Public `ssr` — the sync recursive walker, plus the callable-namespace assembly: non-exported `SsrFn` interface + `Object.assign(ssrImpl, { async: ssrAsync, stream: ssrStream })`. Sync helpers `walkChild`/`walkChildren`/`renderDynamic` co-located (non-exported, single-caller). |
| `lib/ssrAsync.ts` | `@internal ssrAsync(node)` (the `ssr.async` member) — collect-wrapper over the shared async generator. |
| `lib/ssrStream.ts` | `@internal ssrStream(node, options?)` (the `ssr.stream` member) — `ReadableStream` wrapper over the shared async generator; flushes staged `<Suspense>` swaps at stream end **concurrently** (completion order). Each template is followed by an inline `<script>$hs(id)</script>` (a one-time `$hs` bootstrap precedes them) so each region swaps in the moment it arrives (progressive, React/Solid parity); `hydrate` adopts the already-swapped nodes (`swapSuspenseStage` is the no-script/HappyDOM fallback). A rejecting staged swap is isolated: caught per swap (warn + skip — fallback/sentinel remain), so one failed region no longer errors the stream; `hydrate`'s `stageMissing` path re-suspends it client-side (rejection → nearest error boundary, React `$RX` parity). `options.nonce` (escaped via `escapeHtml`) lands as `nonce="…"` on both script emission sites; `StreamOptions` lives in `types.d.ts`. `$hs` source lives here as the `HS_SWAP_SCRIPT` const; mirrors dom's `swapSuspenseStage`. |
| `lib/doc.ts` | Public `doc(options)` — overload pair discriminated by `body` type (`string` → string; `ReadableStream<string>` → stream: prefix/pipe/suffix, reader acquired up front so `cancel()` propagates). Head built by the shared `buildHead` (`./internal/head`), `lang` via `serializeProp`. Local helpers `parseMount` (tag/`#id`/`.class`, default `div`) and `buildDataScript` (JSON payload, `<` escaped to `\u003c`) co-located (non-exported, single-caller). |
| `lib/types.d.ts` | Public option interfaces — `StreamOptions` (`ssr.stream`'s `nonce`) + `doc`'s (`DocOptions` (with `body: string | ReadableStream<string>`, `mount?` selector, `data?` JSON payload)/`HeadOptions`/`MetaTag`/`LinkTag`/`ScriptTag`); wholesale-re-exported via `export type *`. |
| `lib/internal/serialize.ts` | `serializeProp`/`escapeHtml` (mirror dom's `renderProp`), local `isPlainObject` mirror of core's guard (zero-dep duplication — keep in sync), `VOID` void-element set. |
| `lib/internal/head.ts` | `buildHead(head)` — the single head builder used by both of `doc`'s modes (≥2 callers — `internal/` placement criterion); local helpers `buildAttrs`/`renderVoidTags` (non-exported). |
| `lib/internal/resolve.ts` | `resolveValue`/`resolveAsync` (call-if-function, await-if-Promise resolvers); `isPromise` type guard (local). |
| `lib/internal/assert.ts` | `assertNode` — the shared root guard behind all three members (≥2 callers — `internal/` placement criterion); two tiers: missing node / tag-less non-node (`ssr(App)` footgun). |
| `lib/internal/walk.ts` | The shared async walker (`ssrNodeGen` exported; `walkChildGen`/`walkChildrenGen`/`renderDynamicGen` local) + `MARK_OPEN`/`MARK_CLOSE` and the `DynamicFn`/`PendingSwap` types. |

`ssr`/`ssr.async` have no try/catch (walk failures, including rejected Promises, propagate). `ssr.stream` wraps its async drain in try/catch to route a **main-walk** rejection into `controller.error()` — structurally required by `ReadableStream` semantics (a `ReadableStream` cannot propagate a throw synchronously to its consumer), not a swallow. A rejecting **staged swap** never reaches that catch: each swap's drain carries its own try/catch (warn + skip the `<template>`; fallback + sentinel remain), the stream completes with healthy siblings, and `hydrate`'s `stageMissing` path re-suspends the failed region client-side (rejection bubbles to the nearest error boundary).

### The walk

`ssr(node)` is the recursive node walker: `<tag attrs>body</tag>`; a root fragment (`tag: "$"`) concatenates its children; void elements (`input`, `img`, `br`, …) emit no closing tag. `walkChild` (the child dispatcher) distinguishes:
- **Static template text/number** (a literal child) → emitted **raw**/escaped, UNWRAPPED (consumed by position).
- **Reactive child** (a non-dynamic function/signal) → resolved, then escaped, recursed (if a HellaNode), or each child walked (if an array — parity with dom's `resolveNode`); **wrapped** in `<!--[-->…<!--]-->`.
- **isDynamic component** (function with `isDynamic: true`, or a reactive child that resolves to one) → `renderDynamic` dispatches on `fn.ssr.kind`, **wrapped** in `<!--[-->…<!--]-->`.
- **Nested fragment child** (`tag: "$"`) → children concatenated, **wrapped** in `<!--[-->…<!--]-->`.
- **Element child** (`tag !== "$"`) → recursed via `ssr`, UNWRAPPED.
- **Raw HTML child** (`{ raw }` from dom's `raw()`) → emitted **verbatim** (unescaped), **wrapped** in `<!--[-->…<!--]-->` (opaque region — `hydrate` adopts it without binding). Duck-typed via `"raw" in child` (no dom import — preserves ssr's zero-runtime invariant).

### Hydration markers

Every dynamic region (reactive child, isDynamic component, nested fragment) is wrapped in `MARK_OPEN` (`<!--[-->`) … `MARK_CLOSE` (`<!--]-->`) — Vue-style HTML comments that parse to `Comment` nodes (`nodeValue `[`/`]`) the client's `hydrate` locates. Static elements/text are unwrapped (element-bounded → matched by position). This is the contract that lets `@hellajs/dom`'s `hydrate` bind regions without structural inference and without the coalescing/rebuild tax. `renderDynamic` is shared by the direct-isDynamic-child path and the reactive-resolved-isDynamic path (so a getter like `() => ForEach({...})` renders its items, not the function source).

`renderProp`'s DIRECT_PROPS special-case (value/checked/selected/innerHTML → set the DOM IDL property) is **intentionally not mirrored** — emitting `checked=""` would mean CHECKED in HTML. The style-object rule **is** mirrored byte-for-byte (camelCase→kebab keys, falsy declarations dropped, no auto-px, `"; "` join, then `escapeHtml` — attribute values are escaped server-side even though the client's `setAttribute` needs no escaping). `renderProp`'s custom-element property branch (hyphenated tag + `key in element` → raw assignment) has **no server equivalent** — no element instance to probe, so CE object/array props stringify via the generic branch server-side. The generic rules (falsy → omit, `true` → bare attribute, array → space-joined, else → quoted+escaped) produce correct HTML.

### isDynamic components (`ssr` descriptor)

`ForEach`/`Transition`/`Portal`/`Lazy`/`Suspense` return opaque `isDynamic` closures. dom attaches `fn.ssr = { kind, props }` (`packages/dom/lib/types/nodes.d.ts` → `SsrMeta`); `renderDynamic` (shared by the direct-child and reactive-resolved paths) switches on `kind`:
- `forEach` — resolves `each` (call if function), maps `use(item, index)` → `walkChild`. Keys are irrelevant server-side.
- `transition` — resolves `show`; renders `children` when truthy, nothing otherwise.
- `portal` — renders nothing (no document to teleport into).
- `lazy` — sync (`renderDynamic`): renders `props.loading` if present, never calls `loader`. async (`renderDynamicGen`): awaits `props.loader({ signal })` (a fresh, never-aborting signal — call-shape fidelity with dom), applies dom's `.then` resolution (a function result is called with `props.props`), walks it; a rejection renders `fallback` if present, else rethrows. The sync/async split is the promise-getter asymmetry class — sync cannot await.
- `suspense` — under `ssr`/`ssr.async` renders `children` directly (fallback dropped); under `ssr.stream` emits `fallback` inline + a sentinel comment (nodeValue = a `<template>` id), defers, and streams the resolved children as `<template id="hsN">…</template><script>$hs("hsN")</script>` — each swapped in the moment it arrives (progressive); both scripts carry `options.nonce` as an escaped `nonce="…"` attribute when supplied. A one-time `$hs` bootstrap (the `HS_SWAP_SCRIPT` const in `lib/ssrStream.ts`) precedes the templates; `hydrate` adopts already-swapped nodes (`swapSuspenseStage` is the no-script/HappyDOM fallback). `hydrate` resolves each template by id, so order-independent emission is safe. A rejecting region's swap is caught per-region (template skipped; fallback + sentinel remain) — the stream still completes.

A user-authored isDynamic function with no `ssr` renders as an empty marker region (`<!--[--><!--]-->`), not an error — byte-identical across all three members. User components (`component()`) expand to a HellaNode at template time, so they are plain recursion — no `ssr`.

## Non-obvious behaviors (gotchas)

- **Function-ref props emit the initial value only.** `ssr` resolves each function-ref prop getter once via `resolveValue` (its current value); there is no reactive update. A plain (non-function) prop value is emitted as-is.
- **Hydration markers are the contract.** `ssr()` wraps every dynamic region in `<!--[-->…<!--]-->` (see §Hydration markers). The client's [`hydrate(node, target)`](../dom) (`@hellajs/dom`) reads those `Comment` nodes to bind each region in place — never replacing server DOM. `$ref`/`$collection` and `mount(Island, "#empty-slot")` remain the lighter-enhancement alternatives. A full-tree `mount(app(), "#server-rendered")` over server HTML is a footgun — `mountNode` → `container.replaceChildren` (`packages/dom/lib/mount.ts`) wipes it.
- **`resource` render-fetches no-op on the server.** `run()` guards with `hasWindow()` — resources embedded in a server-rendered tree never trigger network calls. `mutate()` is intentionally UNGUARDED: it is user-initiated (not render-time), so an SSR render never invokes it; guarding would silently drop legitimate mutations. Fetch server-side data with direct `fetch()` and pass it as `initialData`.
- **Errors propagate.** `ssr` has no try/catch; a throwing child/bind/`use` getter surfaces to the caller. (A throwing *component* does NOT propagate — `component()` catches render errors → empty fragment.)
- **Zero runtime imports.** `lib/` has only `import type` from `@hellajs/dom` (erased). Adding a runtime `@hellajs/*` import violates the package's core invariant.
- **`ssr.async` awaits but changes nothing else.** `ssr.async(node)` is the async counterpart to the sync call: it awaits any Promise a resolved value (child, function-ref prop, `each`, `show`) returns, then classifies exactly as `ssr` — except `Lazy`, whose loader it awaits and renders server-side (the sync call stays loading-only — the one intentional sync/async divergence, same class as promise getters). Marker wrapping is byte-identical, so `hydrate` consumes either output unchanged. `resource` still no-ops on the server — expose server data via a Promise-returning getter.

## Testing approach (`tests/`)

Import `ssr` from `@hellajs/ssr/bundle`; build HellaNodes with `html`/`ForEach`/`Transition`/`Portal`/`Lazy` from `@hellajs/dom/bundle`; reactive values from `@hellajs/core`. Most tests need no `resetTestState` — `ssr`/`ssr.async`/`ssr.stream`/`doc` walk pure data and touch no shared mutable state. The exception is `hydrate-integration.test.ts`, which mounts/hydrates into a real DOM container and uses `beforeEach(() => resetTestState())` (plus `setupContainer`). Run with `bun coverage ssr`.
