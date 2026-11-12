---
title: $collection covers future matches; dispose to stop watching
impact: MEDIUM
impactDescription: reading collection[i] for dynamically added elements yields undefined - indexed access holds only the initial set - and a $collection never disposed keeps a document.body observer alive forever
tags: $collection, refs, watching, dispose
---

## $collection covers future matches; dispose to stop watching

`$collection(selector)` wraps every current match and registers a body-level watcher so elements added later auto-apply the same queued operations (`text`/`attr`/`on`/`hooks`/`forEach` apply to current AND future members). Two asymmetries to respect: indexed access (`collection[2]`) is populated only for the initial set - dynamically added elements are reachable through the callable form `collection(2)` and `length`; and the watcher (a document.body MutationObserver with a selector registry) lives until you call `dispose()` - call it when the page section driving the collection goes away, or the observer and queued ops outlive their usefulness. The registry itself is introspectable: `multiSelectors` maps selector to state, and `checkMultiSelectors()` forces the check the observer would schedule.

**Incorrect (what is wrong):**

```tsx
import { $collection } from "@hellajs/dom";

const badges = $collection(".badge");
badges.text("live");

const fresh = document.createElement("span");
fresh.className = "badge";
document.body.append(fresh);

// Undefined: indexed access was snapshotted at creation - only the callable
// form sees dynamically added elements.
console.log(String(badges[1]?.node?.textContent));
```

**Correct (what is right):**

```tsx
import { $collection, checkMultiSelectors, multiSelectors } from "@hellajs/dom";

const badges = $collection(".badge");
badges.text("live").on("click", () => void 0);

const fresh = document.createElement("span");
fresh.className = "badge";
document.body.append(fresh);
checkMultiSelectors(); // tests force what the observer schedules

console.log(String(badges(1)?.textContent), String(multiSelectors.size));

badges.dispose(); // stop watching; the observer disconnects when none remain
```

Reference: `packages/dom/lib/$collection.ts $collection` and `packages/dom/lib/internal/selectors.ts checkMultiSelectors` and `packages/dom/docs/api/collection.mdx`
