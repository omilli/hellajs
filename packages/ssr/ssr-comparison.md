# HellaJS @hellajs/ssr vs. Solid / Svelte 5 / React 19 / Vue 3

A ground-up comparison based on the actual source code of `@hellajs/ssr` v2. Every claim below was verified against `packages/ssr/lib/`. Competitor versions researched: Solid 1.9.15, Svelte 5.56, React 19.2, Vue 3.5.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS ssr | Solid | Svelte 5 | React 19 | Vue 3 |
|---|---|---|---|---|---|
| Rendering model | HellaNode AST walk → string | Reactive render via compiled string ops | Compiled server blocks → buffer | Segment renderer (Fizz) | Vnode walk → buffered chunks |
| API surface | `ssr` / `ssr.async` / `ssr.stream` + `doc` | `renderToString` / `renderToStringAsync` / `renderToStream` | `render` (sync getters or thenable) | `renderToString` / `renderToPipeableStream` / `renderToReadableStream` / `prerender` | `renderToString` / `renderToWebWritable` |
| Sync string render | Yes | Yes | Yes | Yes — suspending throws | No — always a Promise |
| Streaming | Web `ReadableStream<string>` | Writable pipe, shell/all callbacks | None | Pipeable / readable, per-platform builds | Web / node streams, in-order |
| Out-of-order reveal | `<template>` + `$hs` script | `<template>` + `$df` script | Framework-level only | Hidden segments + `$RC`/`$RS` scripts | None at stringifier level |
| Hydration markers | `<!--[-->`/`<!--]-->` comments | `data-hk` attributes + `<!--!$-->` | `<!--[-->`/`<!--]-->` + `<!---->` | `<!--$-->` pairs + `<!-- -->` | `<!--[-->`/`<!--]-->` + teleport anchors |
| Event replay before hydrate | No | Yes (`_$HY`) | No | Yes (`hydrateRoot`) | No |
| Server→client data serialization | JSON payload — `doc({ data })` | seroval promises / resources | None (SvelteKit streams) | Flight payloads / bootstrap scripts | None (Nuxt payloads) |
| Runtime deps | 0 | 3 | 16 | 1 (+ `react` peer) | 3 |
| Host coupling | None (web streams only) | Node + web variants | None | Per-platform entry builds | Node + web variants |

HellaJS ssr is the only entry here that is a pure stringifier rather than a framework's server half — it walks a plain-object AST it does not import at runtime, emits web-standard streams with no host APIs, and leaves document assembly, routing, and serving to the caller. Solid and React match it on streaming mechanics (staged templates plus inline swap scripts) but carry their framework's serialization machinery; Svelte and Vue compile or buffer their way to a string without an out-of-order story at this layer.

---

## 2. Stringification Architecture

### HellaJS

Rendering is a one-way recursive walk over a plain-object HellaNode AST — no reactivity runs on the server, no scheduler, no component lifecycle:

- `ssr(node)` walks `<tag attrs>body</tag>`, concatenates fragment roots (`tag: "$"`), and emits void elements without closing tags (`lib/ssr.ts`). The only shared root guard, `assertNode`, rejects missing and tag-less roots up front (`lib/internal/assert.ts`).
- Reactive values are read exactly once: `resolveValue` calls a function-valued child or prop and serializes the result (`lib/internal/resolve.ts`). A function-ref prop emits its current value as an attribute; there is no second read.
- Control flow dispatches on a descriptor dom attaches to its built-ins (`fn.ssr = { kind, props }`): `forEach` maps `use` over the resolved `each`, `transition` gates on `show`, `portal` renders nothing, `lazy` awaits its loader and renders the loaded component under the async members (`loading` under sync), `suspense` renders children directly under the sync and async members (`lib/ssr.ts`, `lib/internal/walk.ts`). User components expand to plain HellaNodes at template time, so they are ordinary recursion — no `ssr`-aware wrapping.
- Escaping mirrors dom's `renderProp` rules — falsy omitted, `true` bare, arrays space-joined, strings quoted and escaped (`lib/internal/serialize.ts`) — while deliberately not mirroring `renderProp`'s IDL-property special case, since emitting `checked=""` would mean checked in HTML (`lib/internal/serialize.ts`).
- The package's defining constraint holds across every file: imports from `@hellajs/dom` are type-only and erased, so `lib/` has zero runtime imports from any `@hellajs/*` package (`lib/ssr.ts`, `lib/ssrAsync.ts`, `lib/ssrStream.ts`, `lib/internal/walk.ts`). The `raw()` child is duck-typed via `"raw" in child` precisely to preserve that invariant (`lib/ssr.ts`).

### Solid

Solid's server renderer runs the real reactive system under `sharedConfig.context`: `renderToString` creates a root, executes the component tree synchronously, and collects anything asynchronous (suspense content, resources, lazy fragments) through a seroval serializer into inline scripts appended to the HTML (solid-js 1.9.15, `web/dist/server.js`). The `ssr` tagged template is a compile-time construct — `babel-preset-solid` rewrites templates into direct string concatenation against `ssrElement`/`ssrAttribute` helpers — so the server output is compiled code, not a runtime walk. This is the closest architectural sibling to HellaJS's approach (template → string ops), with the trade that it depends on the compiler, the reactive runtime, and seroval all being present.

### Svelte 5

Svelte compiles each component twice — once for the client, once for the server — and the server build emits calls into `svelte/internal/server` block helpers (`element()`, `await_block()`, snippet and html blocks) that push strings into a renderer buffer (svelte 5.56, `src/internal/server/index.js`). `render(component)` from `svelte/server` returns a lazy object whose `html`/`head`/`body` getters trigger the synchronous render, or a thenable that awaits the tree when compiled with `experimental.async` (the `async_mode_flag`, `src/internal/server/renderer.js`). There is no reactive runtime on the server at all — the compiler already flattened reactivity into straight-line code — making Svelte the purest compile-to-string entry in the group, and the only one whose SSR output quality is decided entirely at build time.

### React 19

React renders through Fizz, a segment-based renderer: the component tree is cut into boundaries and segments tracked in resumable state, and flushed to a platform-specific write destination. The package ships per-platform entry builds (`server.node.js`, `server.bun.js`, `server.edge.js`, `server.browser.js`, verified in the 19.2.8 package), exposing `renderToPipeableStream`, `renderToReadableStream`, and — alongside the legacy `renderToString` — the `prerender`/`resume` pair for postponed, resumable partial renders (react-dom 19.2.8, `cjs/react-dom-server.node.development.js`). The legacy `renderToString` throws when a `<Suspense>` boundary suspends, with an error directing callers to `renderToPipeableStream` (verified in `cjs/react-dom-server-legacy.node.development.js`). React is the most infrastructure-complete stringifier here, and the heaviest: every render carries scheduling, segmentation, and resource-tracking machinery.

### Vue 3

Vue's server renderer walks a vnode tree produced by SSR-compiled render functions (`@vue/compiler-ssr` emits `ssrRender*` code, distinct from the client's DOM codegen). Output is pushed into nested buffers whose `hasAsync` flag controls whether unrolling awaits: `renderToString` always returns a Promise, awaiting `async setup()` and `serverPrefetch`, then resolving teleport buffers into `context.teleports` (@vue/server-renderer 3.5.42, `dist/server-renderer.esm-bundler.js`). Streaming variants (`renderToWebWritable`, `pipeToNodeWritable`) unroll the same buffer in document order. Vue sits between Svelte and React: compiled render code, like Svelte, but running through a vnode layer and runtime component machinery closer to React's model.

**Verdict:** Two camps. Svelte and HellaJS stringify a static artifact — compiled blocks or a plain AST — with no runtime reactivity on the server; Solid, React, and Vue execute live component machinery to produce HTML. HellaJS is alone in the second camp's absence *and* the first camp's flexibility: like Solid's templates it accepts runtime-authored `html\`\`` trees with no compiler, yet like Svelte's server build it drags zero framework runtime into the process.

---

## 3. Dependencies

| | HellaJS (ssr) | Solid | Svelte | React (react-dom) | Vue (@vue/server-renderer) |
|---|---|---|---|---|---|
| Runtime deps | 0 | 3 (`csstype`, `seroval`, `seroval-plugins`) | 16 (compiler toolchain) | 1 (`scheduler`) | 3 (`@vue/compiler-ssr`, `@vue/runtime-dom`, `@vue/shared`) |
| Peer deps | `@hellajs/dom` (type-only, erased) | none | none | `react` | none |

- `@hellajs/ssr` declares zero runtime dependencies and a single type-only peer (`package.json`) — the stringifier can serialize a HellaNode AST whether or not any other `@hellajs/*` package is installed in the server process, and adds nothing to the server bundle but its own code.
- Svelte's sixteen dependencies are the compiler toolchain (acorn, magic-string, esrap, zimmerframe, and friends, verified in the 5.56 package) — only relevant at build time, but unavoidable in the package. React pays `scheduler` plus a peer on `react` itself; Solid pays seroval to serialize reactive state; Vue pulls its compiler and runtime-dom.
- React is the only competitor with host-conditional entry points — a server bundler must resolve the right build per platform (`server.bun.js`, `server.edge.js`, `server.node.js`). HellaJS emits standard web `ReadableStream<string>` and plain strings, so the same code runs under Bun, Node, Deno, workers, and edge runtimes unchanged (`lib/ssrStream.ts`, `lib/doc.ts`).

---

## 4. Hydration Marker Model

This is the load-bearing decision. Every stringifier must leave enough evidence in the HTML for the client to rebind interactivity, and each library's choice reveals its hydration philosophy.

### HellaJS

Every dynamic region — a reactive child, an `isDynamic` component, a nested fragment, a `raw()` child — is wrapped in `MARK_OPEN`/`MARK_CLOSE` (`<!--[-->` / `<!--]-->`), which the browser parses to Comment nodes with nodeValue `[` / `]` that `@hellajs/dom`'s `hydrate` locates without structural inference (`lib/internal/walk.ts`, `lib/ssr.ts`). Static elements and static text are emitted unwrapped and matched by position, so a page of static markup carries zero marker bytes (`lib/ssr.ts`). The format is the same one Vue uses for its slot and fragment boundaries — chosen precisely because comment-node region bounds survive HTML parsing, delimit mixed text-and-element regions that no attribute scheme can express, and let adjacent reactive text hydrate as its own text node rather than a coalesced run (`lib/ssr.ts`, verified by the integration tests in `tests/hydrate-integration.test.ts`). Streamed `<Suspense>` regions add one sentinel comment carrying a `<template>` id, resolved by `getElementById` so emission order never matters (`lib/internal/walk.ts`, `lib/ssrStream.ts`).

### Solid

Solid marks elements, not regions: hydration keys (`data-hk="${hk}"`) are emitted as attributes via `ssrHydrationKey()`, and adjacent dynamic nodes are separated with `<!--!$-->` comments; the client hydrates by walking `data-hk`-tagged elements (solid-js 1.9.15, `web/dist/server.js`). Deferred fragments use `<!--pl-${key}-->` placeholder comments that the inline `$df` script replaces with `<template>` content on arrival. The attribute approach means every hydration-eligible element carries visible payload in the markup itself — an attribute per element versus HellaJS's two comments per dynamic region — but it also gives Solid element-identity matching rather than positional matching inside regions.

### Svelte 5

Svelte uses the same `[` / `]` comment convention as HellaJS and Vue: blocks open with `<!--[-->` (else-branches with `<!--[!-->`, failed awaits with `<!--[?-->`), close with `<!--]-->`, and empty anchors render as `<!---->` (svelte 5.56, `src/internal/server/hydration.js`). The client's `hydrate` re-runs each component and walks the existing DOM against the expected structure, adopting matching nodes. The marker vocabularies are near-identical; the difference is scope — Svelte's markers wrap every compiled block, HellaJS wraps every region dom's hydrator needs and nothing else.

### React 19

React encodes lifecycle state into comments: completed boundaries as `<!--$-->`/`<!--/$-->`, pending boundaries as `<!--$?-->` followed by `<template id="B:…">`, client-rendered boundaries as `<!--$!-->`, and resumable-in-progress boundaries as `<!--$~-->`; adjacent text from separate expressions is separated with `<!-- -->` (react-dom 19.2.8, `cjs/react-dom-server.node.development.js` — `startPendingSuspenseBoundary1 = '<!--$?--><template id="'`, `textSeparator`). Streamed segments arrive as `<div hidden id="S:…">` blocks flushed after the shell, and inline `$RC`/`$RS` scripts perform the swaps, with `$RX` handling client-render fallbacks. This is the richest marker vocabulary in the group — enough for selective hydration, where `hydrateRoot` hydrates exactly the boundary a user interacted with and replays the event (verified in `cjs/react-dom-client.development.js`, `attemptExplicitHydrationTarget` over `listenToAllSupportedEvents`).

### Vue 3

Vue wraps slot outlets and fragment vnodes in `<!--[-->`/`<!--]-->` and delimits teleports with `<!--teleport start-->`/`<!--teleport end-->` anchors, collecting the teleported content into `context.teleports` for the host framework to inline (@vue/server-renderer 3.5.42, `dist/server-renderer.esm-bundler.js`). The client (`createSSRApp` + `mount`) hydrates by matching the vnode tree against the existing DOM. Vue's marker set is minimal like HellaJS's — dynamic boundaries only, static content untouched — because its hydrator, like HellaJS's, trusts element structure outside marked regions.

**Verdict:** HellaJS shares Vue's and Svelte's comment-region format but applies it at a different granularity: per dynamic region in the AST rather than per slot or per compiled block. Against Solid's attribute keys, comments cost two nodes per region but delimit text-only regions that `data-hk` cannot; against React's state-encoding comments, HellaJS's markers carry no lifecycle semantics — the pending/resolved state of a streamed region lives in the sentinel/template pair instead (`lib/internal/walk.ts`). The honest cost: HellaJS's `hydrate` is one pass, so nothing marks time the way `<!--$?-->` does, and there is no marker-level protocol for replaying pre-hydration interactions.

---

## 5. Async Rendering & Streaming

### HellaJS

One callable namespace covers three timing strategies with one output contract:

- `ssr(node)` is the synchronous walk — getters are read at their current value, Promises are stringified, not awaited (`lib/ssr.ts`); sync `ssr` warns on each thenable child/prop before emitting the stringified value.
- `ssr.async(node)` awaits any Promise a resolved value returns — child, function-ref prop, `each`, `show` — through the shared async generator, fully unwrapping nested thenables (`lib/ssrAsync.ts`, `lib/internal/walk.ts`, `lib/internal/resolve.ts`). Marker wrapping is byte-identical to the sync walk; the parity tests assert it branch-by-branch (`tests/helpers.ts`, `tests/ssr-async.test.ts`).
- `ssr.stream(node)` yields chunks as the walk proceeds, flushing static markup before each await; bare Promises are awaited in tree order (`lib/ssrStream.ts`).
- A `<Suspense>` boundary opts a subtree into out-of-order streaming: the `fallback` flushes inline, a sentinel comment marks the region, and the resolved children stream later as `<template id="hsN">` followed by an inline `<script>$hs("hsN")</script>` that swaps the region in the moment it arrives — a one-time `$hs` bootstrap precedes the templates, and the swap wraps the inserted content in a fresh marker pair so hydrate adopts it without re-evaluating the getter (`lib/ssrStream.ts`, `lib/internal/walk.ts`). Staged regions flush concurrently in completion order, not document order (`lib/ssrStream.ts`).
- Errors propagate for bare Promises: the sync walk throws, `ssr.async` rejects, and a main-walk rejection errors `ssr.stream`'s `ReadableStream` — the outer try/catch exists only because `ReadableStream` cannot throw synchronously to its consumer (`lib/ssrStream.ts`). A rejecting staged `<Suspense>` region is isolated instead: its swap's drain carries its own catch, the failed `<template>` is skipped (fallback + sentinel remain), the stream completes with its healthy siblings, and `hydrate` re-suspends the region client-side where the rejection reaches the nearest error boundary — per-boundary failure isolation at React's `$RX` client-render-fallback level (`lib/ssrStream.ts`). Cancelling the stream returns the main generator and every staged swap generator (`lib/ssrStream.ts`).

### Solid

`renderToStringAsync` races `renderToStream` against a timeout (30 s default); `renderToStream` flushes the shell, registers deferred fragments, and streams their resolution as `<template>` + `$df` replacement scripts, with `onCompleteShell`/`onCompleteAll` callbacks and `block()` promises for shell-blocking awaits (solid-js 1.9.15, `web/dist/server.js`). The capability HellaJS leaves manual: seroval serializes live Promises and resources into the HTML so the client's `createResource` resumes with server-fetched data — automatic state transfer, where HellaJS ships plain JSON via `doc({ data })` and the caller reads it back.

### Svelte 5

`svelte/server`'s `render` has no streaming mode: sync renders emit only `{#await}` pending blocks (a promise child gets `BLOCK_OPEN` and its `then` branch never runs, verified in `src/internal/server/index.js`), and the experimental async mode awaits the whole tree into one string. Out-of-order streaming exists only at the framework layer — SvelteKit streams promise values with its own script protocol. The stringifier itself is strictly collect-then-return.

### React 19

`renderToPipeableStream`/`renderToReadableStream` are the primary APIs: Suspense boundaries render fallbacks inline, resolved segments stream as hidden `<div id="S:…">` blocks, and `$RC`/`$RS` scripts swap them in with view-batching (`$RV`) that preserves ordering semantics; `$RR` resumes stylesheets by precedence before revealing content (react-dom 19.2.8, `cjs/react-dom-server.node.development.js`). `prerender` can postpone at dynamic boundaries and hand a `postponedState` to `resume` for later completion — a two-phase model none of the others ship. Combined with selective hydration and event replay on the client, React's async story is the deepest in the group.

### Vue 3

`renderToString` awaits `async setup()` and `serverPrefetch` through its buffer before returning; the stream variants (`renderToWebWritable`, `pipeToNodeWritable`) unroll the same buffer strictly in document order (@vue/server-renderer 3.5.42). There is no boundary-level fallback streaming, no inline swap script, and no out-of-order emission at the stringifier layer — a slow async component delays everything after it unless the host framework (Nuxt) layers its own protocol on top.

**Verdict:** HellaJS and Solid and React all ship the staged-template-plus-inline-script progressive-reveal mechanism; HellaJS's `$hs` is the smallest of the three (a balance-walking DOM swap, `lib/ssrStream.ts`) and the only one available with zero framework runtime attached. HellaJS's concurrent completion-order flush matches React's segment behavior. The gap against React is real: no selective hydration, no event replay, no resumable prerender. The remaining gap against Solid is automatic state transfer: `doc({ data })` ships plain JSON the caller reads explicitly, where seroval hands the client live server-resolved Promises and resources.

---

## 6. Document Assembly & Head Management

### HellaJS

`doc(options)` assembles the full document with zero server-runtime coupling — no Request/Response, no host API — in two modes discriminated by the `body` type: a string body returns a string document, a `ReadableStream<string>` body returns a streaming document that emits the shell first, pipes body chunks through, and holds the closing tags until the body closes (`lib/doc.ts`, `lib/types.d.ts`). The `mount` selector parses tag/`#id`/`.class` into the wrapper element `hydrate(node, selector)` will target on the client, throwing on anything a single wrapping element cannot express (`lib/doc.ts`). Head content renders through one shared builder for both modes — `title`, `meta`, `links`, `styles`, `scripts`, `raw` in declaration order, with the same escaping rules as the stringifier (`lib/internal/head.ts`). Head management spans both poles: caller-driven via `doc`'s options, and opt-in tree-driven via `ssr.head()` + `{ head }` — the walkers hoist the tree's `<title>`/`<meta>`/`<link>`/`<style>` into the bag (title text with last-wins, resolved attribute maps, unescaped CSS text) and omit them from the body, sync and async collecting inline while `ssr.stream` fills the bag post-hoc (a streamed document's head is emitted up front — streaming callers pass head entries explicitly) (`lib/internal/head.ts`, `lib/ssrHead.ts`). A `data` option ships plain JSON to the client as a `hella-data` payload script — caller-driven state transfer, not reactive-state serialization. The same caller-driven pole governs streaming security: `ssr.stream(node, { nonce })` threads a CSP nonce onto every inline script the stream emits — the `$hs` bootstrap and each per-region swap script (`lib/ssrStream.ts`) — so a strict `Content-Security-Policy` (no `unsafe-inline`) keeps the progressive swaps running. `@hellajs/css` server output still arrives caller-drained — pass the text to `head.styles` or embed a `<style>` whose text children hoist.

### Solid

Solid provides `Assets`/`getAssets`/`getHeadInfo` injection components the tree can populate during render, `injectAssets`/`injectScripts` placement helpers, a `generateHydrationScript` for manual embedding, and `nonce` options threaded through every emitted script (solid-js 1.9.15, `web/dist/server.js`). Head management is component-tree-driven — the opposite pole from `doc`'s explicit options object.

### Svelte 5

`<svelte:head>` is a first-class language feature: the server renderer maintains a separate head buffer per render and returns it alongside the body, so tree-driven head collection is built in and requires no options (svelte 5.56, `src/internal/server/renderer.js`). This is the most ergonomic head story in the group for tree-authored content.

### React 19

React 19's document story is resource-centric: `preinit`/`preload` calls during render plus `bootstrapScripts`/`bootstrapModules` options produce hoisted `<link>`/`<script>` tags with `data-precedence` attributes, and the `$RR` resume script flushes stylesheets in precedence order before revealing streamed boundaries (react-dom 19.2.8, `cjs/react-dom-server.node.development.js`). `<title>`/`<meta>` hoisting from the tree landed with React 19's document metadata support, handled by the Fizz renderer rather than an options object.

### Vue 3

Vue's stringifier resolves teleports into `context.teleports` and leaves placement to the host; `<head>` management is not part of `@vue/server-renderer` at all — ecosystem utilities (`@unhead` via Nuxt) own that layer (@vue/server-renderer 3.5.42).

**Verdict:** The spectrum runs from tree-driven (Svelte, React, Solid) to caller-driven (Vue, HellaJS). HellaJS's `doc` is the only entry that treats document assembly as a standalone pure function over already-rendered output — string in/string out, stream in/stream out — which is exactly right for a library that also supports island mounting and `$ref` enhancement over HTML it did not generate. Tree-driven head collection now exists on the opt-in side of the pole — `ssr.head()` + `{ head }` hoists `<title>`/`<meta>`/`<link>`/`<style>` from the tree into the bag `doc` consumes — where Svelte makes it automatic and free of options and Solid builds injection components around it. The remaining caller burden is CSS: `@hellajs/css` server output is drained by hand (or embedded as hoistable `<style>` text).

---

## 7. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React 19 | Vue 3 |
|---|---|---|---|---|---|
| Sync string render | `ssr(node)` (`lib/ssr.ts`) | `renderToString` | `render` sync getters | `renderToString` (suspending throws) | — (always async) |
| Async render (awaits) | `ssr.async(node)` (`lib/ssrAsync.ts`) | `renderToStringAsync` (30 s timeout) | `render` thenable (`experimental.async`) | — (streaming APIs await) | `renderToString` awaits setup/prefetch |
| Streaming render | `ssr.stream(node)` → web `ReadableStream` (`lib/ssrStream.ts`) | `renderToStream` (shell/all callbacks) | — | `renderToPipeableStream` / `renderToReadableStream` | `renderToWebWritable` / node stream |
| Out-of-order boundary streaming | `<Suspense>` + `$hs` script (`lib/ssrStream.ts`) | Deferred fragments + `$df` script | Framework-level (SvelteKit) | Suspense segments + `$RC`/`$RS` scripts | — |
| Completion-order flush | Concurrent staged swaps (`lib/ssrStream.ts`) | Fragment registry | n/a | Segment-based | n/a |
| Stream cancellation | Returns generator + staged swaps (`lib/ssrStream.ts`) | Pipe abort | n/a | Pipe abort | n/a |
| Document assembly | `doc` — string/stream, `mount`, head (`lib/doc.ts`) | Assets/head components + helpers | Built-in `<svelte:head>` | Bootstrap/preinit/precedence | Teleport buffers; head via ecosystem |
| Tree-driven head collection | Opt-in — `ssr.head()` bag + `{ head }` on every member (`lib/internal/head.ts`); post-hoc under `ssr.stream` | Assets/`getHeadInfo` injection | Built-in `<svelte:head>` buffer | Document-metadata hoisting (title/meta/link) | — (ecosystem `@unhead`) |
| Server→client data serialization | JSON payload script — `doc({ data })` (`lib/doc.ts`) | seroval promises/resources | — (SvelteKit streams) | Flight / bootstrap payloads | — (Nuxt payloads) |
| Event replay before hydrate | — | `_$HY` capture script | — | `hydrateRoot` selective hydration | — |
| Resumable / partial prerender | — | — | — | `prerender` + `resume` | — |
| Control flow on server | `ForEach`/`Transition`/`Portal`/`Lazy`/`Suspense` descriptors (`lib/internal/walk.ts`) | Compiled control flow | Compiled blocks | Tree-cutting boundaries | Compiled `ssrRender*` blocks |
| Invalid-root guard | `assertNode` two-tier throw (`lib/internal/assert.ts`) | — | — | — | — |
| Runtime deps | 0 | 3 | 16 | 1 (+ peer) | 3 |

### Notable HellaJS differentiators

- One output contract across three timing modes — `ssr`, `ssr.async`, and `ssr.stream` emit byte-identical marker wrapping, so `hydrate` consumes any member's output unchanged; the parity tests pin every classification branch (`lib/ssr.ts`, `lib/internal/walk.ts`, `tests/helpers.ts`).
- Zero runtime imports, type-only peer — the package stringifies a HellaNode AST without `@hellajs/dom` present in the server process (`lib/ssr.ts`, `package.json`).
- `doc`'s stream-mode suffix hold — the closing tags flush only after the body stream closes, so progressive paint holds end-to-end with staged `<Suspense>` swaps, and a reader acquired up front propagates cancellation into the body (`lib/doc.ts`).
- Marker-minimal payload — static elements and text ship unwrapped and hydrate by position; only dynamic regions pay the two-comment cost (`lib/ssr.ts`).
- Per-boundary failure isolation — a rejecting staged `<Suspense>` swap is skipped server-side (fallback + sentinel remain; the stream completes with healthy siblings) and `hydrate` re-suspends the failed region client-side where the rejection reaches the nearest error boundary (React `$RX` client-render parity) (`lib/ssrStream.ts`).
- `raw()` as an opaque, marker-bounded region — foreign HTML (e.g. a meta-framework's slot output) embeds verbatim and hydrate adopts it without binding inside (`lib/ssr.ts`).

---

## 8. Ergonomics & Syntax

One namespace, three call shapes, one assembler:

```js
import { html } from '@hellajs/dom';
import { ssr, doc } from '@hellajs/ssr';

const user = (id) => fetch(`/api/users/${id}`).then(r => r.text());
const page = (id) => html`<div><h1>Hello</h1><p>${() => user(id)}</p></div>`;

const body = ssr(page(1));                    // sync string
const asyncBody = await ssr.async(page(1));   // awaits the user() Promise
const chunks = ssr.stream(page(1));           // ReadableStream<string>

doc({ mount: '#app', head: { title: 'Home' }, body: ssr.stream(page(1)) });
// streaming document: shell first, closing tags after the last staged swap
```

The callable-namespace shape (`ssr`, `ssr.async`, `ssr.stream`) keeps the timing decision at the call site with one import, versus Solid's three named functions and React's split across `renderToString`, `renderToPipeableStream`, and platform-specific entries. Data-loading is symmetric with the client: the same function-ref convention that makes a child reactive in dom makes it awaitable on the server — a getter returning a `Promise` is simply awaited by `ssr.async` (`lib/internal/resolve.ts`) — where Solid needs `createResource` + seroval and React needs the RSC or `use()` machinery. The cost of the minimalism is explicitness: head collection from the tree is opt-in (`ssr.head()` + `{ head }`) rather than automatic, and server data ships as a plain JSON payload (`doc({ data })`) the caller reads back rather than as serialized reactive state — the caller wires each, and the docs say so plainly.

---

## Bottom Line

Architecturally, `@hellajs/ssr` is a sibling to Svelte's server build in purity (no runtime reactivity on the server) and to Solid and React in streaming mechanics (staged templates plus inline swap scripts) — while being the only one that is a standalone stringifier rather than a framework's server half. Its walk is the smallest correct one: read-once getters, descriptor-dispatched control flow, markers only where hydration needs them.

What sets HellaJS apart — and no single competitor matches all of:

1. **Zero runtime footprint** — no runtime dependencies, type-only peer import, no host APIs; the same code runs in Bun, Node, Deno, workers, and edge runtimes (`lib/ssr.ts`, `lib/doc.ts`, `package.json`).
2. **Three timing modes, one byte-identical contract** — sync, async, and streaming behind one callable namespace, all hydratable by the same marker reader, pinned by parity tests (`lib/ssr.ts`, `lib/ssrStream.ts`, `tests/helpers.ts`).
3. **Progressive out-of-order streaming at library level** — `<Suspense>` fallbacks flush inline, resolved regions swap in on arrival via `$hs`, concurrent regions flush in completion order, a rejecting region is isolated (its template is skipped and `hydrate` re-suspends it on the client — React `$RX` parity), and `doc` holds the document suffix until the last swap (`lib/ssrStream.ts`, `lib/doc.ts`).
4. **Marker-minimal hydration payload** — two comments per dynamic region, nothing on static markup, position-matched elements (`lib/ssr.ts`).
5. **Pure-function document assembly** — `doc` builds a full document from a string or a stream with no server-runtime coupling and a `mount` selector that mirrors hydrate's target (`lib/doc.ts`).

Its gaps are the predictable ones: hydration is a single pass — content reveals progressively, but there is no selective hydration and no event replay before hydrate runs (React and Solid territory), and no marker-level pending/resolved protocol. Server→client data is a plain JSON payload convention (`doc({ data })`), not seroval/Flight reactive-state transfer — the client reads it explicitly (e.g. seeding a resource's `initialData`) rather than resuming live server state. Head collection from the tree is opt-in rather than automatic (`ssr.head()` bag — and post-hoc only under `ssr.stream`), `resource` no-ops on the server, and in-order bare-Promise awaits delay trailing content unless wrapped in `<Suspense>`. And it is a stringifier, not a framework: routing, serving, and error pages are the caller's job, with the ecosystem size and adoption maturity that implies.
