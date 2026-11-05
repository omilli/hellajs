---
title: Never create effects inside effects
impact: HIGH
impactDescription: nested effects accumulate: each parent re-run creates another child and old children keep firing on their own dependencies until explicitly disposed
tags: effect, nesting, lifecycle
---

## Never create effects inside effects

Effects do not auto-dispose their children: re-running a parent creates new child effects while the old ones stay alive, each still subscribed to its own dependencies, duplicating side effects on every later change. Express the varying condition inside a single effect instead. Conditional reads are the model, not a hazard: dependencies are re-collected on every run, so reads in the inactive branch drop out automatically and the subscription set tracks the active branch.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const enabled = signal(false);
const query = signal("");
effect(() => {
  enabled(); // flips re-run this parent
  // Every re-run creates ANOTHER child; old children are never disposed and
  // keep firing on their own dependencies
  effect(() => {
    console.log(query());
  });
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const enabled = signal(false);
const query = signal("");
effect(() => {
  // One effect, branching: the inactive branch's subscriptions drop out on
  // each re-run
  if (enabled()) {
    console.log(query().toUpperCase());
  } else {
    console.log("idle");
  }
});
```

When an external registry must own a nested effect's lifetime, `effect(fn, { separate: true })` decouples it from the parent, but the accumulation rule still applies: the registry, not the graph, disposes it.

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effect-lifecycle.test.ts` and `packages/core/tests/topology.test.ts` and `packages/core/docs/concepts/reactivity.mdx`
