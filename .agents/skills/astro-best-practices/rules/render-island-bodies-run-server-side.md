---
title: Island bodies execute during the server render - keep browser APIs out of the render path
impact: HIGH
impactDescription: module-scope or render-body browser API access throws during prerender (the server build has no DOM), breaking astro build
tags: astro, ssr, browser-apis, islands
---

## Island bodies execute during the server render - keep browser APIs out of the render path

The renderer's server entry calls `Component(props)` directly and stringifies the returned tree; nested component calls execute server-side too, with no DOM - the server arm compiles at the ast target (HellaNode trees for `@hellajs/ssr`, no imperative dom-runtime construction). So the function body of every server-rendered island runs at build or prerender time, and its module scope runs when the module loads: `window`/`document` access at either point throws during `astro build`. Browser-only logic belongs in event handlers (which only ever fire in the hydrated client) or behind `client:only` (which skips server execution entirely). Reading reactive state is safe - the server renders its current value.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

// module scope runs during the server render: throws - no window there
const initialWidth = window.innerWidth;
const width = signal(initialWidth);

export default function Width() {
  return <span>{width()}</span>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// browser state read at interaction time, not render time
export default function Width(): HellaNode {
  const width = signal(0);
  return <button on:click={() => width(window.innerWidth)}>{width()}</button>;
}
```

Reference: `plugins/astro/server.mjs renderToStaticMarkup` and `plugins/astro/tests/renderToStaticMarkup.test.ts` and `plugins/astro/AGENTS.md`
