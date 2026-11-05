---
title: Wrap incidental reads in untracked
impact: MEDIUM
impactDescription: every signal read inside an effect or computed subscribes it, so logging and telemetry reads cause spurious re-runs
tags: effect, computed, untracked, tracking
---

## Wrap incidental reads in untracked

Every signal read inside a computed or effect establishes a dependency. Reads whose result should not drive recomputation (logging, telemetry, debug snapshots) must go through `untracked(fn)`: it reads current values with tracking suspended and restores the previous context on exit, so it nests correctly inside `computed`, `effect`, and further `untracked` calls.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const query = signal("");
const lastAudit = signal("");
effect(() => {
  console.log(query());
  console.log("audit:", lastAudit()); // subscribed: audit writes re-run this effect
});
```

**Correct (what is right):**

```ts
import { effect, signal, untracked } from "@hellajs/core";

const query = signal("");
const lastAudit = signal("");
effect(() => {
  console.log(query());
  untracked(() => console.log("audit:", lastAudit())); // read without subscribing
});
```

Reference: `packages/core/lib/untracked.ts` and `packages/core/tests/untracked.test.ts` and `packages/core/docs/api/untracked.mdx`
