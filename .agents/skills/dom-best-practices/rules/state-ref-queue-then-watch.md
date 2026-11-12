---
title: $ref ops queue until the element appears; element inputs never watch
impact: MEDIUM
impactDescription: calling $ref(selector) before the element exists and then reading ref() gets null - operations only apply later if you actually issue them, and assuming an element input watches wastes a body observer
tags: $ref, refs, selectors, queuing
---

## $ref ops queue until the element appears; element inputs never watch

`$ref(selector)` runs `document.querySelector` synchronously: a hit wraps immediately, a miss returns a callable ref that is `null` until found. Operations (`text`, `attr`, `on`, `hooks`) queue and apply when a matching element appears - but the MutationObserver watch starts lazily on the FIRST operation call, so `const r = $ref("#x")` alone never watches anything. Chain at least one operation to arm the watcher. `$ref(element)` (a node already in hand) applies operations immediately and never starts a watcher; a null-ish runtime element input stays a safe queued no-op. Read the node through the call (`ref()`) or the `.node` getter rather than re-querying.

**Incorrect (what is wrong):**

```tsx
import { $ref } from "@hellajs/dom";

const late = $ref("#save-btn");
// No operation chained: no watcher started. When the button renders later,
// nothing binds - and late() reads null right now anyway.
if (late()) {
  void 0; // dead branch: the element does not exist yet
}
```

**Correct (what is right):**

```tsx
import { $ref } from "@hellajs/dom";

// The operation call arms the watcher: whenever #save-btn appears, the
// handler and attribute apply to it automatically.
$ref("#save-btn")
  .attr({ "data-armed": "true" })
  .on("click", () => void 0);

// Element already in hand: immediate, no watcher.
const host = document.createElement("div");
$ref(host).hooks({ afterMount: () => void 0 });
```

Reference: `packages/dom/lib/$ref.ts $ref` and `packages/dom/docs/api/ref.mdx`
