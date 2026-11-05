---
title: Sync ssr renders Lazy as its loading fallback only
impact: HIGH
impactDescription: the sync walk never calls the loader, so the shipped HTML shows the loading placeholder and the real component never appears server-side
tags: ssr, lazy, loader, loading, async
---

## Sync ssr renders Lazy as its loading fallback only

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
