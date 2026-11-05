---
title: Plan around the fixed hook order
impact: MEDIUM
impactDescription: setup placed in a parent's after hook is invisible to the child's before hook, which already ran in the other direction
tags: hooks, order, lifecycle
---

## Plan around the fixed hook order

One navigation through a nested match runs, in order: global `leave` -> child `leave` -> parent `leave` -> global `before` -> parent `before` -> child `before` -> `handler` -> child `after` -> parent `after` -> global `after`. The guard chain short-circuits on the first non-pass verdict - a cancelled or redirected navigation never runs the handler or any `after` hook. The leave phase is skipped on init/SSR (nothing matched yet), on same-path navigation, and when the target resolves to `notFound`. Place setup where the order guarantees visibility: leave guards run child-first (teardown), everything else parent-first (setup).

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/panel": {
      after: () => initPanelState(), // runs AFTER the child handler - too late
      children: {
        "/stats": {
          before: () => readPanelState(), // undefined: panel not initialized yet
          handler: () => renderStats(),
        },
      },
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const log = signal<string[]>([]);

router({
  hooks: {
    leave: () => log([...log(), "global leave"]),
    before: () => log([...log(), "global before"]),
    after: () => log([...log(), "global after"]),
  },
  routes: {
    "/parent": {
      before: () => log([...log(), "parent before"]), // setup: parent-first
      after: () => log([...log(), "parent after"]), // teardown: child-first
      leave: () => log([...log(), "parent leave"]),
      children: {
        "/child": {
          before: () => log([...log(), "child before"]),
          after: () => log([...log(), "child after"]),
          leave: () => log([...log(), "child leave"]),
          handler: () => log([...log(), "handler"]),
        },
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/matched.ts runGuardsNested` and `packages/router/lib/internal/matched.ts executeRouteWithHooks` and `packages/router/docs/api/router.mdx`
