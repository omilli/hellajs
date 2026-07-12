# HellaJS @hellajs/ssr vs. Solid / Svelte / React / Vue

A ground-up comparison based on the actual source code of `@hellajs/ssr` v2. Every HellaJS claim below was verified against `packages/ssr/lib/`. Competitor versions referenced: Solid 1.9.14, Svelte 5.56.4, React 19.2.7 (`react-dom`), Vue 3.5.39 (`@vue/server-renderer`).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS ssr | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Rendering model | AST walk → string / stream | Reactive render → string/stream | Compiled imperative render → string | VDOM reconcile → string/stream | Reactive render → string |
| Reactive runtime on server | No (pure read + await) | Yes (fine-grained) | No (compiled push) | Yes (reconciler + scheduler) | Yes (reactivity) |
| Streaming | `ssrStream` (`ReadableStream<string>`) | `renderToStream` / `pipeToNodeWritable` | No (sync; `.then()` for async) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` |
| Suspense / async | `<Suspense>` (out-of-order) + `ssrAsync` | `<Suspense>` islands | `{#await}` | `<Suspense>` | `<Suspense>` |
| Hydration markers | `<!--[->…<!--]-->` region pairs + `<!--hsN-->` suspense sentinel | `data-hk` attrs + `<!--!$-->` sep | `<!--[->…<!--]-->` region pairs | `<!-- -->` sep + `<!--$--><!--/$-->` | `<!--[->…<!--]-->` region pairs |
| Output shape | `string` / `Promise<string>` / `ReadableStream<string>` | `string` / stream | `{ html, head, body }` | `string` / stream | `string` (Promise) |
| Renderer gzip | ~1.9 KB (bundle.js) / ~1.4 KB (.min) | ~8 KB | ~12 KB runtime (tree-shaken) | ~49 KB | ~6.5 KB |
| External deps | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

`@hellajs/ssr` is a stringifier, not a renderer-with-runtime. Its three walkers (`ssr`, `ssrAsync`, `ssrStream`) share one async generator that reads current values, awaits any Promise they return, and emits strings; `ssrStream` flushes a static shell before awaited values resolve, and `<Suspense>` opts a subtree into out-of-order streaming with a `fallback`-first, resolved-children-later shape. What it does *not* bring to the server is a reactive runtime, a scheduler, or a reconciler — the three things Solid, React, and Vue do bring. It leans on `@hellajs/dom`'s `hydrate()` (the consumer of its markers) for everything interactive.

---

## 2. Stringifier Architecture

### HellaJS

The package is one file (`lib/ssr.ts`) exposing three functions over a single recursive walker. `ssr(node): string` is the synchronous walk — `<tag attrs>body</tag>`, a root fragment (`tag: "$"`) concatenating its children, void elements (`area`, `br`, `img`, `input`, …, the `VOID` set) emitting no closing tag. `ssrAsync(node): Promise<string>` is a thin collect-wrapper over the same walk expressed as an async generator (`ssrNodeGen`), awaiting any Promise a resolved value returns before classifying it; the concatenated output is byte-identical to `ssr` when no value is a Promise. `ssrStream(node): ReadableStream<string>` wraps that generator in a web `ReadableStream`, enqueuing each chunk as it is produced so the static prefix ahead of an awaited value flushes before the await resolves (lib/ssr.ts).

- Attribute serialization mirrors `@hellajs/dom`'s internal `renderProp` rules — falsy → omit, `true` → bare attribute, arrays → space-joined, else → quoted+escaped — but intentionally drops the `DIRECT_PROPS` special-case (value/checked/selected/innerHTML) because emitting `checked=""` would mean *checked* in HTML (`lib/ssr.ts`, `serializeProp`).
- Text escaping is the HTML-significant set (`& < > "`), applied to resolved interpolation and double-quoted attribute values; static template text is emitted **raw**, only *resolved* interpolation is escaped (`lib/ssr.ts`, `escapeText`).
- A bare Promise in any resolved position (child, `bind:`, `each`, `show`) is awaited exactly once by `resolveAsync` / `isPromise`, which fully unwraps nested thenables in a single `await` (`lib/ssr.ts`).
- Zero runtime imports. The only import is `import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom"`, erased at compile time (`lib/ssr.ts`, line 1). All three exports share that invariant — none touches the DOM, the reactive system, or a scheduler. There is no `try/catch`: a throwing child/bind/`use` getter propagates to the caller, and under `ssrStream` a rejected Promise errors the stream (`lib/ssr.ts`).

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

**Verdict:** HellaJS alone brings *none* of its reactive machinery to the server. Solid, React, and Vue evaluate their client reactivity during the render; Svelte offloads it to a compiler. HellaJS treats the server as a pure serialization target that may `await` — the walk reads getters once (or awaits the Promise they return) and emits strings — which is the source of both its size advantage (§3) and the shape of its feature gaps (§5).

---

## 3. Bundle Size & Dependencies

|  | HellaJS ssr | Solid (web server) | Svelte (server runtime) | React (react-dom server) | Vue (@vue/server-renderer) |
|---|---|---|---|---|---|
| Renderer gzip | ~2.0 KB (bundle.js) / ~1.4 KB (.min) | ~8 KB | ~12 KB (shared, tree-shaken) | ~49 KB | ~6.5 KB |

- `@hellajs/ssr` declares zero runtime dependencies and a single type-only peer dependency on `@hellajs/dom` (`packages/ssr/package.json`). The shipped `dist/bundle.js` is ~2.0 KB gzipped (~8.4 KB raw), and the `.min` variant is ~1.4 KB gzipped (~4.0 KB raw). The source splits one public export per file (`ssr`/`ssrAsync`/`ssrStream`) plus a shared `lib/internal/` walker, but the bundler concatenates them into the single shipped `bundle.js` carrying the shared async generator (`ssrNodeGen`/`walkChildGen`/`renderDynamicGen`) and the Suspense staging path — one runtime artifact.
- The other renderers carry their runtime with them. Solid's server build includes the reactive system (~8 KB gzip, `solid-js/web/dist/server.js`). React's server production bundle ships the full reconciler + scheduler (~49 KB gzip, `react-dom-server.node.production.js`). Vue splits SSR into a separate `@vue/server-renderer` package (~6.5 KB gzip) layered on the reactivity runtime. Svelte's server runtime is ~12 KB of uncompiled ESM that a bundler tree-shakes, with additional per-component compiled code generated at build time.
- HellaJS is the only one here that is a standalone stringifier rather than a renderer-with-runtime. It composes with the rest of the ecosystem — `@hellajs/dom` for the AST and `hydrate()`, `@hellajs/css` for CSS text — but ships none of them in its own bundle. The cost is paid by the caller choosing to assemble the document; the benefit is that a server needing only `ssr()`/`ssrAsync()`/`ssrStream()` adds ~1–2 KB and nothing else. At ~1.4 KB min+gzip it is roughly a quarter of Vue's renderer and ~35× smaller than React's server bundle; against Svelte's ~12 KB shared runtime it is even smaller, though Svelte's per-component compiled code is not counted in that figure.

---

## 4. Hydration Markers

This is the load-bearing section: the markers a stringifier emits are the contract its hydrator consumes, and the format choice ripples into payload size, client complexity, and interop.

HellaJS wraps every dynamic region — a reactive child, an `isDynamic` component (`ForEach`/`Transition`/`Portal`/`Lazy`/`Suspense`), or a nested fragment — in `<!--[-->` … `<!--]-->` and leaves static elements and text unwrapped (`lib/ssr.ts`, `MARK_OPEN`/`MARK_CLOSE` and the `walkChild` / `walkChildGen` dispatchers). The HTML parser turns each comment into a `Comment` node; the client's `hydrate()` walks those comments to locate each region in place, never inferring structure and never rebuilding coalesced text. Under `ssrStream`, a `<Suspense>` region adds one HellaJS-specific marker inside the region: a sentinel comment `<!--hsN-->` (nodeValue `hsN`) carrying the id of a staged `<template id="hsN">` appended at stream end with the resolved children (`lib/ssr.ts`, `renderDynamicGen` suspense branch and the `ssrStream` `pending` flush). That sentinel is what `hydrate`'s `swapSuspenseStage` looks up to swap the fallback for the resolved children (the β contract documented in §5).

The same `<!--[-->` / `<!--]-->` pair is used by both Vue and Svelte, verified from source:

- **Vue 3.5.39** — `server-renderer/src/render.ts:254` emits `<!--[-->` to open a fragment, `:261` emits `<!--]-->` to close it. Empty vnodes use `<!---->` (`:217`).
- **Svelte 5.56.4** — `src/constants.js:23,28` define `HYDRATION_START = '['` and `HYDRATION_END = ']'`; `internal/server/hydration.js:3-6` compose them into `BLOCK_OPEN = <!--[-->` and `BLOCK_CLOSE = <!--]-->`. Svelte adds `<!--[!-->` for the `{#await}` else branch and `<!--$uid-->` for binding IDs.

Solid and React take a different shape:

- **Solid 1.9.14** — does not use comment-pair region markers. It stamps a `data-hk` hydration-key attribute on each element (`getHydrationKey`, `solid-js/web/dist/server.js`), uses `<!--!$-->` as a separator between adjacent primitives, `<!--xs-->` as an end-of-stream terminator after the `_$HY` hydration script, and `<!--!$${id}-->` / `<!--!$/${id}-->` for streaming placeholders. (The comment-pair `<!--#-->`/`<!--/-->` shape sometimes attributed to Solid is not present in the 1.9.x server output.)
- **React 19.2.7** — emits `<!-- -->` as a text separator between adjacent text nodes (`ReactFizzConfigDOM.js:1114`), `<!--$-->`/`<!--/$-->` to bound completed `<Suspense>` segments (`:4577`, `:4584`), `<!--$?-->` with a `<template id>` for pending segments (`:4579`), `<!--$!-->` for client-rendered segments (`:4583`), plus `<!--F!-->`/`<!--F-->` form-state and `<!--&-->`/`<!--/&-->` activity markers.

The practical consequence: HellaJS, Vue, and Svelte share a hydration contract a reader can recognize across frameworks, where every dynamic region is an explicit bracketed extent. HellaJS's Suspense sentinel + staged `<template>` is closest in spirit to React's `<!--$?-->` + `<template id>` pending-segment pair — both defer resolved content to a template the client swaps in — except HellaJS does the swap inside its single `hydrate` pass rather than via an inline client script. Solid's attribute-stamping scales naturally to large static subtrees (one `data-hk` per element, no per-region comments) but bloats the attribute payload. React's comment density is the highest of the group because every adjacent-text boundary and every suspense segment is marked, which is the price of its streaming + selective-hydration model. HellaJS's choice to mark only dynamic regions and leave static elements unwrapped keeps the payload minimal while staying readable — its region format matches the one Vue and Svelte emit, and it reaches for React's template-staging idea only where out-of-order streaming actually needs it.

---

## 5. Streaming, Async & Suspense

HellaJS ships three rendering modes that share one async generator (`lib/ssr.ts`, `ssrNodeGen`):

- **`ssr(node): string`** — synchronous end to end. The walk resolves each getter at its current value and returns a string; no effect scheduling, no batching, no promise awaiting. `Lazy` renders its `loading` fallback and never awaits its loader; `resource` no-ops its fetch pipeline on the server (the `run()` fetch path is guarded by `hasWindow()` in `@hellajs/resource`), so embedded resources never trigger network calls. The caller resolves data with direct `fetch()` before building the tree (`lib/ssr.ts`, `ssr` and `resolveValue`).
- **`ssrAsync(node): Promise<string>`** — the async counterpart. Any resolved value (a child, a `bind:` getter, `each`, `show`) that returns a Promise is awaited exactly once before classification; the rest of the walk is identical to `ssr`. The output and markers are byte-identical to `ssr`, so `hydrate` consumes either the same way (`lib/ssr.ts`, `ssrAsync` over `ssrNodeGen`). `<Suspense>` renders its `children` directly and drops `fallback` — everything resolves before the string returns.
- **`ssrStream(node): ReadableStream<string>`** — streaming counterpart. The generator yields chunks as the walk proceeds, so static markup ahead of an awaited Promise flushes immediately (progressive paint / TTFB). Returns a standard web `ReadableStream<string>`; pipe through `new TextEncoderStream()` for a `Response` body. Cancellation calls `gen.return()` for best-effort stop; a rejected Promise errors the stream (`lib/ssr.ts`, `ssrStream`).

`<Suspense>` is the out-of-order escape hatch, and only `ssrStream` exercises it. Under `ssrStream`, a `<Suspense>` boundary flushes its `fallback` inline, emits a sentinel comment `<!--hsN-->` carrying a `<template>` id, defers the resolved children onto a `pending` list, and at stream end appends each staged `<template id="hsN">` with the resolved HTML — nested Suspense resolves eagerly within its template (non-streaming) (`lib/ssr.ts`, `renderDynamicGen`). The client's `hydrate` then runs `swapSuspenseStage` during its single pass: it finds the sentinel, looks up the staged `<template>` by id, drops the fallback + sentinel, inserts the template's resolved children, and adopts them (`packages/dom/lib/internal/hydrate.ts`, `swapSuspenseStage`). This is the **β** model — stream-for-paint, hydrate-once — chosen over React-style per-segment selective hydration (α) because HellaJS's hydrate is a one-shot marker-reader with no per-segment reconcile, so a deferred single hydrate is cheap and α's hydrate-rework complexity is unjustified. No inline `<script>` is shipped: the swap is fully testable in HappyDOM (which does not execute innerHTML-inserted scripts) and runs inside the hydrate pass.

Against the competitors, the honest gaps are real:

- **In-order streaming for bare Promises.** `ssrStream` awaits Promises in tree order, so a slow Promise delays everything after it. React's `renderToPipeableStream` + `<Suspense>` and Solid's `renderToStream` reorder around slow subtrees; HellaJS only reorders inside an explicit `<Suspense>`. A bare awaited getter without a `<Suspense>` wrapper blocks the stream.
- **`<Suspense>` is stream-only.** Under `ssr`/`ssrAsync` a `<Suspense>` renders its children directly and drops the fallback — there is no async boundary, because those modes resolve everything before returning. Out-of-order streaming exists only via `ssrStream`.
- **No selective / per-segment client hydration.** HellaJS hydrates once, after the stream completes, swapping staged templates in that single pass. React pairs streaming with selective hydration so individual segments become interactive as they arrive; HellaJS defers all interactivity to the one hydrate. (α stays a future option layered at the swap points.)
- **No `<Suspense>` fallback transitions or nested streaming suspension semantics.** HellaJS's Suspense is a single fallback → resolved-children swap, not the richer suspended-fallback / nonce / segment-hole machinery React exposes.

For SEO-first and content sites the synchronous `ssr()` path is a reasonable trade; for data-heavy dashboards, `ssrStream` + `<Suspense>` covers the shell-first + resolve-later pattern the competitors are known for, at the cost of the explicit boundary and the single-hydrate model.

---

## 6. Control Flow & Reactive Reads on the Server

HellaJS handles the five `isDynamic` control-flow components through `renderDynamic` (sync) and `renderDynamicGen` (async generator), which dispatch on an `fn.ssr.kind` descriptor rather than executing the component's client logic (`lib/ssr.ts`):

- `forEach` — resolves `each` (calling/awaiting it if it is a getter/Promise), maps each item through `use(item, index)` into `walkChild`/`walkChildGen`, and concatenates the results in array order. Keys are irrelevant server-side; there is no reconciliation to do.
- `transition` — renders `children` when `show` is truthy, nothing otherwise (enter/leave animations are client-only).
- `portal` — renders nothing, because there is no document to teleport into.
- `lazy` — renders `props.loading` if present, never calls `loader` (the loader runs client-side after hydrate).
- `suspense` — under `ssr`/`ssrAsync` renders `children` directly (fallback dropped); under `ssrStream` emits `fallback` + a sentinel comment, defers, and stages resolved children in a `<template id="hsN">` for `hydrate` to swap in (see §5).

Reactive reads are deliberately one-shot. The `bind:` directive resolves each getter exactly once (`ssr`) or resolves-and-awaits it (`ssrAsync`/`ssrStream`) and serializes its current value as an attribute; there is no subscription, no effect, and no subsequent update (`lib/ssr.ts`, the `bind` loops in `ssr` and `ssrNodeGen`). A signal placed in a *static* attribute (plain `props`, not `bind:`) is not auto-resolved — it is stringified as a function, matching dom's `renderProp` — so reactive attributes must opt in via `bind:`. User-authored components (`component()`) expand to a HellaNode at template time and become plain recursion; an `isDynamic` function with no `ssr` descriptor renders as nothing rather than throwing.

The competitors' control flow is richer but heavier. Solid's `<For>`, `<Show>`, `<Switch>`, and `<Suspense>` all run their reactive logic server-side. Svelte's `{#each}`, `{#if}`, `{#await}` compile to imperative push calls in the generated render function — closest in spirit to HellaJS's "walk and concatenate," except the code is generated per-component at build time rather than interpreted from a shared walker. React and Vue evaluate their full control-flow primitives (`map`, conditionals, `<Suspense>`, `<Transition>`) through their runtimes. HellaJS's `renderDynamic` is the most austere of the group: five kinds, no keys, no animation, just serialization — with `suspense` the one kind that participates in out-of-order streaming and the only kind that needs async awareness.

---

## 7. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Streaming response | `ssrStream` (`ReadableStream<string>`) | `renderToStream` / `pipeToNodeWritable` | No (sync; thenable) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` / `renderToWebStream` |
| Suspense / async boundaries | `<Suspense>` (stream) + `ssrAsync` (await) | `<Suspense>` islands | `{#await}` | `<Suspense>` | `<Suspense>` |
| Head / document management | Manual (caller assembles) | `<Head>` / Meta | Automatic (`render` returns `head`) | Manual (framework-dependent) | Manual (`useHead` / library) |
| CSS extraction | Manual (`@hellajs/css` text) | `<Style>` / `@once` | Automatic (`render` returns `css`) | Manual / styled-components SSR | Collected component styles |
| Server data fetching | `resource` no-ops; `fetch()` in a getter (awaited) | `createResource` (runs on server) | `load` / module context | Server Components / `fetch` | `serverPrefetch` / `loadResource` |
| Keyed list rendering | `ForEach` (order only; no keys needed) | `<For>` keyed | `{#each}` keyed | array reconciliation | `v-for` keyed |
| Conditional rendering | `Transition` (show truthy) | `<Show>` / `<Switch>` | `{#if}` | conditional render | `v-if` |
| Lazy / async components | `Lazy` (loading fallback only) | `lazy` + `<Suspense>` | dynamic import + `{#await}` | `React.lazy` + `<Suspense>` | `defineAsyncComponent` |
| Portal / Teleport | `Portal` (renders nothing) | `Portal` | — | `createPortal` | `<Teleport>` (`resolveTeleports`) |
| HTML escaping | `& < > "` (`escapeText`) | `escape` / `escapeHTML` | `escape_html` | automatic | automatic |
| Void elements | `VOID` set (no closing tag) | yes | yes | yes | yes |
| Runtime dependencies | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

### Notable HellaJS differentiators

- Zero runtime imports across all three modes — the only stringifier in this group with no reactive/reconciler/scheduler runtime; `@hellajs/dom` is a type-only peer erased at compile time, and `ssrStream` is a plain web `ReadableStream` with no host-specific streaming lib — `(lib/ssr.ts)`.
- Streaming + Suspense with zero runtime — `ssrStream` flushes a shell before awaited values resolve and `<Suspense>` defers resolved children into a staged `<template>` the hydrator swaps in, all from the same ~1.4 KB min+gzip file no competitor's streaming path can match on size — `(lib/ssr.ts)`, `ssrStream` / `renderDynamicGen`.
- Single shared async generator — `ssr`, `ssrAsync`, and `ssrStream` are three wrappings (sync walk, collect-wrapper, stream-wrapper) over one `ssrNodeGen` walker, so marker output is byte-identical across modes and `hydrate` consumes any of them the same way — `(lib/ssr.ts)`.
- Minimal, position-correct markers — only dynamic regions (reactive child, `isDynamic` component, nested fragment) are wrapped; static elements and text carry no comment payload; the lone extra marker is the `<!--hsN-->` Suspense sentinel, and only under `ssrStream` — `(lib/ssr.ts)`, `walkChild` / `walkChildGen`.
- Honest attribute semantics — `serializeProp` mirrors dom's `renderProp` minus the IDL `DIRECT_PROPS` special-case, so `checked`/`selected` are emitted correctly rather than as presence-implying empty strings — `(lib/ssr.ts)`, `serializeProp`.
- Shared marker contract with Vue and Svelte — `<!--[->`/`<!--]-->` is the format both Vue 3 and Svelte 5 emit, so HellaJS's hydration boundary is recognizable across frameworks — `(lib/ssr.ts)`, `MARK_OPEN`/`MARK_CLOSE`.

---

## 8. Ergonomics & Syntax

```js
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const page = (name) => html`<div><h1>Hello ${name}</h1></div>`;

const body = ssr(page('World'));
// "<div><h1>Hello World</h1></div>"
```

A bare signal in a child position becomes a marker-bounded region whose current value is read once:

```js
import { signal } from '@hellajs/core';
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const count = signal(5);
const body = ssr(html`<p>Count: ${count}</p>`);
// "<p>Count: <!--[-->5<!--]--></p>"
```

For data fetched during render, `ssrAsync` awaits a Promise a getter returns, and `ssrStream` flushes the static shell before it resolves:

```js
import { html } from '@hellajs/dom';
import { ssrAsync, ssrStream } from '@hellajs/ssr';

const user = (id) => fetch(`/api/users/${id}`).then(r => r.text());

// await the whole string
const body = await ssrAsync(html`<p>${() => user(1)}</p>`);

// or stream: shell flushes, then the resolved name
const stream = ssrStream(html`<p>${() => user(1)}</p>`)
  .pipeThrough(new TextEncoderStream());
return new Response(stream, { headers: { 'content-type': 'text/html' } });
```

Out-of-order streaming wraps the async subtree in `<Suspense>` so a slow fetch does not block the rest of the page:

```jsx
import { html, Suspense } from '@hellajs/dom';
import { ssrStream } from '@hellajs/ssr';

const App = () => html`
  <div>
    <h1>Profile</h1>
    <${Suspense} fallback=${html`<p>Loading…</p>`}>
      ${() => user(1).then(name => html`<p>${name}</p>`)}
    </${Suspense}>
  </div>
`;
// ssrStream(App()) flushes "<div><h1>Profile</h1><!--[--><p>Loading…</p><!--hs0--><!--]--></div>"
// then appends <template id="hs0"><p>Ada</p></template>; hydrate swaps it in.
```

The API is three functions taking the same HellaNode AST that `@hellajs/dom`'s `mount` consumes — so a component renders identically on the server and the client, differing only in whether the output is a string, a Promise of one, or a stream. Reactivity is opt-in per attribute via `bind:`. The assembly of a full document (DOCTYPE, head, CSS, body wrapper) is the caller's job — there is no `<Head>` component, no automatic style collection, no streaming wrapper.

Against the competitors, this is the most explicit surface in the group. Solid wraps rendering in `renderToString`/`renderToStream` calls with options objects. Svelte's `render(Component, { props })` returns a structured `{ html, head, body }`. React and Vue require their framework's root API (`createRoot`/`renderToString`) and produce a string or stream. HellaJS asks for the AST directly and returns a string, a Promise, or a `ReadableStream` — no options object, no structured output — which is the smallest possible contract and the one that composes most freely with whatever server framework is hosting it (the package's own pattern docs show `Bun.serve`, Express, and island-mount recipes, all calling `ssr()`/`ssrStream()` inline).

---

## Bottom Line

Architecturally, `@hellajs/ssr` is the minimal pole of the SSR-renderer spectrum — a stringifier with zero runtime dependencies, sharing the `<!--[->`/`<!--]-->` marker format that Vue 3 and Svelte 5 also emit. "Minimal" here spans sync, async, and streaming: `ssrAsync` awaits Promise-returning values, `ssrStream` flushes a shell before they resolve, and `<Suspense>` defers resolved children into a staged `<template>` the single `hydrate` pass swaps in — all from the same type-only `@hellajs/dom` peer and the same one-file walker. Where Solid, React, and Vue bring their client runtimes to the server, and Svelte brings a compiler, HellaJS brings only a walk that reads current values (and may `await` them), then hands off to `@hellajs/dom`'s `hydrate()` for everything interactive.

What sets HellaJS apart — and no single competitor matches all of:

1. **Zero runtime imports, across sync, async, and streaming** — a type-only `@hellajs/dom` peer and nothing else; the only stringifier here with no reactive, scheduler, or reconciler code on the server, and the only streaming path that is a plain web `ReadableStream` with no host lib.
2. **~1.4 KB min+gzip for the entire package** — one file, no `internal/` split, including the async generator and Suspense staging; roughly a quarter of Vue's renderer and ~35× smaller than React's server bundle.
3. **Streaming + Suspense at stringifier cost** — `ssrStream` + `<Suspense>` deliver shell-first progressive paint and out-of-order resolution from the same tiny walker, with a β hydrate-swap (staged `<template>`, no inline script) the competitors implement with a far heavier runtime.
4. **Minimal position-correct markers** — only dynamic regions are wrapped in `<!--[->`/`<!--]-->`; static elements and text carry no comment payload, and the lone extra marker (the `<!--hsN-->` Suspense sentinel) appears only under `ssrStream`.
5. **Shared marker contract with Vue and Svelte** — the hydration boundary format HellaJS emits is the one two of its competitors converge on, so the contract is recognizable across frameworks rather than a proprietary invention.
6. **Honest attribute semantics out of the box** — `serializeProp` mirrors dom's `renderProp` minus the IDL property special-case, avoiding the `checked=""` footgun that naive stringifiers ship.
7. **AST-in, string/Promise/stream-out with no options** — the smallest possible API surface, composing freely with any server host and producing the same HellaNode the client `mount`s or `hydrate`s.

Its gaps are honest: bare-Promise streaming is in-order (a slow Promise delays everything after it unless wrapped in `<Suspense>`); `<Suspense>` is stream-only (under `ssr`/`ssrAsync` it renders children directly and drops the fallback); hydration is a single deferred pass, not React-style per-segment selective hydration; there is no head or CSS extraction (the caller assembles both); no built-in server data-fetching (`resource` no-ops, so data is fetched directly and passed in); `bind:` is initial-value only with no reactive updates server-side; and ecosystem maturity — far fewer SSR integrations, middleware, and framework adapters than React, Vue, or Solid. For content- and SEO-first rendering where a synchronous full-string render is acceptable, the size and contract simplicity are the argument; for streaming data-heavy UIs, `ssrStream` + `<Suspense>` covers the core shell-first pattern, with selective per-segment hydration the main capability HellaJS does not match.
