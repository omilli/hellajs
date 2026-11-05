---
title: Partialize persistence down to serializable state
impact: CRITICAL
impactDescription: class instances round-trip through JSON as plain data - a hydrated Date becomes a string and a custom class loses its prototype, corrupting state silently
tags: partialize, serialization, class instances, JSON
---

## Partialize persistence down to serializable state

The default pipeline is `JSON.stringify`/`JSON.parse` over the projected snapshot, and `partialize` selects which keys persist (default: all of them). Persist only what survives a JSON round-trip - class instances do not. A `Date` serializes to a string and hydrates back as one; a custom class instance hydrates as a plain object without its prototype or methods: the store's types now lie about the runtime shape, silently. Function properties are dropped by serialization entirely - they are behavior, not state. Project transient and rich-typed keys away with `partialize`, and re-instantiate rich leaves after hydration when they matter.

**Incorrect (what is wrong):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const audit = store({
  theme: "light",
  openedAt: new Date(2026, 0, 1),
});

// Dates persist as strings: hydrated state claims Date but holds string
persistStore(audit, localStorageAdaptor("audit"));
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const audit = store({
  theme: "light",
  openedAt: new Date(2026, 0, 1),
});

persistStore(audit, localStorageAdaptor("audit"), {
  // Persist only the JSON-safe projection
  partialize: (s) => ({ theme: s.theme }),
});
```

Reference: `packages/store/lib/persistStore.ts` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`
