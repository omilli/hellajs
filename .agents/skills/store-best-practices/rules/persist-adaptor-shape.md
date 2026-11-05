---
title: Persist through a StoreAdaptor built by the shipped factories
impact: MEDIUM
impactDescription: passing raw storage objects or key strings fails the adaptor contract - read, write, and clear are the whole backend
tags: StoreAdaptor, localStorageAdaptor, sessionStorageAdaptor, async
---

## Persist through a StoreAdaptor built by the shipped factories

`persistStore(store, adaptor, options?)` takes a `StoreAdaptor` - `{ read, write, clear }` - not a storage object and not a key. Build the shipped backends with their factories: `localStorageAdaptor("key")` and `sessionStorageAdaptor("key")` defer storage access to call time, so importing and constructing them on the server is safe. Every method may return a promise: the contract is async-first, so an IndexedDB adaptor implements the same three methods as localStorage. A synchronous read settles hydration before `persistStore` returns; a promise read settles when it resolves.

**Incorrect (what is wrong):**

```ts
import { persistStore, store } from "@hellajs/store";

const settings = store({ theme: "light" });

// Wrong on both counts: the global storage object is not an adaptor,
// and the key belongs inside a factory
persistStore(settings, localStorage);
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const settings = store({ theme: "light", fontSize: 12 });

// Factory takes the storage key; persistStore drives read/write/clear
const persist = persistStore(settings, localStorageAdaptor("settings"));

settings.theme("dark"); // written through to localStorage
```

Exceptions: custom backends implement the `StoreAdaptor` interface directly - an IndexedDB persistence layer wraps its promise API in the same three methods.

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/lib/localStorageAdaptor.ts` and `packages/store/docs/api/persiststore.mdx`
