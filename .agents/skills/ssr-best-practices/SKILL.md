---
name: ssr-best-practices
description: >
  Best practices for @hellajs/ssr HTML stringification: ssr, ssr.async, ssr.stream, ssr.head, doc. Use when writing or reviewing server rendering that imports @hellajs/ssr - serializing HellaNode trees to HTML, choosing sync/async/stream by Promise shape, assembling documents with doc (mount, head, data payload), delivering CSS with cssText and the hella-css id, hoisting head entries, pairing server output with dom hydrate for islands. Covers the silent failure modes: sync ssr ships [object Promise] when a getter returns a thenable, mount over server HTML wipes it, resources never fetch during a server render, Lazy renders loading-only under the sync walk, streamed Suspense regions need a CSP nonce, the streamed head flushes before collection. Use ONLY for @hellajs/ssr stringification and document assembly - client rendering and hydration belong to dom-best-practices, reactive data fetching to resource-best-practices, the Astro renderer to astro-best-practices, JSX compiler targets to compiler-best-practices.
---

# ssr-best-practices

Grounded rules for `@hellajs/ssr`: the `ssr` callable namespace (sync `ssr(node)`, awaiting `ssr.async(node)`, progressive `ssr.stream(node)`, the `ssr.head()` collection bag) and `doc()` document assembly (string and streaming overloads). A pure stringifier with zero runtime imports - it walks a HellaNode AST to HTML, wrapping every dynamic region in `<!--[-->…<!--]-->` markers `@hellajs/dom`'s `hydrate` claims in place. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any server code importing `@hellajs/ssr` or serializing HellaNode trees to HTML.
- Choosing between `ssr`, `ssr.async`, and `ssr.stream` for a tree with async data.
- Assembling documents with `doc`: mount wrappers, head contents, the JSON data payload.
- Delivering server CSS (`cssText`, the `hella-css` id) or hoisting route head entries.
- Pairing server output with the client: `hydrate`, islands, streamed `<Suspense>` adoption.

Not for: client rendering and hydration mechanics (`dom-best-practices`), the reactive data layer (`resource-best-practices`, `core-best-practices`), the Astro renderer (`astro-best-practices`), or the JSX compiler itself (`compiler-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| render | The ssr walk | HIGH |
| doc | Document assembly | MEDIUM |
| collect | CSS and head collection | HIGH |
| islnd | Islands and hydration parity | CRITICAL |
| server | Server semantics | HIGH |

## Rules

### The ssr walk (render)

- `render-invoke-component-roots` - Pass invoked component roots to the stringifier
- `render-lazy-loading-only-sync` - Sync ssr renders Lazy as its loading fallback only
- `render-member-by-promises` - Pick the ssr member by the tree's Promise shape
- `render-portal-inline` - Render portal content inline when it must ship in the HTML
- `render-raw-html-trusted-only` - Reserve raw for trusted HTML; user content goes through interpolation
- `render-suspense-fallback-stream-only` - Suspense fallbacks ship only under ssr.stream

### Document assembly (doc)

- `doc-data-json-payload` - Ship plain JSON values through the data payload
- `doc-mount-hydrate-selector` - Mount wraps the body in the selector hydrate targets
- `doc-stream-to-response` - Encode string streams through TextEncoderStream for the wire

### CSS and head collection (collect)

- `collect-csstext-hella-css-id` - Deliver cssText through a hella-css tagged style element
- `collect-head-bag-hoist` - Hoist route head entries with the ssr.head bag
- `collect-stream-head-post-hoc` - Head collection is post-hoc under ssr.stream

### Islands and hydration parity (islnd)

- `islnd-hydrate-not-mount` - Hydrate server HTML; never mount over it
- `islnd-seed-resource-from-data` - Seed client state from the hella-data payload
- `islnd-stream-suspense-adoption` - Streamed Suspense regions need nonces and client error boundaries

### Server semantics (server)

- `server-plugin-on-server-entry` - Compile the server entry to HellaNode with the plugin
- `server-props-read-once-no-effects` - Build server trees from resolved data; props are read once and effects never run
- `server-resource-no-fetch` - Resources never fetch during a server render

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
