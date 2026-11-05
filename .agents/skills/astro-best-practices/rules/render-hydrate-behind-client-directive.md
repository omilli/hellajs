---
title: Give every interactive island a client:* directive - no directive means static HTML
impact: CRITICAL
impactDescription: a directive-less component renders once server-side and ships as static HTML: its handlers never attach and its signals live for exactly one render
tags: astro, hydration, client-directives, islands
---

## Give every interactive island a client:* directive - no directive means static HTML

A HellaJS component used in a `.astro` page always renders server-side (`renderToStaticMarkup` runs `Component(props)` and stringifies via `@hellajs/ssr`, `<!--[-->…<!--]-->` markers intact). Hydration happens only behind Astro's `client:*` directives: `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`. Without a directive the component's server HTML ships and nothing more - the click handler never attaches. All directives hydrate identically (the markers survive every directive's deferred island serialization); pick by eagerness, not by capability. Use a directive on every component whose interactivity matters; leave it off only for genuinely static output.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

// island code cannot hydrate itself: without a client:* directive on the
// element in the .astro page, this renders once as inert HTML
export default function Counter({ initial = 0 }: { initial?: number }) {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// the island component - identical under client:load / idle / visible / media
export default function Counter({ initial = 0 }: { initial?: number }): HellaNode {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

Used as `<Counter client:load initial={0} />` in the `.astro` page.

Reference: `plugins/astro/client.mjs` and `plugins/astro/server.mjs renderToStaticMarkup` and `examples/astro-islands/src/pages/index.astro`
