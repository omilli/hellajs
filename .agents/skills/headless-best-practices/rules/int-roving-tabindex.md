---
title: Give rovingTabIndex a selector for non-natively-focusable items
impact: HIGH
impactDescription: the default collector excludes tabindex="-1", so rove-written marks drop tab-indexed spans out of the group after the first move
tags: rovingTabIndex, focus, keyboard, toolbar
---

## Give rovingTabIndex a selector for non-natively-focusable items

`rovingTabIndex(container, options?)` writes `tabindex` 0 on the first item and -1 on the rest at init (never stealing focus), moves focus along the `orientation` axis on arrows, jumps on Home/End, and wraps when `loop` (default true). Arrows act only while focus is inside the group - the keydown resolves the current item by `indexOf(activeElement)` and ignores a `-1` - so the group must actually receive focus before arrows do anything. The default item collector is the shared focusables selector (`a[href]`, enabled form controls, `[tabindex]:not([tabindex="-1"])`): items collected only through their tabindex attribute (spans, divs) drop out after the first move writes -1 onto them, collapsing the rove. Pass `selector` for such groups; natively focusable items survive the -1 writes. The dispose handle restores every item's original attribute.

**Incorrect (what is wrong):**

```ts
import { rovingTabIndex } from "@hellajs/headless/utils";

// Spans collected only via tabindex: the first arrow move writes -1 onto
// the inactive items, the default collector drops them, and the rove
// collapses to a single item.
const toolbar = document.createElement("div");
toolbar.innerHTML = "<span tabindex='0'>Cut</span><span tabindex='0'>Copy</span>";
const dispose = rovingTabIndex(toolbar);
```

**Correct (what is right):**

```ts
import { rovingTabIndex } from "@hellajs/headless/utils";

const toolbar = document.createElement("div");
toolbar.innerHTML =
  "<span data-tool tabindex='0'>Cut</span><span data-tool tabindex='0'>Copy</span>";
const dispose = rovingTabIndex(toolbar, { selector: "[data-tool]", loop: true });
dispose(); // restores each item's original tabindex attribute
```

Reference: `packages/headless/lib/utils/rovingTabIndex.ts` and `packages/headless/lib/internal/focusables.ts` and `packages/headless/tests/rovingtabindex.test.ts`
