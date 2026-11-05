---
title: Remove reactive vars by reference, static by structure
impact: HIGH
impactDescription: passing a structural copy to removeVars misses the reference-keyed reactive entry and silently no-ops, leaving the effect running and the declarations in the sheet
tags: removeVars, refcount, removal
---

## Remove reactive vars by reference, static by structure

`removeVars()` looks entries up two ways, in order. Reactive registrations are keyed by object reference: pass the exact same object that went into `vars()`, and removal disposes the effect (later signal writes re-add nothing) and drops the declarations at the last reference. Static registrations are keyed by a structural hash: a structurally equal fresh object matches. A structural copy passed for a reactive object misses the reference lookup, falls through to the static hash, finds nothing, and silently no-ops.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { removeVars, vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(tokens);

// A fresh literal is a different reference: the reactive entry is
// missed, nothing is removed, and the effect keeps running
removeVars({ accent });
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { removeVars, vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(tokens);

// Same reference: decrements the count, disposes the effect at zero
removeVars(tokens);
```

Multiple `vars()` calls sharing one scope bucket merge their keys; a matching `removeVars` removes only that call's keys.

Reference: `packages/css/lib/removeVars.ts` and `packages/css/tests/vars-remove.test.ts`
