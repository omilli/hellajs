---
title: Pass invoked component roots to the stringifier
impact: MEDIUM
impactDescription: an uninvoked component function throws at the entry instead of rendering, and a missing root throws the same guard
tags: ssr, root, component, assert
---

## Pass invoked component roots to the stringifier

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
