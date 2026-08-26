# HellaJS @hellajs/ssr vs. Solid / Svelte / React / Vue

A ground-up comparison based on the actual source code of `@hellajs/ssr` v2. Every HellaJS claim below was verified against `packages/ssr/lib/`. Competitor versions researched: Solid 1.9.13 (`solid-js/web`), Svelte 5.20.0, React 19.1.0 (`react-dom` server), Vue 3.5.13 (`@vue/server-renderer`).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS ssr | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Rendering model | AST walk → string / stream | Reactive render → string/stream | Compiled imperative render → `{html,head,body}` | VDOM reconcile → string/stream | Reactive render → string |
| Reactive runtime on server | No (pure read + await) | Yes (fine-grained) | No (compiled push) | Yes (reconciler + scheduler) | Yes (reactivity) |
| Streaming | `ssr.stream` (`ReadableStream<string>`) | `renderToStream` / `pipeToNodeWritable` | No (sync; result is thenable) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` / `renderToWebStream` |
| Suspense / async | `<Suspense>` (stream) + `ssr.async` (await) | `<Suspense>` | `{#await}` | `<Suspense>` | `<Suspense>` |
| Hydration markers | `<!--[->…<!--]-->` region pairs + `<!--hsN-->` Suspense sentinel | `data-hk` attrs + `<!--!$-->` sep | `<!--[->…<!--]-->` region pairs | `<!-- -->` sep + `<!--$--><!--/$-->` segments | `<!--[->…<!--]-->` region pairs |
| Output shape | `string` / `Promise<string>` / `ReadableStream<string>` | `string` / stream | `{ html, head, body }` | `string` / stream | `string` (Promise) |
| Renderer gzip | ~3.4 KB (bundle.js) / ~2.6 KB (.min) | ~8 KB | ~10 KB (shared, tree-shaken) | ~41 KB | ~6 KB |
| External deps | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

`@hellajs/ssr` is a stringifier, not a renderer-with-runtime. Its three walkers — `ssr` (synchronous), `ssr.async` (await Promises), `ssr.stream` (flush a shell, then resolve) — read current values, await any Promise a resolved value returns, and emit strings; `ssr.stream` flushes the static prefix ahead of an awaited value, and a `<Suspense>` boundary opts a subtree into out-of-order streaming with a fallback-first, resolved-children-later shape. What it does *not* bring to the server is a reactive runtime, a scheduler, or a reconciler — the three things Solid, React, and Vue do bring. It leans on `@hellajs/dom`'s `hydrate()` (the consumer of its markers) for everything interactive, and on the separate `doc()` helper for document assembly.

---

## 2. Stringifier Architecture

### HellaJS

The package is one public name per file over a shared async walker. `ssr(node): string` (`lib/ssr.ts`) is the synchronous recursive walk — `<tag attrs>body</tag>`, a root fragment (`tag: "$"`) concatenating its children, void elements (`area`, `br`, `img`, `input`, …, the `VOID` set) emitting no closing tag. `ssr.async(node): Promise<string>` (`lib/ssrAsync.ts`, `@internal`, attached as the `ssr.async` member) is a thin collect-wrapper over the shared async generator `ssrNodeGen`, awaiting any Promise a resolved value returns before classifying it; its concatenated output is byte-identical to `ssr` when no value is a Promise. `ssr.stream(node): ReadableStream<string>` (`lib/ssrStream.ts`, `@internal`, attached as the `ssr.stream` member) wraps that generator in a web `ReadableStream`, enqueuing each chunk as it is produced so the static prefix ahead of an awaited value flushes before the await resolves. The shared async machinery — `ssrNodeGen`, `walkChildGen`, `walkChildrenGen`, `renderDynamicGen`, the `MARK_OPEN`/`MARK_CLOSE` constants, and the `PendingSwap` staging list — lives under `lib/internal/walk.ts`; the synchronous `walkChild`/`walkChildren`/`renderDynamic` live co-located in `lib/ssr.ts` and are kept in manual parity with their async twins (a parity invariant enforced by the `ssr-async`/`ssr-stream` parity tests).

- Attribute serialization mirrors `@hellajs/dom`'s internal `renderProp` rules — falsy → omit, `true` → bare attribute, arrays → space-joined, else → quoted+escaped — but intentionally drops the `DIRECT_PROPS` special-case (value/checked/selected/innerHTML) because emitting `checked=""` would mean *checked* in HTML (`lib/internal/serialize.ts`, `serializeProp`).
- Text escaping is the HTML-significant set (`& < > "`), applied to resolved interpolation and double-quoted attribute values; static template text is emitted **raw**, only *resolved* interpolation is escaped (`lib/internal/serialize.ts`, `escapeHtml`).
- A bare Promise in any resolved position (child, function-ref prop, `each`, `show`) is awaited exactly once by `resolveAsync` / `isPromise`, which fully unwraps nested thenables in a single `await` (`lib/internal/resolve.ts`).
- Zero runtime imports. Every `lib/*.ts` stringifier carries only `import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom"`, erased at compile time (`lib/ssr.ts:1`, mirrored in `lib/ssrAsync.ts` and `lib/ssrStream.ts`). None touches the DOM, the reactive system, or a scheduler. There is no `try/catch` in `ssr` or `ssr.async`: a throwing child/bind/`use` getter propagates to the caller, and under `ssr.stream` a rejected Promise errors the stream (the `try/catch` there exists only to route a throw into `controller.error()`, which `ReadableStream` semantics require).

### Solid

- `renderToString` is synchronous; `renderToStringAsync`, `renderToStream`, and `pipeToNodeWritable` cover async and streaming (`solid-js@1.9.13/web/dist/server.js`). Solid's fine-grained reactivity genuinely runs on the server — `createSignal`/`createMemo` are evaluated and their current values serialized, so the same reactive graph that drives the client also drives the render.
- Components render through the `ssr` / `ssrElement` / `resolveSSRNode` helpers, with a `data-hk` hydration-key attribute stamped onto each element (`getHydrationKey`, `server.js:541-542`) so the client can locate it during hydration.

### Svelte 5

- `render(component, { props })` returns `{ html, head, body }` synchronously, and the result is also thenable for async work (`svelte@5.20.0/src/internal/server/index.js:101`, the return at `:147-150`). The compiler emits imperative per-component render functions that push strings onto a renderer buffer — there is no reactive runtime evaluating on the server, only generated string-concatenation code.
- Head and CSS are collected during the walk and returned as separate fields, so `<svelte:head>` and component `<style>` blocks land in the right place without caller assembly.

### React

- `renderToString` produces a complete string (synchronous, discouraged for real servers); `renderToPipeableStream` (Node) and `renderToReadableStream` (web streams) are the recommended paths (`react-dom@19.1.0`). The full client renderer — reconciler, scheduler, fiber machinery — runs server-side; the same component code path is reused. The Node server production bundle is ~226 KB raw / ~41 KB gzipped (`cjs/react-dom-server.node.production.js`).
- Streaming is paired with `<Suspense>` for progressive rendering and selective hydration: the server can flush an HTML shell, then stream in suspended subtrees as their data resolves.

### Vue 3

- `renderToString` is `async` (`@vue/server-renderer`, `renderToString.ts`); the returned promise resolves to the full HTML string. Vue's reactivity runs on the server — refs/reactive state are read at their current value during the walk.
- `renderToNodeStream` / `renderToWebStream` cover streaming, and `resolveTeleports` collects `<Teleport>` targets for separate emission.

**Verdict:** HellaJS alone brings *none* of its reactive machinery to the server. Solid, React, and Vue evaluate their client reactivity during the render; Svelte offloads it to a compiler. HellaJS treats the server as a pure serialization target that may `await` — the walk reads getters once (or awaits the Promise they return) and emits strings — which is the source of both its size advantage (§3) and the shape of its feature gaps (§5).

---

## 3. Bundle Size & Dependencies

|  | HellaJS ssr | Solid (web server) | Svelte (server runtime) | React (react-dom server) | Vue (@vue/server-renderer) |
|---|---|---|---|---|---|
| Renderer gzip | ~3.4 KB (bundle.js) / ~2.6 KB (.min) | ~8 KB | ~10 KB (shared, tree-shaken) | ~41 KB | ~6 KB |

- `@hellajs/ssr` declares zero runtime dependencies and a single type-only peer dependency on `@hellajs/dom` (`packages/ssr/package.json`). The shipped `dist/bundle.js` is ~14.2 KB raw / ~3.4 KB gzipped, and `bundle.min.js` is ~7.5 KB raw / ~2.6 KB gzipped (`dist/sizes.json`). The source splits one public name per file (`ssr`/`ssr.async`/`ssr.stream`/`doc`) plus a shared `lib/internal/` layer (`walk`/`resolve`/`serialize`/`head`), but the bundler concatenates them into a single shipped `bundle.js` carrying the shared async generator (`ssrNodeGen`/`walkChildGen`/`renderDynamicGen`), the Suspense staging path, and the shared head builder — one runtime artifact, ~2.6 KB min+gzip.
- The other renderers carry their runtime with them. Solid's server build includes the reactive system (~8 KB gzip, `solid-js/web/dist/server.js`). React's server production bundle ships the full reconciler + scheduler (~41 KB gzip, `cjs/react-dom-server.node.production.js`). Vue splits SSR into a separate `@vue/server-renderer` package (~6 KB gzip) layered on the reactivity runtime. Svelte's shared server runtime is ~10 KB of uncompiled ESM that a bundler tree-shakes, with additional per-component compiled code generated at build time.
- HellaJS is the only one here that is a standalone stringifier rather than a renderer-with-runtime. It composes with the rest of the ecosystem — `@hellajs/dom` for the AST and `hydrate()`, `@hellajs/css` for CSS text — but ships none of them in its own bundle. The caller composes the head explicitly and `doc()` (`lib/doc.ts`) assembles the document skeleton (escaping, void elements, body or mount wrapper); the benefit is that a server needing only `ssr()`/`ssr.async()`/`ssr.stream()` (plus `doc()`) adds ~2.6 KB min+gzip and nothing else. At ~2.6 KB min+gzip it is still under half of Vue's renderer and ~15× smaller than React's server bundle; against Svelte's ~10 KB shared runtime it is smaller still, though Svelte's per-component compiled code is not counted in that figure.

---

## 4. Hydration Markers

This is the load-bearing section: the markers a stringifier emits are the contract its hydrator consumes, and the format choice ripples into payload size, client complexity, and interop.

HellaJS wraps every dynamic region — a reactive child, an `isDynamic` component (`ForEach`/`Transition`/`Portal`/`Lazy`/`Suspense`), or a nested fragment — in `<!--[-->` … `<!--]-->` and leaves static elements and text unwrapped (`lib/internal/walk.ts`, `MARK_OPEN`/`MARK_CLOSE`, and the `walkChild` / `walkChildGen` dispatchers). The HTML parser turns each comment into a `Comment` node; the client's `hydrate()` walks those comments to locate each region in place, never inferring structure and never rebuilding coalesced text. Under `ssr.stream`, a `<Suspense>` region adds one HellaJS-specific marker inside the region: a sentinel comment `<!--hsN-->` (nodeValue `hsN`) carrying the id of a staged `<template id="hsN">` appended at stream end with the resolved children (`lib/internal/walk.ts`, `renderDynamicGen` suspense branch; `lib/ssrStream.ts`, the `pending` flush loop). That sentinel is what `hydrate`'s `swapSuspenseStage` looks up as the no-script fallback; in a browser an inline `$hs` script swaps each region the moment its `<template>` arrives (see §5).

The same `<!--[-->` / `<!--]-->` pair is used by both Vue and Svelte, verified from source:

- **Vue 3.5.13** — `server-renderer/src/render.ts:253` emits `push('<!--[-->')` to open a `Fragment` (`case Fragment:` at `:248`), and `:260` emits `push('<!--]-->')` to close it.
- **Svelte 5.20.0** — `src/constants.js:21,24` define `HYDRATION_START = '['` and `HYDRATION_END = ']'`; `src/internal/server/hydration.js:3,5` compose them into `BLOCK_OPEN = <!--[-->` and `BLOCK_CLOSE = <!--]-->`. Svelte adds `BLOCK_OPEN_ELSE = <!--[!-->` (`constants.js:23`, `HYDRATION_START_ELSE = '[!'`) for the `{#await}` else branch.

Solid and React take a different shape:

- **Solid 1.9.13** — does not use comment-pair region markers. It stamps a `data-hk` hydration-key attribute on each element (`getHydrationKey`, `server.js:541-542`), uses `<!--!$-->` as a separator between adjacent primitives, `<!--pl-${key}-->` and `<!--!$${id}-->` / `<!--!$/${id}-->` for streaming placeholders, and `<!--xs-->` as an end-of-stream terminator after the inline `_$HY` hydration script (`server.js:625`, `generateHydrationScript`). (The comment-pair `<!--#-->`/`<!--/-->` shape sometimes attributed to Solid is not present in the 1.9.x server output.)
- **React 19.1.0** — emits `<!-- -->` as a text separator between adjacent text nodes (`ReactFizzConfigDOM.js:877`), `<!--$-->`/`<!--/$-->` to bound completed `<Suspense>` segments (`:4034`, `:4041`), `<!--$?--><template id="…">` for pending segments (`:4019`, `:4036`), `<!--$!-->` for client-rendered segments (`:4040`), plus `<!--F!-->`/`<!--F-->` form-state markers (`:1921-1922`).

The practical consequence: HellaJS, Vue, and Svelte share a hydration contract a reader can recognize across frameworks, where every dynamic region is an explicit bracketed extent. HellaJS's Suspense sentinel + staged `<template>` is closest in spirit to React's `<!--$?-->` + `<template id>` pending-segment pair — both defer resolved content to a template the client swaps in — HellaJS now swaps each region via an inline `$hs` script the moment its template arrives (React `$RC` / Solid `_$HY` parity); `hydrate` later adopts the already-swapped nodes. Solid's attribute-stamping scales naturally to large static subtrees (one `data-hk` per element, no per-region comments) but bloats the attribute payload and requires shipping the `_$HY` hydration script inline. React's comment density is the highest of the group because every adjacent-text boundary and every suspense segment is marked, which is the price of its streaming + selective-hydration model. HellaJS's choice to mark only dynamic regions and leave static elements unwrapped keeps the payload minimal while staying readable — its region format matches the one Vue and Svelte emit, and it reaches for React's template-staging idea only where out-of-order streaming actually needs it.

---

## 5. Streaming, Async & Suspense

HellaJS ships three rendering modes. Two of them — `ssr.async` and `ssr.stream` — share one async generator (`lib/internal/walk.ts`, `ssrNodeGen`); `ssr` is a separate synchronous walker whose `walkChild`/`renderDynamic` are kept in byte-identical parity with their async twins via parity tests:

- **`ssr(node): string`** (`lib/ssr.ts`) — synchronous end to end. The walk resolves each getter at its current value and returns a string; no effect scheduling, no batching, no promise awaiting. `Lazy` renders its `loading` fallback and never awaits its loader; `resource` no-ops its fetch pipeline on the server (the `run()` fetch path is guarded by `hasWindow()` in `@hellajs/resource`), so embedded resources never trigger network calls. The caller resolves data with direct `fetch()` before building the tree (`lib/internal/resolve.ts`, `resolveValue`).
- **`ssr.async(node): Promise<string>`** (`lib/ssrAsync.ts`) — the async counterpart. Any resolved value (a child, a function-ref prop getter, `each`, `show`) that returns a Promise is awaited exactly once before classification; the rest of the walk is identical to `ssr`. The output and markers are byte-identical to `ssr`, so `hydrate` consumes either the same way (`lib/internal/walk.ts`, `ssrNodeGen` over `walkChildGen`). `<Suspense>` renders its `children` directly and drops `fallback` — everything resolves before the string returns.
- **`ssr.stream(node): ReadableStream<string>`** (`lib/ssrStream.ts`) — streaming counterpart. The generator yields chunks as the walk proceeds, so static markup ahead of an awaited Promise flushes immediately (progressive paint / TTFB). It returns a standard web `ReadableStream<string>`; pipe through `new TextEncoderStream()` for a `Response` body. Cancellation calls `gen.return()` for best-effort stop; a rejected Promise errors the stream (`lib/ssrStream.ts`, `start`/`cancel`).

`<Suspense>` is the out-of-order escape hatch, and only `ssr.stream` exercises it. Under `ssr.stream`, a `<Suspense>` boundary flushes its `fallback` inline, emits a sentinel comment `<!--hsN-->` carrying a `<template>` id, defers the resolved children onto a `pending` list, and at stream end appends each staged `<template id="hsN">` with the resolved HTML, each followed by an inline `<script>$hs("hsN")</script>` (a one-time `$hs` bootstrap precedes them) — nested Suspense resolves eagerly within its template (non-streaming) (`lib/internal/walk.ts`, `renderDynamicGen`; `lib/ssrStream.ts`, the `pending` flush). Each staged `<template>` is followed by an inline `<script>$hs("hsN")</script>` (a one-time `$hs` bootstrap precedes them) that swaps the fallback for the resolved children the moment it arrives — progressive reveal, React/Solid parity. `hydrate` then adopts the already-swapped nodes; its `swapSuspenseStage` (`packages/dom/lib/internal/hydrate.ts`) is the no-script/HappyDOM fallback — it runs when the inline script hasn't (e.g. in tests, where HappyDOM does not execute innerHTML-inserted scripts). This supersedes the earlier β “stage-all, swap-at-hydrate” model: HellaJS now does progressive content reveal. The remaining gap vs React is per-segment *selective hydration of interactivity* — hydrate still runs once (handlers attach in that single pass, not per-segment as segments arrive).

Against the competitors, the honest gaps are real:

- **In-order streaming for bare Promises.** `ssr.stream` awaits Promises in tree order, so a slow Promise delays everything after it. React's `renderToPipeableStream` + `<Suspense>` and Solid's `renderToStream` reorder around slow subtrees; HellaJS only reorders inside an explicit `<Suspense>`. A bare awaited getter without a `<Suspense>` wrapper blocks the stream.
- **`<Suspense>` is stream-only.** Under `ssr`/`ssr.async` a `<Suspense>` renders its children directly and drops the fallback — there is no async boundary, because those modes resolve everything before returning. Out-of-order streaming exists only via `ssr.stream`.
- **Progressive content reveal; single-pass interactivity hydration.** Each `<Suspense>` region's content swaps in the moment it arrives via an inline `$hs` script (React/Solid parity) — but `hydrate` still runs once, so per-segment *interactivity* (handlers going live as each segment arrives — React's selective hydration) remains the gap.
- **No `<Suspense>` fallback transitions or nested streaming suspension semantics.** HellaJS's Suspense is a single fallback → resolved-children swap, not the richer suspended-fallback / nonce / segment-hole machinery React exposes.

For SEO-first and content sites the synchronous `ssr()` path is a reasonable trade; for data-heavy dashboards, `ssr.stream` + `<Suspense>` covers the shell-first + resolve-later pattern the competitors are known for, at the cost of the explicit boundary and the single-hydrate model.

---

## 6. Control Flow & Reactive Reads on the Server

HellaJS handles the five `isDynamic` control-flow components through `renderDynamic` (sync, `lib/ssr.ts`) and `renderDynamicGen` (async, `lib/internal/walk.ts`), which dispatch on an `fn.ssr.kind` descriptor rather than executing the component's client logic:

- `forEach` — resolves `each` (calling/awaiting it if it is a getter/Promise), maps each item through `use(item, index)` into `walkChild`/`walkChildGen`, and concatenates the results in array order. Keys are irrelevant server-side; there is no reconciliation to do.
- `transition` — renders `children` when `show` is truthy, nothing otherwise (enter/leave animations are client-only).
- `portal` — renders nothing, because there is no document to teleport into.
- `lazy` — renders `props.loading` if present, never calls `loader` (the loader runs client-side after hydrate).
- `suspense` — under `ssr`/`ssr.async` renders `children` directly (fallback dropped); under `ssr.stream` emits `fallback` + a sentinel comment, defers, and stages resolved children in a `<template id="hsN">` for `hydrate` to swap in (see §5).

Reactive reads are deliberately one-shot. A function-ref prop (a signal or `() => …` wrapper passed as a plain prop value) resolves exactly once via `resolveValue` (`ssr`) or resolves-and-awaits it (`ssr.async`/`ssr.stream`) and serializes its current value as an attribute; there is no subscription, no effect, and no subsequent update (`lib/ssr.ts` and `lib/internal/walk.ts`, the props loops). A *called* expression (`value={fn()}`) is evaluated once at template time and stays static — pass a signal reference or wrapper for a reactive attribute. User-authored components (`component()`) expand to a HellaNode at template time and become plain recursion; an `isDynamic` function with no `ssr` descriptor renders as an empty marker region (`<!--[--><!--]-->`) rather than throwing.

The competitors' control flow is richer but heavier. Solid's `<For>`, `<Show>`, `<Switch>`, and `<Suspense>` all run their reactive logic server-side. Svelte's `{#each}`, `{#if}`, `{#await}` compile to imperative push calls in the generated render function — closest in spirit to HellaJS's "walk and concatenate," except the code is generated per-component at build time rather than interpreted from a shared walker. React and Vue evaluate their full control-flow primitives (`map`, conditionals, `<Suspense>`, `<Transition>`) through their runtimes. HellaJS's `renderDynamic` is the most austere of the group: five kinds, no keys, no animation, just serialization — with `suspense` the one kind that participates in out-of-order streaming and the only kind that needs async awareness.

---

## 7. Document Assembly (`doc`)

`doc(options): string` (`lib/doc.ts`) assembles a rendered body and an optional head into a full HTML document string — `<!DOCTYPE html><html[ lang="…"]><head>…</head><body>…</body></html>`. It is a pure string builder with zero server-runtime coupling (no Request/Response, no host API), so it runs identically in Bun, Node, Deno, Express, and Hono. Head fields emit in declaration order — `title` (text-escaped), `meta` (void), `links` (void), `styles` (joined into one `<style>`), `scripts` (`{ src }` external or `{ content }` inline), then `raw` — each running through the same `serializeProp`/`escapeHtml` rules the stringifiers apply to attributes (`lib/internal/head.ts`, `buildHead`/`buildAttrs`/`renderVoidTags`). The `body` is the output of `ssr`/`ssr.async` placed verbatim (not re-escaped), and `<meta>`/`<link>` render void with no trailing slash.

`doc(options): ReadableStream<string>` (`lib/doc.ts`) is the streaming counterpart: it emits the same shell first (`<!DOCTYPE html>`, the head, an optional `mount` wrapper), pipes each body chunk through as it arrives, then the closing tags — nothing is collected, so progressive paint holds end-to-end. The head renders through the same `buildHead` as `doc`'s (one builder, two assemblers — zero drift), and the suffix lands only after the body stream closes, which for an `ssr.stream` body means after every staged `<Suspense>` `<template>` has flushed. `mount` takes the selector string `hydrate(node, selector)` targets on the client (`'#app'`, `'main#app'`, `'.wrap.x'` — tag defaults to `div`, classes join in order; anything beyond tag/`#id`/`.class` throws) and emits both wrapper tags itself, so a mount can never be left unclosed mid-stream. A body-stream error errors the document stream; cancelling it cancels the body.

Against the competitors, this is explicit head assembly rather than automatic hoisting. Svelte's `render` returns `{ html, head, body }` and drains `<svelte:head>` + component `<style>` blocks automatically (`server/index.js:147-150`). Solid offers `<Head>`/`<Assets>`/`<Styles>` components collected during the render. React and Vue rely on framework-specific libraries (`react-helmet`, `useHead`) for head management. HellaJS takes the opposite stance: `doc()` does not collect `css()`/`cssVars()` calls or hoist `<head>` from the rendered tree — the caller drains the stringifier's output and passes it in. The trade is explicit control and zero coupling; the cost is that head/CSS composition is the caller's job, not the renderer's.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React | Vue 3 |
|---|---|---|---|---|---|
| Streaming response | `ssr.stream` (`ReadableStream<string>`) | `renderToStream` / `pipeToNodeWritable` | No (sync; thenable) | `renderToPipeableStream` / `renderToReadableStream` | `renderToNodeStream` / `renderToWebStream` |
| Suspense / async boundaries | `<Suspense>` (stream) + `ssr.async` (await) | `<Suspense>` | `{#await}` | `<Suspense>` | `<Suspense>` |
| Head / document management | `doc()` helper (string/stream overloads, explicit fields, no hoisting) | `<Head>` / `<Assets>` | Automatic (`render` returns `head`) | Manual (library) | Manual (`useHead` / library) |
| CSS extraction | Manual (`@hellajs/css` text via `doc` `styles`) | `<Style>` / `<Assets>` | Automatic (`render` returns `css`) | Manual / styled-components SSR | Collected component styles |
| Server data fetching | `resource` no-ops; `fetch()` in a getter (awaited) | `createResource` (runs on server) | `load` / module context | Server Components / `fetch` | `serverPrefetch` / `loadResource` |
| Keyed list rendering | `ForEach` (order only; no keys needed) | `<For>` keyed | `{#each}` keyed | array reconciliation | `v-for` keyed |
| Conditional rendering | `Transition` (show truthy) | `<Show>` / `<Switch>` | `{#if}` | conditional render | `v-if` |
| Lazy / async components | `Lazy` (loading fallback only) | `lazy` + `<Suspense>` | dynamic import + `{#await}` | `React.lazy` + `<Suspense>` | `defineAsyncComponent` |
| Portal / Teleport | `Portal` (renders nothing) | `Portal` | — | `createPortal` | `<Teleport>` (`resolveTeleports`) |
| HTML escaping | `& < > "` (`escapeHtml`) | `escape` / `escapeHTML` | `escape_html` | automatic | automatic |
| Void elements | `VOID` set (no closing tag) | yes | yes | yes | yes |
| Runtime dependencies | 0 (type-only peer) | reactive runtime | compiled + shared runtime | scheduler + reconciler | reactivity runtime |

### Notable HellaJS differentiators

- Zero runtime imports across all three modes — the only stringifier in this group with no reactive/reconciler/scheduler runtime; `@hellajs/dom` is a type-only peer erased at compile time, and `ssr.stream` is a plain web `ReadableStream` with no host-specific streaming lib — `(lib/ssr.ts)`, `(lib/ssrAsync.ts)`, `(lib/ssrStream.ts)`.
- Streaming + Suspense at stringifier cost — `ssr.stream` flushes a shell before awaited values resolve and `<Suspense>` defers resolved children into a staged `<template>` the hydrator swaps in, all from the same ~2.6 KB min+gzip package no competitor's streaming path matches on size — `(lib/ssrStream.ts)`, `(lib/internal/walk.ts)`.
- Byte-identical markers across modes via parity discipline — `ssr` (sync, `lib/ssr.ts`) and `ssr.async`/`ssr.stream` (async, over `ssrNodeGen` in `lib/internal/walk.ts`) are separate walkers whose `walkChild`/`renderDynamic` and `walkChildGen`/`renderDynamicGen` twins are kept in manual parity (enforced by the `ssr-async`/`ssr-stream` parity tests), so marker output is byte-identical and `hydrate` consumes any mode the same way.
- Minimal, position-correct markers — only dynamic regions (reactive child, `isDynamic` component, nested fragment) are wrapped; static elements and text carry no comment payload; the lone extra marker is the `<!--hsN-->` Suspense sentinel, and only under `ssr.stream` — `(lib/internal/walk.ts)`, `MARK_OPEN`/`MARK_CLOSE` and `walkChildGen`.
- Honest attribute semantics — `serializeProp` mirrors dom's `renderProp` minus the IDL `DIRECT_PROPS` special-case, so `checked`/`selected` are emitted correctly rather than as presence-implying empty strings — `(lib/internal/serialize.ts)`, `serializeProp`.
- Shared marker contract with Vue and Svelte — `<!--[->`/`<!--]-->` is the format both Vue 3 and Svelte 5 emit, so HellaJS's hydration boundary is recognizable across frameworks — `(lib/internal/walk.ts)`, `MARK_OPEN`/`MARK_CLOSE`.

---

## 9. Ergonomics & Syntax

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

For data fetched during render, `ssr.async` awaits a Promise a getter returns, and `ssr.stream` flushes the static shell before it resolves:

```js
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const user = (id) => fetch(`/api/users/${id}`).then(r => r.text());

// await the whole string
const body = await ssr.async(html`<p>${() => user(1)}</p>`);

// or stream: shell flushes, then the resolved name
const stream = ssr.stream(html`<p>${() => user(1)}</p>`)
  .pipeThrough(new TextEncoderStream());
return new Response(stream, { headers: { 'content-type': 'text/html' } });
```

Out-of-order streaming wraps the async subtree in `<Suspense>` so a slow fetch does not block the rest of the page, and `doc()` assembles the full document without collecting the stream:

```jsx
import { html, Suspense } from '@hellajs/dom';
import { ssr, doc } from '@hellajs/ssr';

const App = () => html`
  <div>
    <h1>Profile</h1>
    <${Suspense} fallback=${html`<p>Loading…</p>`}>
      ${() => user(1).then(name => html`<p>${name}</p>`)}
    </${Suspense}>
  </div>
`;
// ssr.stream(App()) flushes "<div><h1>Profile</h1><!--[--><p>Loading…</p><!--hs0--><!--]--></div>"
// then appends <template id="hs0"><p>Ada</p></template>; hydrate swaps it in.
// doc({ mount: '#app', head: { title: 'Profile' }, body: ssr.stream(App()) })
// wraps it in a full HTML document — the closing tags flush only after the staged template.
```

The API is three stringifiers taking the same HellaNode AST that `@hellajs/dom`'s `mount` consumes — so a component renders identically on the server and the client, differing only in whether the output is a string, a Promise of one, or a stream — plus the `doc()` document assembler (string or streamed body, same head builder). Reactivity is opt-in per attribute via a function-ref prop value. Against the competitors, this is the most explicit surface in the group. Solid wraps rendering in `renderToString`/`renderToStream` calls with options objects. Svelte's `render(Component, { props })` returns a structured `{ html, head, body }`. React and Vue require their framework's root API (`createRoot`/`renderToString`) and produce a string or stream. HellaJS asks for the AST directly and returns a string, a Promise, or a `ReadableStream` — no options object on the stringifiers, no structured output — which is the smallest possible contract and the one that composes most freely with whatever server framework is hosting it (the package's own pattern docs show `Bun.serve`, Express, and island-mount recipes, all calling `ssr()`/`ssr.stream()` inline).

---

## Bottom Line

Architecturally, `@hellajs/ssr` is the minimal pole of the SSR-renderer spectrum — a stringifier with zero runtime dependencies, sharing the `<!--[->`/`<!--]-->` marker format that Vue 3 and Svelte 5 also emit. "Minimal" here spans sync, async, and streaming: `ssr.async` awaits Promise-returning values, `ssr.stream` flushes a shell before they resolve, and `<Suspense>` defers resolved children into a staged `<template>` the single `hydrate` pass swaps in — all from the same type-only `@hellajs/dom` peer and one ~2.6 KB min+gzip package whose async machinery lives under `lib/internal/`. Where Solid, React, and Vue bring their client runtimes to the server, and Svelte brings a compiler, HellaJS brings only a walk that reads current values (and may `await` them), then hands off to `@hellajs/dom`'s `hydrate()` for everything interactive.

What sets HellaJS apart — and no single competitor matches all of:

1. **Zero runtime imports, across sync, async, and streaming** — a type-only `@hellajs/dom` peer and nothing else; the only stringifier here with no reactive, scheduler, or reconciler code on the server, and the only streaming path that is a plain web `ReadableStream` with no host lib.
2. **~2.6 KB min+gzip for the entire package** — one shipped bundle carrying the sync walker, the shared async generator, the Suspense staging path, and both document assemblers; still under half of Vue's renderer and ~15× smaller than React's server bundle.
3. **Streaming + Suspense at stringifier cost** — `ssr.stream` + `<Suspense>` deliver shell-first progressive paint and out-of-order resolution from the same tiny walker, with progressive inline `$hs` swaps (staged `<template>` + swap script, React/Solid parity) the competitors implement with a far heavier runtime.
4. **Byte-identical markers across modes via parity discipline** — a separate sync walker and a shared async generator, kept in parity by tests, so `ssr`/`ssr.async`/`ssr.stream` emit the same `<!--[->`/`<!--]-->` contract and `hydrate` consumes any mode unchanged.
5. **Minimal position-correct markers** — only dynamic regions are wrapped; static elements and text carry no comment payload, and the lone extra marker (the `<!--hsN-->` Suspense sentinel) appears only under `ssr.stream`.
6. **Shared marker contract with Vue and Svelte** — the hydration boundary format HellaJS emits is the one two of its competitors converge on, so the contract is recognizable across frameworks rather than a proprietary invention.
7. **Honest attribute semantics out of the box** — `serializeProp` mirrors dom's `renderProp` minus the IDL property special-case, avoiding the `checked=""` footgun that naive stringifiers ship.

Its gaps are honest: bare-Promise streaming is in-order (a slow Promise delays everything after it unless wrapped in `<Suspense>`); `<Suspense>` is stream-only (under `ssr`/`ssr.async` it renders children directly and drops the fallback); content reveals progressively via inline swaps (React/Solid parity), but interactivity hydrates in a single pass rather than React-style per-segment selective hydration; there is no automatic head or CSS extraction (`doc()` assembles a document from explicit head fields, but neither head markup nor CSS is drained from the rendered tree); no built-in server data-fetching (`resource` no-ops, so data is fetched directly and passed in); function-ref props are initial-value only with no reactive updates server-side; and ecosystem maturity — far fewer SSR integrations, middleware, and framework adapters than React, Vue, or Solid. For content- and SEO-first rendering where a synchronous full-string render is acceptable, the size and contract simplicity are the argument; for streaming data-heavy UIs, `ssr.stream` + `<Suspense>` covers the core shell-first pattern, with per-segment *interactivity* hydration (selective hydration of handlers) the main capability HellaJS does not match.
