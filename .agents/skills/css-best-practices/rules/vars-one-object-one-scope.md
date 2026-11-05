---
title: One reactive vars object per scope
impact: MEDIUM
impactDescription: re-registering the same reactive object with different options throws before any rule is written, failing the second call site at runtime
tags: vars, options, registration
---

## One reactive vars object per scope

A reactive vars object (any leaf is a function) is registered by object reference: one object carries exactly one resolved `scoped`/`prefix`/`media`/`layer`/`host` combination. A second `vars()` call on the same reference with differing options throws (`vars: reactive vars object already registered with different options`) before any stray rule is written. Use a separate object per scope. Static objects (no function leaves) are keyed by content hash instead, so the same shape under different options registers as separate entries with no conflict.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const tokens = { accent };

vars(
  tokens,
  {
    scoped: ".panel",
  },
);

// Throws: the same object reference re-registered with new options
vars(
  tokens,
  {
    scoped: ".sidebar",
  },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const accent = signal("#3b82f6");
const panelTokens = { accent };
const sidebarTokens = { accent };

// One object per scope: distinct references register independently
vars(
  panelTokens,
  {
    scoped: ".panel",
  },
);
vars(
  sidebarTokens,
  {
    scoped: ".sidebar",
  },
);
```

Reference: `packages/css/lib/vars.ts` and `packages/css/tests/vars-media.test.ts`
