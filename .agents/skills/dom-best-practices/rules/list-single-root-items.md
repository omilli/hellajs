---
title: ForEach items render one root element; fragments throw
impact: HIGH
impactDescription: a use callback returning a JSX fragment throws at item build with the documented single-element error, taking down the whole list render
tags: ForEach, fragments, single root
---

## ForEach items render one root element; fragments throw

ForEach tracks exactly one DOM node per item (`keyToNode`), so the `use` callback must resolve to a single root - one element or one text node. Returning a JSX fragment (`<>...</>`) resolves to a `DocumentFragment` and throws `[dom] ForEach: use must return a single element` when that item builds, initial render or keyed reuse alike. Need multiple top-level nodes per item? Wrap them in one carrying element (often a `<li>`/`<tr>` anyway, since table structure demands it) or model the group as a nested component returning a single root.

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const rows = signal(["a", "b"]);
// Two roots per item: the fragment throws the single-element error at build.
const Table = () => (
  <tbody>
    <ForEach
      each={rows}
      use={(row: string) => (
        <>
          <tr><td>{row}</td></tr>
          <tr><td>spacer</td></tr>
        </>
      )}
    />
  </tbody>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const rows = signal(["a", "b"]);
// One root per item: the tracked node is the row itself.
const Table = () => (
  <tbody>
    <ForEach each={rows} use={(row: string) => <tr><td>{row}</td></tr>} />
  </tbody>
);
```

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`
