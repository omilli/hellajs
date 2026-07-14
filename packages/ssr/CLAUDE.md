Pure HTML stringifier over `@hellajs/dom`'s HellaNode AST. Zero runtime imports from any `@hellajs/*` package (type-only `HellaNode`/`SsrMeta` imports, erased). Source truth is `lib/`; tests/docs serve it.

## Public exports (`lib/index.ts`)

| Export | Purpose |
|---|---|
| `ssr` | `ssr(node: HellaNode): string` — serialize a HellaNode AST to an HTML string. |
| `ssrAsync` | `ssrAsync(node: HellaNode): Promise<string>` — async counterpart; awaits any Promise a resolved value (child, `bind:`, `each`, `show`) returns. |
| `ssrStream` | `ssrStream(node: HellaNode): ReadableStream<string>` — streaming counterpart; yields HTML chunks, flushing the static prefix before each await. |

## Architecture (`lib/`)

One public export per file (`lib/index.ts` is a pure re-export barrel). The shared async walker lives under `lib/internal/` — it gained ≥2 callers (`ssrAsync` + `ssrStream`), meeting the `internal/` placement criterion.

| File | Purpose |
|---|---|
| `lib/ssr.ts` | Public `ssr(node)` — the sync recursive walker. Sync helpers `walkChild`/`walkChildren`/`renderDynamic` co-located (non-exported, single-caller). |
| `lib/ssrAsync.ts` | Public `ssrAsync(node)` — collect-wrapper over the shared async generator. |
| `lib/ssrStream.ts` | Public `ssrStream(node)` — `ReadableStream` wrapper over the shared async generator; flushes staged `<Suspense>` swaps at stream end. |
| `lib/internal/serialize.ts` | `serializeProp`/`escapeHtml` (mirror dom's `renderProp`), `VOID` void-element set. |
| `lib/internal/resolve.ts` | `resolveValue`/`resolveAsync` (call-if-function, await-if-Promise resolvers); `isPromise` type guard (local). |
| `lib/internal/walk.ts` | The shared async walker (`ssrNodeGen` exported; `walkChildGen`/`walkChildrenGen`/`renderDynamicGen` local) + `MARK_OPEN`/`MARK_CLOSE` and the `DynamicFn`/`PendingSwap` types. |

`ssr`/`ssrAsync` have no try/catch (walk failures, including rejected Promises, propagate). `ssrStream` wraps its async drain in try/catch to route a rejected Promise into `controller.error()` — structurally required by `ReadableStream` semantics (a `ReadableStream` cannot propagate a throw synchronously to its consumer), not a swallow.

### The walk

`ssr(node)` is the recursive node walker: `<tag attrs>body</tag>`; a root fragment (`tag: "$"`) concatenates its children; void elements (`input`, `img`, `br`, …) emit no closing tag. `walkChild` (the child dispatcher) distinguishes:
- **Static template text/number** (a literal child) → emitted **raw**/escaped, UNWRAPPED (consumed by position).
- **Reactive child** (a non-dynamic function/signal) → resolved + escaped (or recursed if it resolves to a HellaNode), **wrapped** in `<!--[-->…<!--]-->`.
- **isDynamic component** (function with `isDynamic: true`, or a reactive child that resolves to one) → `renderDynamic` dispatches on `fn.ssr.kind`, **wrapped** in `<!--[-->…<!--]-->`.
- **Nested fragment child** (`tag: "$"`) → children concatenated, **wrapped** in `<!--[-->…<!--]-->`.
- **Element child** (`tag !== "$"`) → recursed via `ssr`, UNWRAPPED.

### Hydration markers

Every dynamic region (reactive child, isDynamic component, nested fragment) is wrapped in `MARK_OPEN` (`<!--[-->`) … `MARK_CLOSE` (`<!--]-->`) — Vue-style HTML comments that parse to `Comment` nodes (`nodeValue `[`/`]`) the client's `hydrate` locates. Static elements/text are unwrapped (element-bounded → matched by position). This is the contract that lets `@hellajs/dom`'s `hydrate` bind regions without structural inference and without the coalescing/rebuild tax. `renderDynamic` is shared by the direct-isDynamic-child path and the reactive-resolved-isDynamic path (so a getter like `() => ForEach({...})` renders its items, not the function source).

`renderProp`'s DIRECT_PROPS special-case (value/checked/selected/innerHTML → set the DOM IDL property) is **intentionally not mirrored** — emitting `checked=""` would mean CHECKED in HTML. The generic rules (falsy → omit, `true` → bare attribute, array → space-joined, else → quoted+escaped) produce correct HTML.

### isDynamic components (`ssr` descriptor)

`ForEach`/`Transition`/`Portal`/`Lazy`/`Suspense` return opaque `isDynamic` closures. dom attaches `fn.ssr = { kind, props }` (`packages/dom/lib/types/nodes.d.ts` → `SsrMeta`); `renderDynamic` (shared by the direct-child and reactive-resolved paths) switches on `kind`:
- `forEach` — resolves `each` (call if function), maps `use(item, index)` → `walkChild`. Keys are irrelevant server-side.
- `transition` — resolves `show`; renders `children` when truthy, nothing otherwise.
- `portal` — renders nothing (no document to teleport into).
- `lazy` — renders `props.loading` if present; never awaits `loader`.
- `suspense` — under `ssr`/`ssrAsync` renders `children` directly (fallback dropped); under `ssrStream` emits `fallback` inline + a sentinel comment (nodeValue = a `<template>` id), defers, and stages the resolved children in `<template id="hsN">` at stream end for `hydrate` to swap in (β).

A user-authored isDynamic function with no `ssr` renders as nothing (not an error). User components (`component()`) expand to a HellaNode at template time, so they are plain recursion — no `ssr`.

## Non-obvious behaviors (gotchas)

- **`bind:` emits the initial value only.** `ssr` resolves each `bind` getter once (its current value); there is no reactive update. Static (`props`) attributes are NOT auto-resolved — a signal in a static attribute is stringified as a function (matches dom's `renderProp`); use `bind:` for reactive attributes.
- **Hydration markers are the contract.** `ssr()` wraps every dynamic region in `<!--[-->…<!--]-->` (see §Hydration markers). The client's [`hydrate(node, target)`](../dom) (`@hellajs/dom`) reads those `Comment` nodes to bind each region in place — never replacing server DOM. `$ref`/`$collection` and `mount(Island, "#empty-slot")` remain the lighter-enhancement alternatives. A full-tree `mount(app(), "#server-rendered")` over server HTML is a footgun — `mountNode` → `container.replaceChildren` (`packages/dom/lib/mount.ts`) wipes it.
- **`resource` render-fetches no-op on the server.** `run()` guards with `hasWindow()` — resources embedded in a server-rendered tree never trigger network calls. `mutate()` is intentionally UNGUARDED: it is user-initiated (not render-time), so an SSR render never invokes it; guarding would silently drop legitimate mutations. Fetch server-side data with direct `fetch()` and pass it as `initialData`.
- **Errors propagate.** `ssr` has no try/catch; a throwing child/bind/`use` getter surfaces to the caller. (A throwing *component* does NOT propagate — `component()` catches render errors → empty fragment.)
- **Zero runtime imports.** `lib/` has only `import type` from `@hellajs/dom` (erased). Adding a runtime `@hellajs/*` import violates the package's core invariant.
- **`ssrAsync` awaits but changes nothing else.** `ssrAsync(node)` is the async counterpart to `ssr`: it awaits any Promise a resolved value (child, `bind:`, `each`, `show`) returns, then classifies exactly as `ssr`. Marker wrapping is byte-identical, so `hydrate` consumes either output unchanged. `Lazy` still renders `loading` (client-side loader) and `resource` still no-ops on the server — both unchanged; expose server data via a Promise-returning getter.

## Testing approach (`tests/`)

Import `ssr` from `@hellajs/ssr/bundle`; build HellaNodes with `html`/`ForEach`/`Transition`/`Portal`/`Lazy` from `@hellajs/dom/bundle`; reactive values from `@hellajs/core`. No `resetTestState` — `ssr` walks pure data and touches no shared mutable state. Run with `bun coverage ssr`.
