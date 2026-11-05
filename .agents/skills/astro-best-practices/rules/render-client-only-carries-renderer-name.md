---
title: client:only islands carry the renderer name - client:only="astro-hellajs"
impact: MEDIUM
impactDescription: Astro skips framework detection for client-only components, so the directive must name the renderer explicitly
tags: astro, client-only, renderer-name, islands
---

## client:only islands carry the renderer name - client:only="astro-hellajs"

Astro skips server-side framework detection for `client:only` components and needs the renderer identified explicitly: `client:only="astro-hellajs"` (the name the integration registers its renderer under). Reach for `client:only` only when the component cannot execute during the server render - browser-only APIs at module scope, for instance - because it trades away the server HTML: the island renders fresh on the client and flashes in late instead of hydrating markup that is already on the page. Everything else SSRs by default and hydrates in place behind `client:load` and friends.

**Incorrect (what is wrong):**

```tsx
import type { HellaNode } from "@hellajs/dom";

// module scope touches a browser API: this component cannot run during the
// server render - and a bare client:only leaves the renderer unidentified
declare const window: Window;
const initialWidth = window.innerWidth;

export default function Width(): HellaNode {
  return <span>{String(initialWidth)}</span>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// browser state read at interaction time (a hydrated-client-only event),
// used from the page as <Width client:only="astro-hellajs" />
export default function Width(): HellaNode {
  const width = signal(0);
  return <button on:click={() => width(window.innerWidth)}>{width()}</button>;
}
```

Reference: `plugins/astro/index.mjs addRenderer` and `plugins/astro/README.md` and `examples/astro-islands/src/pages/index.astro`
