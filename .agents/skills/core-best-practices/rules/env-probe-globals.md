---
title: Probe the platform with hasWindow, hasDocument, hasNavigator
impact: LOW
impactDescription: bare window, document, or navigator references throw ReferenceError or break imports in non-DOM environments
tags: env, ssr, guards
---

## Probe the platform with hasWindow, hasDocument, hasNavigator

`hasWindow()`, `hasDocument()`, and `hasNavigator()` return booleans without resolving the global, so they are safe to call and to branch on in any environment. A bare `window !== undefined` check is not: identifier resolution throws `ReferenceError` in environments without the global before any comparison runs, and top-level `window.*` access breaks SSR imports of the module. Guard every browser-only path (listeners, DOM access, user-agent checks) behind the matching probe.

**Incorrect (what is wrong):**

```ts
// Resolves the window identifier before comparing: ReferenceError under
// Node, and the same access at module top level breaks SSR imports
if (window !== undefined) {
  window.addEventListener("resize", () => {});
}
```

**Correct (what is right):**

```ts
import { hasDocument, hasNavigator, hasWindow } from "@hellajs/core";

if (hasWindow()) {
  window.addEventListener("resize", () => {});
}
if (hasDocument()) {
  document.title = "ready";
}
if (hasNavigator()) {
  console.log(navigator.language);
}
```

Reference: `packages/core/lib/internal/env.ts` and `packages/core/tests/env.test.ts`
