---
title: Catch mutate calls; fetch never rejects but mutate does
impact: HIGH
impactDescription: a fire-and-forget mutate produces an unhandled promise rejection on every failure, abort, and onSettled throw
tags: mutate, fetch, rejection, error handling
---

## Catch mutate calls; fetch never rejects but mutate does

The two request paths have opposite rejection contracts. `fetch(options)` never rejects: it resolves the data on success or cache hit and `undefined` on error, skip, or abort - errors surface through `error()` and `onError`, so fire-and-forget calls gain no unhandled rejections. `mutate(variables)` returns a real promise and rejects: with the mutation error on failure, with a `DOMException` named `AbortError` on abort, and with a callback's own error when `onSettled` throws (which leaves committed data and `success` status intact). Every mutate call that is not awaited needs a `.catch`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const addTodo = resource(
  async (draft: { text: string }) => (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json(),
  {},
);
addTodo.mutate({ text: "Learn mutations" }); // unhandled rejection on failure
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Todo { id: number; text: string; }
const addTodo = resource(
  async (draft: Omit<Todo, "id">): Promise<Todo> =>
    (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<Todo>,
  {},
);
// fetch() never rejects; mutate() does - catch every fire-and-forget call
addTodo.mutate({ text: "Learn mutations" }).catch(() => {
  // handled in onSettled / resource error state
});
```

Reference: `packages/resource/lib/types/resource.d.ts Resource` and `packages/resource/tests/mutations.test.ts`
