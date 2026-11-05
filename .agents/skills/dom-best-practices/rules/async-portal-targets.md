---
title: Portal targets must exist at mount; remote content cleans up with its region
impact: HIGH
impactDescription: a missing target selector throws from the portal's first effect run and takes down the whole containing render, and content left in a dead target is a leak
tags: Portal, portals, targets, cleanup
---

## Portal targets must exist at mount; remote content cleans up with its region

`Portal` renders its children into a remote target resolved by `document.querySelector(to)` at the first effect run - not at construction. A miss throws `[dom] Portal: target "<to>" not found in document`, and because portal content mounts through the component dispatch, that error surfaces in the containing render. Ensure the target element exists before the portal's region mounts (create the container, or guard conditional portals on the target's presence). Cleanup is anchor-owned: removing the portal's region in the original tree removes the remote nodes and unwinds their state, so never hand-delete portal content from the target - remove or unmount the source region instead. `type` must be one of `"append" | "prepend" | "replace" | "before" | "after"` (default `"append"`); anything else throws at construction.

**Incorrect (what is wrong):**

```tsx
import { Portal } from "@hellajs/dom";

// #modals is not in the document yet: the render that contains this portal
// throws at the portal's first effect run.
const App = () => (
  <Portal to="#modals">
    <div class="modal">Dialog</div>
  </Portal>
);
```

**Correct (what is right):**

```tsx
import { Portal } from "@hellajs/dom";

const host = document.createElement("div");
host.id = "modals";
document.body.append(host); // target exists before the portal mounts

const App = () => (
  <Portal to="#modals">
    <div class="modal">Dialog</div>
  </Portal>
);
```

Reference: `packages/dom/lib/Portal.ts Portal` and `packages/dom/docs/api/portal.mdx`
