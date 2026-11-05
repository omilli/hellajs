---
title: Hoist route head entries with the ssr.head bag
impact: MEDIUM
impactDescription: hand-assembled head entries drift from the tree, and expecting a non-text title or style child to hoist silently leaves it in the body
tags: collect, head, hoist, title, meta
---

## Hoist route head entries with the ssr.head bag

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
