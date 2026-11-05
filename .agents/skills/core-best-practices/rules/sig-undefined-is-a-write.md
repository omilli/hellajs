---
title: Passing undefined writes; only a no-argument call reads
impact: MEDIUM
impactDescription: treating undefined as a read or as absence silently clears stored state
tags: signals, undefined, api
---

## Passing undefined writes; only a no-argument call reads

The getter/setter discriminator is `arguments.length`, not value identity. `s()` reads; `s(undefined)` writes `undefined`, and the setter returns `void`, so no default-on-read pattern exists. `signal<T>()` without an initial value legitimately starts `undefined`, making a stored `undefined` indistinguishable from never-set; use `??` at read sites for fallbacks and call the setter with `undefined` only when deliberately clearing.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";

const userId = signal<number>();
// Not a read with a default: a WRITE that clears the signal and yields
// undefined (the setter returns void)
const id = userId(undefined);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";

const userId = signal<number>(); // undefined until first set
const id = userId() ?? 0; // read, with the fallback at the read site
userId(undefined); // deliberate clear back to undefined
```

Reference: `packages/core/lib/signal.ts` and `packages/core/tests/signals.test.ts` and `packages/core/docs/api/signal.mdx`
