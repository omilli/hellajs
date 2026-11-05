# ssr-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/ssr, the pure HellaNode-to-HTML stringifier: picking ssr/ssr.async/ssr.stream by the tree's Promise shape, hydration markers, doc document assembly (mount selector, head, JSON data payload), CSS delivery through cssText and the hella-css id, head hoisting with ssr.head(), islands pairing with dom hydrate, and server semantics (resource fetch no-op, read-once props). Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. The ssr walk
  - 1.1 Pass invoked component roots to the stringifier (`render-invoke-component-roots`)
  - 1.2 Sync ssr renders Lazy as its loading fallback only (`render-lazy-loading-only-sync`)
  - 1.3 Pick the ssr member by the tree's Promise shape (`render-member-by-promises`)
  - 1.4 Render portal content inline when it must ship in the HTML (`render-portal-inline`)
  - 1.5 Reserve raw for trusted HTML; user content goes through interpolation (`render-raw-html-trusted-only`)
  - 1.6 Suspense fallbacks ship only under ssr.stream (`render-suspense-fallback-stream-only`)
- 2. Document assembly
  - 2.1 Ship plain JSON values through the data payload (`doc-data-json-payload`)
  - 2.2 Mount wraps the body in the selector hydrate targets (`doc-mount-hydrate-selector`)
  - 2.3 Encode string streams through TextEncoderStream for the wire (`doc-stream-to-response`)
- 3. CSS and head collection
  - 3.1 Deliver cssText through a hella-css tagged style element (`collect-csstext-hella-css-id`)
  - 3.2 Hoist route head entries with the ssr.head bag (`collect-head-bag-hoist`)
  - 3.3 Head collection is post-hoc under ssr.stream (`collect-stream-head-post-hoc`)
- 4. Islands and hydration parity
  - 4.1 Hydrate server HTML; never mount over it (`islnd-hydrate-not-mount`)
  - 4.2 Seed client state from the hella-data payload (`islnd-seed-resource-from-data`)
  - 4.3 Streamed Suspense regions need nonces and client error boundaries (`islnd-stream-suspense-adoption`)
- 5. Server semantics
  - 5.1 Compile the server entry to HellaNode with the plugin (`server-plugin-on-server-entry`)
  - 5.2 Build server trees from resolved data; props are read once and effects never run (`server-props-read-once-no-effects`)
  - 5.3 Resources never fetch during a server render (`server-resource-no-fetch`)

## 1. The ssr walk

### 1.1 Pass invoked component roots to the stringifier

**Impact: MEDIUM** - an uninvoked component function throws at the entry instead of rendering, and a missing root throws the same guard

Every member validates its root through `assertNode` before walking: the root must be an object carrying a `tag` (a HellaNode). A component is a function, so passing it uninvoked (`ssr(App)`) throws `[ssr] ssr: node must be a HellaNode (object with a tag), received function` rather than silently serializing garbage HTML; `null`/`undefined` throw `node is required`. Invoke the component so the walk receives the AST it returned. The same guard fronts `ssr.async` and `ssr.stream` with their own member prefix in the message.

**Incorrect (what is wrong):**

```tsx
import { ssr } from "@hellajs/ssr";

const App = () => (
  <main>
    <h1>Hello</h1>
  </main>
);

// App is a function, not a HellaNode: the call throws instead of rendering.
const body = ssr(App);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

const App = () => (
  <main>
    <h1>Hello</h1>
  </main>
);

// Invoke the component: the walk recurses the HellaNode it returned.
const body = ssr(App());
```

A throwing component body does not propagate: `component()` catches render errors and emits an empty fragment, so never rely on render-time error surfacing from component internals.

Reference: `packages/ssr/lib/internal/assert.ts assertNode` and `packages/ssr/tests/ssr.test.tsx`

### 1.2 Sync ssr renders Lazy as its loading fallback only

**Impact: HIGH** - the sync walk never calls the loader, so the shipped HTML shows the loading placeholder and the real component never appears server-side

The sync walk cannot await: a `Lazy` region dispatches to its `loading` fallback (or an empty marker region when none was provided) and the loader is never called. `ssr.async` and `ssr.stream` await the loader instead and render the loaded component into the HTML, which `hydrate` then keeps in place until the client's fresh loader run replaces it (no loading flash on first paint). The loader must be server-executable (a dynamic `import()` needs a server-resolvable module); on rejection the async members render `fallback`, or reject/error the render when none is provided.

**Incorrect (what is wrong):**

```tsx
import { Lazy } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const Heavy = () => <section>Heavy content</section>;

// Sync walk: the loader is never called, so the HTML ships
// "<p>Loading...</p>" and the loaded component is missing.
const body = ssr(
  <main>
    <Lazy loader={() => Promise.resolve(Heavy)} loading={<p>Loading...</p>} />
  </main>,
);
```

**Correct (what is right):**

```tsx
import { Lazy } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const Heavy = () => <section>Heavy content</section>;

// ssr.async awaits the loader and renders the loaded component server-side;
// hydrate adopts that content with no loading flash.
const body = await ssr.async(
  <main>
    <Lazy loader={() => Promise.resolve(Heavy)} loading={<p>Loading...</p>} />
  </main>,
);
```

Use the sync call's loading-only behavior deliberately for SEO shells; use the async members whenever the Lazy content must be in the HTML.

Reference: `packages/ssr/lib/ssr.ts renderDynamic` and `packages/ssr/docs/api/ssr.mdx`

### 1.3 Pick the ssr member by the tree's Promise shape

**Impact: HIGH** - a Promise the sync walk cannot await stringifies to [object Promise] in the shipped HTML, with only a console warn to surface it

One namespace, three timing strategies: the base `ssr(node)` walks synchronously; `ssr.async(node)` awaits every Promise a resolved value returns (a reactive child, a function-ref prop, `ForEach`'s `each`, `Transition`'s `show`, `Lazy`'s loader) and resolves to the full string; `ssr.stream(node)` flushes chunks progressively. The sync walk cannot await: each thenable it meets emits one console warn and degrades in place (a Promise child or prop stringifies to `[object Promise]`, a Promise `each` renders an empty region, a Promise `show` is truthy so children still emit). All three emit byte-identical markers, so `hydrate` consumes any output unchanged; choose by data shape, never by output fear.

**Incorrect (what is wrong):**

```tsx
import { ssr } from "@hellajs/ssr";

const user = () => fetch("/api/users/1").then((r) => r.text());

// Sync walk: the getter's Promise stringifies into the shipped region as
// "[object Promise]" (one console warn per occurrence, still wrong HTML).
const body = ssr(<p>Hello {user}</p>);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

const user = () => fetch("/api/users/1").then((r) => r.text());

// ssr.async awaits the thenable, then classifies the resolved value exactly
// as the sync walk would - same markers, hydrate consumes it unchanged.
const body = await ssr.async(<p>Hello {user}</p>);
```

When every value is already resolved, keep the sync call: it carries zero Promise overhead and cannot warn.

Reference: `packages/ssr/lib/internal/resolve.ts SYNC_PROMISE_WARN` and `packages/ssr/tests/ssr.test.tsx`

### 1.4 Render portal content inline when it must ship in the HTML

**Impact: MEDIUM** - a portal serializes as an empty marker region, so relying on it for server output silently drops the content from the HTML

`Portal` teleports its children to a DOM target; there is no document on the server, so the `portal` kind of the isDynamic dispatch renders nothing - the region serializes as an empty marker pair `<!--[--><!--]-->` and never throws. Content that must appear in the server HTML (modals whose markup matters for SEO or first paint, overlays above the fold) belongs inline in the tree; keep the portal variant for the client build where a live document exists.

**Incorrect (what is wrong):**

```tsx
import { Portal } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

// The server has no #modal-root to teleport into: this serializes as an
// empty region and the terms never reach the HTML.
const body = ssr(
  <main>
    <Portal to="#modal-root">
      <div class="modal">Terms of service</div>
    </Portal>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

// Render the content inline when it must ship; the client build can move
// it after hydrate if the portal layout is still wanted.
const body = ssr(
  <main>
    <div class="modal">Terms of service</div>
  </main>,
);
```

Reference: `packages/ssr/lib/ssr.ts renderDynamic` and `packages/ssr/docs/api/ssr.mdx`

### 1.5 Reserve raw for trusted HTML; user content goes through interpolation

**Impact: CRITICAL** - raw HTML ships verbatim, so unsanitized user input through raw() is a stored XSS hole in every delivered page

The walk's escaping boundary is the child classification: static template text emits raw, but every resolved interpolation value (a signal, a getter result, a prop value) is escaped (`& < > "`) before it lands in text or an attribute. `raw()` from `@hellajs/dom` is the deliberate bypass - its string ships verbatim inside a marker-bounded region that `hydrate` adopts without binding anything inside it. Route user-supplied content through interpolation so the walk escapes it; use `raw()` only for HTML you produced or sanitized yourself (your own markdown renderer's output, a meta-framework's slot content).

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

interface Entry {
  bio: string;
}

// raw() bypasses escaping: any markup in the user-supplied bio ships
// verbatim into every delivered page - a stored XSS hole.
const renderBio = (entry: Entry) => ssr(<section>{raw(entry.bio)}</section>);
```

**Correct (what is right):**

```tsx
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

interface Entry {
  bio: string;
  panelHtml: string;
}

// User content goes through the braces (escaped); raw() is reserved for
// HTML your own pipeline produced and vouches for.
const renderEntry = (entry: Entry) =>
  ssr(
    <section>
      <p>{entry.bio}</p>
      {raw(entry.panelHtml)}
    </section>,
  );
```

Reference: `packages/ssr/lib/ssr.ts walkChild` and `packages/ssr/docs/concepts/ssr.mdx`

### 1.6 Suspense fallbacks ship only under ssr.stream

**Impact: MEDIUM** - under ssr and ssr.async the fallback is dropped and children render directly, so a carefully written skeleton never reaches the user

`<Suspense>` changes meaning with the member: under `ssr` and `ssr.async` the walk renders the boundary's children directly and drops the fallback (sync has nothing to wait for; async resolves everything before the string returns). Only `ssr.stream` stages the boundary: its `fallback` flushes inline immediately, then each resolved region streams as a `<template>` plus an inline swap script (progressive reveal). Writing a fallback for the sync or async members is dead code, not an error - nothing warns.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Under ssr.async the fallback is dropped: children render directly once
// resolved, so this skeleton never ships and nothing streams early.
const body = await ssr.async(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Only ssr.stream stages the boundary: the fallback flushes inline now,
// then the resolved region swaps in the moment its Promise settles.
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

Bare Promises outside any boundary are awaited in tree order under `ssr.stream` - a slow one delays everything after it. Wrap the slow subtree in `<Suspense>` to opt it out of in-order delivery.

Reference: `packages/ssr/lib/internal/walk.ts renderDynamicGen` and `packages/ssr/docs/api/ssr.mdx`


## 2. Document assembly

### 2.1 Ship plain JSON values through the data payload

**Impact: MEDIUM** - nested functions and signals are silently dropped by JSON.stringify (the payload ships empty), and circular structures throw before any document is produced

`doc({ data })` is a plain JSON channel, not reactive-state serialization: the value runs through `JSON.stringify` with every `<` escaped to `\u003c`, and lands as `<script type="application/json" id="hella-data">` after the mount wrapper, before `</body>`, in both the string and streaming modes. Resolve server values before passing them: a signal nested under `data` is a function, so `JSON.stringify` silently drops it (the client reads back an empty object), and a lone function or symbol as `data` throws `[ssr] doc: data must be JSON-serializable` - as does a circular structure, in both modes, before anything is returned or streamed. The client reads the payload with `JSON.parse(document.getElementById("hella-data").textContent)`.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { doc } from "@hellajs/ssr";

const user = signal({ id: 1, name: "Ada" });

// A signal is a function: nested under data it is silently dropped, so the
// payload ships {} and the client boots with no server data at all.
const page = doc({ data: { user }, body: "<h1>Hi</h1>" });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { doc } from "@hellajs/ssr";

const user = signal({ id: 1, name: "Ada" });

// Read the value out server-side: data carries plain JSON values only,
// and the client seeds its state from #hella-data on boot.
const page = doc({ data: { user: user() }, body: "<h1>Hi</h1>" });
```

Reference: `packages/ssr/lib/doc.ts` and `packages/ssr/lib/types.d.ts DocOptions`

### 2.2 Mount wraps the body in the selector hydrate targets

**Impact: MEDIUM** - anything beyond tag/#id/.class throws, and a server wrapper the client hydrate call does not repeat points the adoption at the wrong container

`doc({ mount })` parses one mount-point selector and wraps the body: `'#app'` emits `<div id="app">...</div>` (the tag defaults to `div`), `'main#app'` emits `<main id="app">`, `'.wrap.x'` joins classes in order. It accepts one optional tag, at most one `#id`, and any number of `.class` tokens - a mount point is a single wrapping element, so combinators, spaces, attribute selectors, pseudo-classes, and empty strings throw `[ssr] doc: mount supports tag/#id/.class only`. The emitted wrapper is the client contract: pass the same selector string to `hydrate(node, selector)`, which claims exactly that element instead of rebuilding it. The wrapper closes in the document suffix, so it can never be left unclosed mid-stream.

**Incorrect (what is wrong):**

```tsx
import { doc } from "@hellajs/ssr";

// Combinators throw at the call site; and even a valid wrapper the client
// does not repeat verbatim leaves hydrate pointing at nothing.
const page = doc({ mount: "div > #app", body: "<h1>Hi</h1>" });
```

**Correct (what is right):**

```tsx
import { doc } from "@hellajs/ssr";

// One selector string on both ends: doc emits <div id="app">...</div> and
// the client calls hydrate(node, "#app") against that exact wrapper.
const page = doc({ mount: "#app", body: "<h1>Hi</h1>" });
```

Omitting `mount` emits the body unwrapped - fine for fragments, wrong when the client needs a claim target.

Reference: `packages/ssr/lib/doc.ts parseMount` and `packages/ssr/docs/api/doc.mdx`

### 2.3 Encode string streams through TextEncoderStream for the wire

**Impact: MEDIUM** - doc and ssr.stream yield string chunks, and a Response body must be bytes - handing the string stream over unencoded fails when the body is consumed

Both streaming surfaces yield `ReadableStream<string>` chunks: `ssr.stream(node)` from the walk, and `doc({ body: stream })` around it (shell first, body chunks piped through, closing tags last - the suffix flushes only after every staged `<Suspense>` swap has streamed). Web `Response` bodies are byte streams, so pipe the string stream through `new TextEncoderStream()` before serving; in Node's `http` module, wrap the web stream with `Readable.fromWeb(...)` after the same encoding. Delivery stays pull-driven end to end: a slow client exerts backpressure on the walk instead of buffering the whole response.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const App = () => <main>Dashboard</main>;

// doc returns a ReadableStream of strings; a Response body must be bytes.
// The exchange fails when the body is consumed - nothing is served.
const handler = () => new Response(doc({ body: ssr.stream(App()) }));
```

**Correct (what is right):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const App = () => <main>Dashboard</main>;

// Encode the string chunks on the way out: the shell flushes first and the
// closing tags land only after the body stream (and its staged swaps) close.
const handler = () =>
  new Response(doc({ body: ssr.stream(App()) }).pipeThrough(new TextEncoderStream()), {
    headers: { "content-type": "text/html" },
  });
```

Reference: `packages/ssr/lib/doc.ts` and `packages/ssr/docs/api/ssr.mdx`


## 3. CSS and head collection

### 3.1 Deliver cssText through a hella-css tagged style element

**Impact: HIGH** - a delivered sheet without the hella-css id gives the client nothing to adopt, so hydration re-registers the same rules into a fresh element - duplicated styles and a window of unstyled content

`@hellajs/css` registers rules on the server too (`css()`, `style()`, `vars()` all work without a DOM), and `cssText()` collects the generated text after the registrations run. `ssr` never imports `@hellajs/css` - the caller assembles both sides. Deliver the collected text through a `<style>` element carrying the `hella-css` id and the client adopts it: the first registration after hydration finds the existing element, verifies the delivered rules against what the platform parsed, and claims them in place (no duplicate insert, no flash of unstyled content). A tag without the id still styles the page (class names agree) but the client registers a fresh element and the DOM carries both rule sets. When the page uses `vars()`, mirror the client's two-element split with `cssText.css()` and `cssText.vars()`, each in its own adoptable tag.

**Incorrect (what is wrong):**

```tsx
import { css, cssText } from "@hellajs/css";
import { doc } from "@hellajs/ssr";

css({ ".card": { border: "1px solid #ccc" } });

// head.styles emits a bare <style> with no hella-css id: the client cannot
// adopt the delivered sheet and registers the same rules again - duplicates.
const page = doc({
  body: '<div class="card">Hi</div>',
  head: { styles: [cssText()] },
});
```

**Correct (what is right):**

```tsx
import { css, cssText } from "@hellajs/css";
import { doc } from "@hellajs/ssr";

css({ ".card": { border: "1px solid #ccc" } });

// head.raw carries the collected text inside a hella-css tagged element;
// the client adopts it in place (no duplicate insert, no unstyled flash).
const page = doc({
  body: '<div class="card">Hi</div>',
  head: { raw: `<style id="hella-css">${cssText()}</style>` },
});
```

Reference: `packages/css/docs/api/csstext.mdx` and `packages/ssr/docs/api/ssr.mdx`

### 3.2 Hoist route head entries with the ssr.head bag

**Impact: MEDIUM** - hand-assembled head entries drift from the tree, and expecting a non-text title or style child to hoist silently leaves it in the body

`ssr.head()` returns a fresh bag (`{ meta: [], links: [], styles: [] }`), structurally what `doc({ head })` consumes. Pass it as `{ head }` to any member and the walk hoists the tree's `<title>`/`<meta>`/`<link>`/`<style>` elements into it instead of emitting them - so a route component owns its head entries. Collection rules: `<title>` text children concatenate into `head.title` with the last title winning; `<meta>`/`<link>` attribute maps append in order with falsy values dropped; `<style>` text appends unescaped; and only text children hoist for `<title>`/`<style>` - any other child (an element) leaves the tag rendered in the body rather than silently dropped.

**Incorrect (what is wrong):**

```tsx
import { ssr } from "@hellajs/ssr";

const Brand = () => <span>Site</span>;

const head = ssr.head();

// Only text children hoist for <title>: this element-child title stays
// rendered inline in the body and head.title never gets set.
const body = ssr(
  <div>
    <title>
      <Brand />
    </title>
    <h1>Profile</h1>
  </div>,
  { head },
);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

const head = ssr.head();

// Text-child title hoists (last title wins); meta/link attribute maps
// append with falsy values dropped; the hoisted tags leave the body.
const body = ssr(
  <div>
    <title>Profile - Ada</title>
    <meta name="description" content="Ada's profile" />
    <link rel="canonical" href="/users/1" />
    <h1>Ada</h1>
  </div>,
  { head },
);
```

Without `{ head }`, head-eligible elements render inline exactly as before the option existed.

Reference: `packages/ssr/lib/internal/head.ts hoistHead` and `packages/ssr/docs/api/ssr.mdx`

### 3.3 Head collection is post-hoc under ssr.stream

**Impact: MEDIUM** - a streamed document emits its head up front, so entries the walk collects later - title included - never join it and the page ships without them

The `{ head }` bag fills as the walk proceeds on every member, but a streamed document emits its `<head>` prefix before any body chunk: whatever the walk collects later (including staged `<Suspense>` swaps that keep filling the bag) arrives after the head is already on the wire. Under streaming the bag is post-hoc inspection only. Declare the head entries on `doc` explicitly - either statically, or by running one non-streaming pass (`ssr`/`ssr.async`) with `{ head }` over the same tree first and handing the filled bag to `doc`. Note the second walk re-reads every getter: use it only when the tree genuinely owns its head entries and the getters are cheap or pure.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const Page = () => (
  <main>
    <title>Dashboard</title>
    <h1>Dashboard</h1>
  </main>
);

// The streamed document's <head> flushes before the walk reaches the
// <title>: the collected entry never joins it and the page ships untitled.
const head = ssr.head();
const page = doc({ body: ssr.stream(Page(), { head }), head });
```

**Correct (what is right):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const Page = () => (
  <main>
    <title>Dashboard</title>
    <h1>Dashboard</h1>
  </main>
);

// One non-streaming pass fills the bag first; doc then emits the collected
// head up front and the streamed body follows.
const head = ssr.head();
await ssr.async(Page(), { head });
const page = doc({ body: ssr.stream(Page()), head });
```

Reference: `packages/ssr/lib/types.d.ts StreamOptions` and `packages/ssr/docs/api/ssr.mdx`


## 4. Islands and hydration parity

### 4.1 Hydrate server HTML; never mount over it

**Impact: CRITICAL** - mount calls replaceChildren on the container, wiping the server HTML and rebuilding the whole tree - a blank flash and lost DOM state on first load

The server HTML is the source of truth on the client. `mount(component, selector)` runs `replaceChildren` on the container and rebuilds the tree from scratch - pointing it at the server-rendered container discards the shipped markup, everything flashes, and any user state held in that subtree's DOM is gone. `hydrate(node, selector)` (`@hellajs/dom`) is the pairing call: it re-executes the same compiled build against the existing DOM, locates each `<!--[-->…<!--]-->` marker region the stringifier emitted, and binds effects, handlers, and state in place without replacing nodes. Weaker enhancement modes stay available when full hydration is not wanted: `$ref`/`$collection` bind individual existing nodes, and an island `mount`s into an empty placeholder (`<div id="slot"></div>`) the template left for it.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

const App = () => (
  <main>
    <h1>Hello</h1>
  </main>
);

// mount replaces the container's children: the server HTML is discarded
// and the whole tree rebuilds client-side - a flash on every first load.
mount(App, "#app");
```

**Correct (what is right):**

```tsx
import { hydrate } from "@hellajs/dom";

const App = () => (
  <main>
    <h1>Hello</h1>
  </main>
);

// hydrate claims the server's marker regions in place - the same build,
// the same initial state, nothing rebuilt.
hydrate(<App />, "#app");
```

Full re-mount over server HTML is appropriate only for throwaway SEO-only content. The client build must be the same compiled tree with the same initial signal values - hydration mismatches warn and fresh-mount the region.

Reference: `packages/ssr/AGENTS.md` and `packages/ssr/tests/hydrate-integration.test.tsx` and `examples/ssr-islands/src/client.tsx`

### 4.2 Seed client state from the hella-data payload

**Impact: HIGH** - rendering server data but shipping no payload forces the client to refetch from zero - a loading flash laid over markup that already showed the answer

Server-fetched values ride along through `doc({ data })`: the payload ships as `<script type="application/json" id="hella-data">` (with `<` escaped so no string breaks out), and the client recovers it in one line - `JSON.parse(document.getElementById("hella-data").textContent)`. Use that value to seed client state before hydration: a `resource` gets it as `initialData` (starting populated, consistent with the server HTML, no refetch on boot - see `resource-best-practices` for the resource side), plain signals initialize from it directly. Without the channel, the client boots empty and refetches what the server already knew.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// The server HTML shows the user, but no payload ships: the client boots
// with nothing and refetches from zero over fully rendered markup.
const user: User = await fetch("/api/users/1").then((r) => r.json());
const page = doc({ body: ssr(<h1>Hello {user.name}</h1>) });
```

**Correct (what is right):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr, doc } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// Ship the fetched value; the client seeds the resource with initialData
// read from #hella-data and starts consistent with the server HTML.
const user: User = await fetch("/api/users/1").then((r) => r.json());
const page = doc({ body: ssr(<h1>Hello {user.name}</h1>), data: { user } });
```

Signals, functions, and class instances do not transfer - resolve them to plain values server-side first (see the data payload rule).

Reference: `packages/ssr/docs/api/doc.mdx` and `packages/ssr/docs/concepts/ssr.mdx`

### 4.3 Streamed Suspense regions need nonces and client error boundaries

**Impact: HIGH** - a strict Content-Security-Policy blocks every inline swap script so regions stay on their fallbacks, and an isolated rejection surfaces only at a client error boundary that may not exist

Under `ssr.stream`, a `<Suspense>` boundary flushes its `fallback` inline, then streams the resolved children as a `<template id="hsN">` followed by an inline `<script>$hs("hsN")</script>` that swaps the fallback out the moment the region arrives (a one-time `$hs` bootstrap precedes them). Two client-facing obligations follow. First, the swap scripts are inline: under a strict `Content-Security-Policy` (no `unsafe-inline`) the browser blocks them and every region stays on its fallback until hydrate re-suspends it - pass `{ nonce }` to `ssr.stream` and mirror the same value in the response header. Second, a rejecting region is isolated server-side: its `<template>` is skipped (fallback and sentinel stay), the stream completes with its healthy siblings, and `hydrate` re-suspends the failed region on the client where the rejection reaches the nearest `onError`/`error:fallback` boundary - ship one, or the rejection is unhandled.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// No nonce: under a strict CSP the browser blocks every inline $hs swap
// script and each region stays frozen on its fallback.
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Thread the nonce onto every inline script the stream emits (the $hs
// bootstrap and each per-region swap); mirror it in the response header.
const nonce = crypto.randomUUID();
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
  { nonce },
);
```

Bare Promises are a different failure class: a rejected bare Promise in the main walk errors the stream itself (see the member-choice rule).

Reference: `packages/ssr/lib/ssrStream.ts` and `packages/ssr/tests/hydrate-integration.test.tsx`


## 5. Server semantics

### 5.1 Compile the server entry to HellaNode with the plugin

**Impact: HIGH** - the stringifier consumes compiled HellaNode ASTs, so a server entry that skips the transform carries uncompiled JSX and the render never sees a tree

`ssr` serializes a HellaNode AST; JSX becomes one only through the hellajs compile step (`vite-plugin-hellajs`, `rollup-plugin-hellajs`, or `hellajs-compiler`'s `transform` directly). The transform must run on the **server** entry - it is a compile-time pass, and wiring it into the client build alone leaves the server arm with raw JSX: the module fails to load under plain `node`, or the value handed to `ssr` is not a HellaNode and the entry guard throws. The targets differ per arm and both matter: the client compiles to `target: "dom"` (imperative runtime construction), the server to `target: "ast"` (the HellaNode shape `@hellajs/ssr` walks).

**Incorrect (what is wrong):**

```ts
// A stand-in for the plugin factory; the point is where the plugin lands.
const hella = () => ({ name: "hellajs" });

// The plugin never reaches the server arm: the server entry (ssrLoadModule /
// the ssr environment) still carries raw JSX, so import fails or ssr
// receives something without a tag.
const clientOnly = {
  plugins: [hella()],
  build: { rollupOptions: { input: "/src/client.tsx" } },
};
```

**Correct (what is right):**

```ts
// vite.config - the plugin runs on every environment, so the client arm
// compiles to the dom target and the server arm to the AST the
// stringifier walks; keep it in the pipeline for both.
import { defineConfig } from "vite";
import hella from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [hella()],
});
```

Bundling the server with esbuild instead? Apply `hellajs-compiler`'s `transform(source, { target: "ast" })` as an onLoad plugin for the server entry - see `examples/ssr-islands/build.mjs`.

Reference: `packages/ssr/docs/api/ssr.mdx` and `examples/ssr-islands/build.mjs`

### 5.2 Build server trees from resolved data; props are read once and effects never run

**Impact: MEDIUM** - mutations after the walk change nothing and effects never fire server-side, so render logic that relies on reactive updates silently renders the wrong snapshot

A server render is one synchronous (or awaited) walk: each reactive child and each function-ref prop is read once at its current value, there is no effect scheduling, no batching, and no re-render when a signal later changes. Mutating a signal after the call returns changes nothing in the produced string - the walk already consumed its snapshot. Resolve server data before building the tree (fetch, then construct the nodes), keep function-ref props at a stable initial value, and leave every reactive subscription - `effect`, watchers, event wiring - to the client build that hydrates the markup.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { ssr } from "@hellajs/ssr";

const count = signal(5);
const body = ssr(<p>Count: {count}</p>);

// The walk already returned: this write changes nothing in the shipped
// string, and no effect would have fired even before it.
count(6);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

interface Stats {
  count: number;
}

// Resolve the data first, then build the tree from it; reactive wiring
// belongs to the client build that hydrates this HTML.
async function render() {
  const stats: Stats = await fetch("/api/stats").then((r) => r.json());
  return ssr(<p>Count: {stats.count}</p>);
}
```

For data that must resolve during render, a Promise-returning getter under `ssr.async` is the supported path - see the member-choice rule.

Reference: `packages/ssr/lib/internal/resolve.ts resolveValue` and `packages/ssr/docs/api/ssr.mdx`

### 5.3 Resources never fetch during a server render

**Impact: HIGH** - the fetch pipeline is window-guarded, so a resource embedded in a server-rendered tree stays undefined and the HTML renders empty or throws

`resource` is a reactive UI primitive; its `run()` guards on window presence as its first line, so on a server the fetcher never runs, focus and polling listeners never arm, and a resource embedded in a server-rendered tree renders with `data()` undefined forever - reading `.name` off it throws mid-walk. Produce render-time data outside the resource: fetch server-side with direct `fetch()` (or your data layer), then either render the value directly or hand it to the resource as `initialData` so it starts populated and the client continues from there. `mutate` is intentionally unguarded - it is user-initiated, so an SSR render never invokes it; never call it during render anyway. The full resource-side contract (scopes, keys, cache) is `resource-best-practices`.

**Incorrect (what is wrong):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr } from "@hellajs/ssr";

const user = resource(() => fetch("/api/users/1").then((r) => r.json()));

// The server walk never fetches: data() stays undefined, so this render
// throws reading .name - and no listener ever arms to fix it later.
const body = ssr(<h1>Hello {() => user.data()?.name}</h1>);
```

**Correct (what is right):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// Server code fetches directly and seeds the resource with initialData:
// the HTML renders the name and the client starts from the same value.
async function render(serverUser: User) {
  const user = resource(() => fetch("/api/users/1").then((r) => r.json()), {
    initialData: serverUser,
  });
  return ssr(<h1>Hello {() => user.data()?.name}</h1>);
}
```

Under `ssr.async`, a Promise-returning getter is the alternative path for server data - it awaits without any resource involvement.

Reference: `packages/ssr/AGENTS.md` and `packages/ssr/docs/api/ssr.mdx`

