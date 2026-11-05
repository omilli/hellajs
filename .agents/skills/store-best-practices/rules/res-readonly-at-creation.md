---
title: Configure readonly at creation; it propagates deep
impact: HIGH
impactDescription: readonly cannot be toggled later, and writes through any path on a readonly key throw at runtime
tags: readonly, creation config, deep propagation, guards
---

## Configure readonly at creation; it propagates deep

`readonly` is creation-time config: `readonly: true` freezes every key and propagates into every nested plain-object level (each nested store derives its own full key set, so no name-collision false lockdown), while `readonly: ["id"]` freezes listed keys, deep for listed object keys. Enforcement is a runtime throwing guard on every write path: setter calls (`doc.id(8)`), `$update`, and every collection mutator throw. Composed stores keep their own config - a readonly store stays readonly inside a writable parent and a writable one stays writable inside a readonly parent. Readonly stores reject new keys; subscribing to a readonly key is legal read-only observation that never fires.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const doc = store(
  { id: 7, title: "draft", meta: { locked: false } },
  { readonly: ["id"] },
);

// Throws at runtime: id is guarded - readonly is not advisory
doc.id(8);
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const doc = store(
  { id: 7, title: "draft", meta: { locked: false } },
  { readonly: ["id"] },
);

// Writable keys update normally; the readonly key only reads
doc.$update({ title: "final", meta: { locked: true } });
const id: number = doc.id();
```

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/tests/readonly.test.ts` and `packages/store/docs/api/store.mdx`
