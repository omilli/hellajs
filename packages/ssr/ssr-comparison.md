# HellaJS @hellajs/ssr vs. Solid / Svelte / React / Vue

A ground-up comparison based on the actual source code of `@hellajs/ssr` v2. Every HellaJS claim below was verified against `packages/ssr/lib/`. Competitor versions researched this session: Solid 1.9.14, Svelte 5.56.4, React 19.2.7 (`react-dom`), Vue 3.5.39 (`@vue/server-renderer`).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS ssr | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Rendering model | AST walk → string | Reactive render → string/stream | Compiled imperative render → string | VDOM reconcile → string/stream | Reactive render → string |
| Reactive runtime on server | No (pure read) | Yes (fine-grained) | No (compiled push) | Yes (reconciler + scheduler) | Yes (reactivity) |
| Hydration markers | `<!--[->…<!--]-->` region pairs | `data-hk` attrs + `<!--!$-->` sep | `<!--[->…<!--]-->` region pairs | `<!-- -->` sep + `<!--$--><!--/$-->` | `<!--[->…<!--]-->` region pairs |
| Streaming | No | `renderToStream` / `pipeToNodeWritable` | No (sync; `.then()` for async) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` |
| Suspense / async | No | Yes | `{#await}` | `<Suspense>` | `<Suspense>` |
| Output shape | `string` | `string` / stream | `{ html, head, body }` | `string` / stream | `string` (Promise) |
| Renderer gzip | ~1.15 KB | ~8 KB | ~12 KB runtime (tree-shaken) | ~49 KB | ~6.5 KB |
| External deps | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

HellaJS is the minimal sibling of this group: a single synchronous function that walks a HellaNode AST to a string with no reactive runtime, no scheduler, no reconciler. Where Solid/Vue/React bring their full client machinery to the server and Svelte brings a compiler, HellaJS brings only a stringifier, and leans on `@hellajs/dom`'s `hydrate()` (the consumer of its markers) for everything interactive.

---

## 2. Stringifier Architecture

### HellaJS

- One exported function: `ssr(node): string` — a recursive walk producing `<tag attrs>body</tag>`, with a root fragment (`tag: "$"`) concatenating its children and void elements (`area`, `br`, `img`, `input`, …) emitting no closing tag (`lib/ssr.ts`, the `VOID` set and the `ssr` function).
- Attribute serialization mirrors `@hellajs/dom`'s internal `renderProp` rules — falsy → omit, `true` → bare attribute, arrays → space-joined, else → quoted+escaped — but intentionally drops the `DIRECT_PROPS` special-case (value/checked/selected/innerHTML) because emitting `checked=""` would mean *checked* in HTML (`lib/ssr.ts`, `serializeProp`).
- Text escaping is the HTML-significant set (`& < > "`), applied to resolved interpolation and double-quoted attribute values (`lib/ssr.ts`, `escapeText`). Static template text is emitted **raw**; only *resolved* interpolation is escaped.
- Zero runtime imports. The only import is `import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom"`, erased at compile time (`lib/ssr.ts`, line 1). The package never touches the DOM, the reactive system, or a scheduler.

### Solid

- `renderToString` is synchronous; `renderToStringAsync`, `renderToStream`, and `pipeToNodeWritable` cover async and streaming (`solid-js@1.9.14/web/dist/server.js`). Solid's fine-grained reactivity genuinely runs on the server — `createSignal`/`createMemo` are evaluated and their current values serialized, so the same reactive graph that drives the client also drives the render.
- Components are rendered through the `ssr` / `ssrElement` / `resolveSSRNode` helpers, with a `data-hk` (hydration key) attribute stamped onto each element so the client can locate it during hydration.

### Svelte 5

- `render(component, { props, context })` returns `{ html, head, body }` synchronously; the result is also thenable for async work (`svelte@5.56.4/src/internal/server/Renderer.js`, `static render`). The compiler emits imperative per-component render functions that push strings onto a renderer buffer — there is no reactive runtime evaluating on the server, only generated string-concatenation code.
- Head and CSS are collected during the walk and returned as separate fields, so `<svelte:head>` and component `<style>` blocks land in the right place without caller assembly.

### React

- `renderToString` produces a complete string (synchronous, discouraged for real servers); `renderToPipeableStream` (Node) and `renderToReadableStream` (web streams) are the recommended paths (`react-dom@19.2.7`). The full client renderer — reconciler, scheduler, fiber machinery — runs server-side; the same component code path is reused.
- Streaming is paired with `<Suspense>` for progressive rendering and selective hydration: the server can flush an HTML shell, then stream in suspended subtrees as their data resolves.

### Vue 3

- `renderToString` is `async` (`@vue/server-renderer`, `renderToString.ts:70`); the returned promise resolves to the full HTML string. Vue's reactivity runs on the server — signals/refs are read at their current value during the walk.
- `renderToNodeStream` / `renderToWebStream` cover streaming, and `resolveTeleports` collects `<Teleport>` targets for separate emission (`renderToString.ts:99`).

**Verdict:** HellaJS is alone in bringing *none* of its reactive machinery to the server. Solid, React, and Vue evaluate their client reactivity during the render; Svelte offloads it to a compiler. HellaJS treats the server as a pure serialization target — the walk reads getters once and emits strings — which is the source of both its size advantage (§3) and its feature gaps (§5).

---

## 3. Bundle Size & Dependencies

|  | HellaJS ssr | Solid (web server) | Svelte (server runtime) | React (react-dom server) | Vue (@vue/server-renderer) |
|---|---|---|---|---|---|
| Renderer gzip | ~1.15 KB | ~8 KB | ~12 KB (shared, tree-shaken) | ~49 KB | ~6.5 KB |

- `@hellajs/ssr` declares zero runtime dependencies and a single type-only peer dependency on `@hellajs/dom` (`packages/ssr/package.json`). The shipped `dist/bundle.js` is ~1.15 KB gzipped (3.5 KB raw), and the `.min` variant is ~0.83 KB — the entire package is a single file.
- The other renderers carry their runtime with them. Solid's server build includes the reactive system (~8 KB gzip, `solid-js/web/dist/server.js`). React's server production bundle ships the full reconciler + scheduler (~49 KB gzip, `react-dom-server.node.production.js`). Vue splits SSR into a separate `@vue/server-renderer` package (~6.5 KB gzip) layered on the reactivity runtime. Svelte's server runtime is ~12 KB of uncompiled ESM that a bundler tree-shakes, with additional per-component compiled code generated at build time.
- HellaJS is the only one here that is a standalone stringifier rather than a renderer-with-runtime. It composes with the rest of the ecosystem — `@hellajs/dom` for the AST and `hydrate()`, `@hellajs/css` for CSS text — but ships none of them in its own bundle. The cost is paid by the caller choosing to assemble the document; the benefit is that a server needing only `ssr()` adds ~1 KB and nothing else.

---

## 4. Hydration Markers

This is the load-bearing section: the markers a stringifier emits are the contract its hydrator consumes, and the format choice ripples into payload size, client complexity, and interop.

HellaJS wraps every dynamic region — a reactive child, an `isDynamic` component (`ForEach`/`Transition`/`Portal`/`Lazy`), or a nested fragment — in `<!--[-->` … `<!--]-->` and leaves static elements and text unwrapped (`lib/ssr.ts`, `MARK_OPEN`/`MARK_CLOSE` and the `walkChild` dispatcher). The HTML parser turns each comment into a `Comment` node; the client's `hydrate()` walks those comments to locate each region in place, never inferring structure and never rebuilding coalesced text.

The same `<!--[-->` / `<!--]-->` pair is used by both Vue and Svelte, verified from source this session:

- **Vue 3.5.39** — `server-renderer/src/render.ts:254` emits `<!--[-->` to open a fragment, `:261` emits `<!--]-->` to close it. Empty vnodes use `<!---->` (`:217`).
- **Svelte 5.56.4** — `src/constants.js:23,28` define `HYDRATION_START = '['` and `HYDRATION_END = ']'`; `internal/server/hydration.js:3-6` compose them into `BLOCK_OPEN = <!--[-->` and `BLOCK_CLOSE = <!--]-->`. Svelte adds `<!--[!-->` for the `{#await}` else branch and `<!--$uid-->` for binding IDs.

Solid and React take a different shape:

- **Solid 1.9.14** — does not use comment-pair region markers. It stamps a `data-hk` hydration-key attribute on each element (`getHydrationKey`, `solid-js/web/dist/server.js`), uses `<!--!$-->` as a separator between adjacent primitives, `<!--xs-->` as an end-of-stream terminator after the `_$HY` hydration script, and `<!--!$${id}-->` / `<!--!$/${id}-->` for streaming placeholders. (Note: the comment-pair `<!--#-->`/`<!--/-->` shape sometimes attributed to Solid is not present in the 1.9.x server output.)
- **React 19.2.7** — emits `<!-- -->` as a text separator between adjacent text nodes (`ReactFizzConfigDOM.js:1114`), `<!--$-->`/`<!--/$-->` to bound completed `<Suspense>` segments (`:4577`, `:4584`), `<!--$?-->` with a `<template id>` for pending segments (`:4579`), `<!--$!-->` for client-rendered segments (`:4583`), plus `<!--F!-->`/`<!--F-->` form-state and `<!--&-->`/`<!--/&-->` activity markers.

The practical consequence: HellaJS, Vue, and Svelte share a hydration contract a reader can recognize across frameworks, where every dynamic region is an explicit bracketed extent. Solid's attribute-stamping scales naturally to large static subtrees (one `data-hk` per element, no per-region comments) but bloats the attribute payload. React's comment density is the highest of the group because every adjacent-text boundary and every suspense segment is marked, which is the price of its streaming + selective-hydration model. HellaJS's choice to mark only dynamic regions and leave static elements unwrapped keeps the payload minimal while remaining readable — it adopted the format Vue and Svelte already converge on, rather than inventing a fourth.

---

## 5. Streaming, Async & Suspense

HellaJS is synchronous end to end. `ssr()` walks the tree once, resolves each getter at its current value, and returns a string — no effect scheduling, no batching, no promise awaiting (`lib/ssr.ts`, the `ssr` and `resolveValue` functions). `Lazy` renders its `loading` fallback and never awaits its loader; `resource` no-ops its fetch pipeline on the server (the `run()` fetch path is guarded by `hasWindow()` in `@hellajs/resource`), so embedded resources never trigger network calls. The caller resolves data with direct `fetch()` before building the tree.

Every competitor here offers a streaming or async path HellaJS lacks:

- **React** — `renderToPipeableStream` flushes an HTML shell immediately and streams suspended subtrees as their data resolves, paired with `<Suspense>` for selective client hydration. This is the most mature streaming model in the group.
- **Solid** — `renderToStream` / `pipeToNodeWritable` emit chunks as the reactive graph resolves, with `<!--!$id-->` placeholders filled in when islands complete.
- **Vue** — `renderToNodeStream` / `renderToWebStream` stream the render; `<Suspense>` gates async subtrees.
- **Svelte** — `render()` is synchronous, but the returned object is thenable, so async dependencies (compiled `{#await}`) resolve before the final string is produced. There is no real-time streaming of partial HTML.

This is the sharpest honest gap. A HellaJS server cannot flush a shell while data loads, cannot stream a long list as it renders, and cannot gate subtrees on async resolution — it must gather all data first, then serialize. For SEO-first and content sites that is a reasonable trade; for a data-heavy dashboard with slow upstream services, the streaming/Suspense model of React or Solid is a genuine capability HellaJS does not match. Mitigating this is deliberately out of scope for the stringifier — the package's stated contract is a pure walk, and streaming would require a scheduler and an async walker, both of which the zero-runtime invariant rules out.

---

## 6. Control Flow & Reactive Reads on the Server

HellaJS handles the four `isDynamic` control-flow components through `renderDynamic`, which dispatches on an `fn.ssr.kind` descriptor rather than executing the component's client logic (`lib/ssr.ts`, `renderDynamic`):

- `forEach` — resolves `each` (calling it if it is a getter), maps each item through `use(item, index)` into `walkChild`, and concatenates the results in array order. Keys are irrelevant server-side; there is no reconciliation to do.
- `transition` — renders `children` when `show` is truthy, nothing otherwise (enter/leave animations are client-only).
- `portal` — renders nothing, because there is no document to teleport into.
- `lazy` — renders `props.loading` if present, never calls `loader`.

Reactive reads are deliberately one-shot. The `bind:` directive resolves each getter exactly once and serializes its current value as an attribute; there is no subscription, no effect, and no subsequent update (`lib/ssr.ts`, the `bind` loop in `ssr`). A signal placed in a *static* attribute (plain `props`, not `bind:`) is not auto-resolved — it is stringified as a function, matching dom's `renderProp` — so reactive attributes must opt in via `bind:`. User-authored components (`component()`) expand to a HellaNode at template time and become plain recursion; an `isDynamic` function with no `ssr` descriptor renders as nothing rather than throwing.

The competitors' control flow is richer but heavier. Solid's `<For>`, `<Show>`, `<Switch>`, and `<Suspense>` all run their reactive logic server-side. Svelte's `{#each}`, `{#if}`, `{#await}` compile to imperative push calls in the generated render function — closest in spirit to HellaJS's "walk and concatenate," except the code is generated per-component at build time rather than interpreted from a shared walker. React and Vue evaluate their full control-flow primitives (`map`, conditionals, `<Suspense>`, `<Transition>`) through their runtimes. HellaJS's `renderDynamic` is the most austere of the group: four kinds, no keys, no animation, no async, just serialization — which is both why it fits in one file and why it cannot express anything streaming-related.

---

## 7. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Streaming response | No | `renderToStream` / `pipeToNodeWritable` | No (sync; thenable) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` / `renderToWebStream` |
| Suspense / async boundaries | No | `<Suspense>` islands | `{#await}` | `<Suspense>` | `<Suspense>` |
| Head / document management | Manual (caller assembles) | `<Head>` / Meta | Automatic (`render` returns `head`) | Manual (framework-dependent) | Manual (`useHead` / library) |
| CSS extraction | Manual (`@hellajs/css` text) | `<Style>` / `@once` | Automatic (`render` returns `css`) | Manual / styled-components SSR | Collected component styles |
| Server data fetching | `resource` no-ops; `fetch()` directly | `createResource` (runs on server) | `load` / module context | Server Components / `fetch` | `serverPrefetch` / `loadResource` |
| Keyed list rendering | `ForEach` (order only; no keys needed) | `<For>` keyed | `{#each}` keyed | array reconciliation | `v-for` keyed |
| Conditional rendering | `Transition` (show truthy) | `<Show>` / `<Switch>` | `{#if}` | conditional render | `v-if` |
| Lazy / async components | `Lazy` (loading fallback only) | `lazy` + `<Suspense>` | dynamic import + `{#await}` | `React.lazy` + `<Suspense>` | `defineAsyncComponent` |
| Portal / Teleport | `Portal` (renders nothing) | `Portal` | — | `createPortal` | `<Teleport>` (`resolveTeleports`) |
| HTML escaping | `& < > "` (`escapeText`) | `escape` / `escapeHTML` | `escape_html` | automatic | automatic |
| Void elements | `VOID` set (no closing tag) | yes | yes | yes | yes |
| Runtime dependencies | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

### Notable HellaJS differentiators

- Zero runtime imports — the only stringifier in this group with no reactive/reconciler/scheduler runtime; `@hellajs/dom` is a type-only peer erased at compile time — `(lib/ssr.ts)`.
- Single ~1.15 KB file — the entire package is one walker plus co-located helpers, with no `internal/` split because nothing meets the placement criteria — `(lib/ssr.ts)`.
- Minimal, position-correct markers — only dynamic regions (reactive child, `isDynamic` component, nested fragment) are wrapped; static elements and text carry no comment payload — `(lib/ssr.ts)`, `walkChild`.
- Honest attribute semantics — `serializeProp` mirrors dom's `renderProp` minus the IDL `DIRECT_PROPS` special-case, so `checked`/`selected` are emitted correctly rather than as presence-implying empty strings — `(lib/ssr.ts)`, `serializeProp`.
- Shared marker contract with Vue and Svelte — `<!--[-->`/`<!--]-->` is the format both Vue 3 and Svelte 5 emit, so HellaJS's hydration boundary is recognizable across frameworks — `(lib/ssr.ts)`, `MARK_OPEN`/`MARK_CLOSE`.

---

## 8. Ergonomics & Syntax

```js
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const page = (name) => html`<div><h1>Hello ${name}</h1></div>`;

const body = ssr(page('World'));
// "<div><h1>Hello World</h1></div>"
```

```js
import { signal } from '@hellajs/core';
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const count = signal(5);
const body = ssr(html`<p>Count: ${count}</p>`);
// "<p>Count: <!--[-->5<!--]--></p>"
```

The API is a single function taking the same HellaNode AST that `@hellajs/dom`'s `mount` consumes — so a component renders identically on the server and the client, differing only in whether the output is a string or live DOM. Reactivity is opt-in per attribute via `bind:`, and a bare signal reference in a child position becomes a marker-bounded region whose current value is read once. The assembly of a full document (DOCTYPE, head, CSS, body wrapper) is the caller's job — there is no `<Head>` component, no automatic style collection, no streaming wrapper.

Against the competitors, this is the most explicit surface in the group. Solid wraps rendering in `renderToString`/`renderToStream` calls with options objects. Svelte's `render(Component, { props })` returns a structured `{ html, head, body }`. React and Vue require their framework's root API (`createRoot`/`renderToString`) and produce a string or stream. HellaJS asks for the AST directly and returns a string — no options, no async, no structured output — which is the smallest possible contract and the one that composes most freely with whatever server framework is hosting it (the package's own pattern docs show `Bun.serve`, Express, and island-mount recipes, all calling `ssr()` inline).

---

## Bottom Line

Architecturally, `@hellajs/ssr` is the minimal pole of the SSR-renderer spectrum: a single synchronous stringifier with zero runtime dependencies, sharing the `<!--[-->`/`<!--]-->` marker format that Vue 3 and Svelte 5 also emit. Where Solid, React, and Vue bring their client runtimes to the server, and Svelte brings a compiler, HellaJS brings only a walk that reads current values and emits strings — then hands off to `@hellajs/dom`'s `hydrate()` for everything interactive.

What sets HellaJS apart — and no single competitor matches all of:

1. **Zero runtime imports** — a type-only `@hellajs/dom` peer and nothing else; the only stringifier here with no reactive, scheduler, or reconciler code on the server.
2. **~1.15 KB for the entire package** — one file, no `internal/` split, an order of magnitude smaller than the next-smallest renderer (Vue's 6.5 KB) and ~40× smaller than React's server bundle.
3. **Minimal position-correct markers** — only dynamic regions are wrapped in `<!--[-->`/`<!--]-->`; static elements and text carry no comment payload, keeping output tight and readable.
4. **Shared marker contract with Vue and Svelte** — the hydration boundary format HellaJS adopted is the one two of its competitors already converge on, so the contract is recognizable across frameworks rather than a proprietary invention.
5. **Honest attribute semantics out of the box** — `serializeProp` mirrors dom's `renderProp` minus the IDL property special-case, avoiding the `checked=""` footgun that naive stringifiers ship.
6. **AST-in, string-out with no options** — the smallest possible API surface, composing freely with any server host and producing the same HellaNode the client `mount`s.

Its gaps are the predictable ones: no streaming, Suspense, or async boundaries (§5); no head or CSS extraction (the caller assembles both); no built-in server data-fetching (`resource` no-ops, so data is fetched directly and passed in); `bind:` is initial-value only with no reactive updates server-side; and ecosystem maturity — far fewer SSR integrations, middleware, and framework adapters than React, Vue, or Solid. For content- and SEO-first rendering where a synchronous full-string render is acceptable, the size and contract simplicity are the argument; for streaming data-heavy UIs, the Suspense-equipped renderers remain the better fit.
