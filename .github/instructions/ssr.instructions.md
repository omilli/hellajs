---
applyTo: "packages/ssr/**"
---

Pure HTML stringifier over `@hellajs/dom`'s HellaNode AST. Zero runtime imports from any `@hellajs/*` package (type-only `HellaNode`/`SsrMeta` imports, erased). Source truth is `lib/`; tests/docs serve it.

## Public exports (`lib/index.ts`)

| Export | Purpose |
|---|---|
| `ssr` | `ssr(node: HellaNode): string` — serialize a HellaNode AST to an HTML string. |

## Architecture (`lib/`)

| File | Purpose |
|---|---|
| `lib/ssr.ts` | The whole package. `ssr(node)` (the recursive node walker — the only export) plus co-located helpers: `walkChild` (child dispatcher), `renderDynamic` (shared isDynamic-`ssr` dispatch), `walkChildren`, `serializeProp`/`escapeText` (mirror dom's `renderProp`), `resolveValue`, and `MARK_OPEN`/`MARK_CLOSE` region wrapping. No try/catch (walk failures propagate). No `internal/` — one file, co-located single-package helpers; nothing meets the `internal/` placement criteria. |

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

`ForEach`/`Transition`/`Portal`/`Lazy` return opaque `isDynamic` closures. dom attaches `fn.ssr = { kind, props }` (`packages/dom/lib/types/nodes.d.ts` → `SsrMeta`); `renderDynamic` (shared by the direct-child and reactive-resolved paths) switches on `kind`:
- `forEach` — resolves `each` (call if function), maps `use(item, index)` → `walkChild`. Keys are irrelevant server-side.
- `transition` — resolves `show`; renders `children` when truthy, nothing otherwise.
- `portal` — renders nothing (no document to teleport into).
- `lazy` — renders `props.loading` if present; never awaits `loader`.

A user-authored isDynamic function with no `ssr` renders as nothing (not an error). User components (`component()`) expand to a HellaNode at template time, so they are plain recursion — no `ssr`.

## Non-obvious behaviors (gotchas)

- **`bind:` emits the initial value only.** `ssr` resolves each `bind` getter once (its current value); there is no reactive update. Static (`props`) attributes are NOT auto-resolved — a signal in a static attribute is stringified as a function (matches dom's `renderProp`); use `bind:` for reactive attributes.
- **Hydration markers are the contract.** `ssr()` wraps every dynamic region in `<!--[-->…<!--]-->` (see §Hydration markers). The client's [`hydrate(node, target)`](../dom) (`@hellajs/dom`) reads those `Comment` nodes to bind each region in place — never replacing server DOM. `$ref`/`$collection` and `mount(Island, "#empty-slot")` remain the lighter-enhancement alternatives. A full-tree `mount(app(), "#server-rendered")` over server HTML is a footgun — `mountNode` → `container.replaceChildren` (`packages/dom/lib/mount.ts`) wipes it.
- **`resource` render-fetches no-op on the server.** `run()` guards with `hasWindow()` — resources embedded in a server-rendered tree never trigger network calls. `mutate()` is intentionally UNGUARDED: it is user-initiated (not render-time), so an SSR render never invokes it; guarding would silently drop legitimate mutations. Fetch server-side data with direct `fetch()` and pass it as `initialData`.
- **Errors propagate.** `ssr` has no try/catch; a throwing child/bind/`use` getter surfaces to the caller. (A throwing *component* does NOT propagate — `component()` catches render errors → empty fragment.)
- **Zero runtime imports.** `lib/` has only `import type` from `@hellajs/dom` (erased). Adding a runtime `@hellajs/*` import violates the package's core invariant.

## Testing approach (`tests/`)

Import `ssr` from `@hellajs/ssr/bundle`; build HellaNodes with `html`/`ForEach`/`Transition`/`Portal`/`Lazy` from `@hellajs/dom/bundle`; reactive values from `@hellajs/core`. No `resetTestState` — `ssr` walks pure data and touches no shared mutable state. Run with `bun coverage ssr`.
