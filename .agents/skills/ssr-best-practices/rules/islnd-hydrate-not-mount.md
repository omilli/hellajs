---
title: Hydrate server HTML; never mount over it
impact: CRITICAL
impactDescription: mount calls replaceChildren on the container, wiping the server HTML and rebuilding the whole tree - a blank flash and lost DOM state on first load
tags: islands, hydrate, mount, wipe, adoption
---

## Hydrate server HTML; never mount over it

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
