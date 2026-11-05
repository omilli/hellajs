---
title: Mount wraps the body in the selector hydrate targets
impact: MEDIUM
impactDescription: anything beyond tag/#id/.class throws, and a server wrapper the client hydrate call does not repeat points the adoption at the wrong container
tags: doc, mount, hydrate, selector
---

## Mount wraps the body in the selector hydrate targets

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
