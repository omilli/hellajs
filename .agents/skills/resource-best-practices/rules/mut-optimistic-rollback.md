---
title: Thread optimistic updates through onMutate context
impact: CRITICAL
impactDescription: an optimistic write without a rollback path strands fake data on failure or abort, and onSettled never fires for aborted mutations so the rollback must not depend on it alone
tags: mutate, onMutate, onSettled, optimistic, rollback
---

## Thread optimistic updates through onMutate context

The mutation lifecycle exists for optimistic updates: `onMutate(variables)` runs before the fetcher - write the optimistic state there and return a context (snapshot, temp id); `onSettled(data, error, variables, context)` receives that same context on success and failure, so the error arm can roll the optimistic write back precisely. Two abort facts shape the pattern: `onSettled` is skipped entirely when a mutation aborts, even after `onMutate` already ran, so a timeout, external `abortSignal`, or `abort()` leaves the optimistic state in place unless the abort initiator handles it; and a throw inside a success-path `onSettled` never flips the resource to error - the committed data stands and `invalidates` is skipped. Mutations write raw-type data; pair with the read resource's `setData` and finish with `invalidate()`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {});
const addTodo = resource(
  async (draft: { text: string }) => (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json(),
  {
    onMutate: async () => {
      todos.setData((old) => [...(old ?? []), { id: -1, text: "saving..." }]);
      // No context returned: the rollback has no snapshot to restore
    },
  },
);
await addTodo.mutate({ text: "Learn mutations" });
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Todo { id: number; text: string; pending?: boolean; }
type Draft = Omit<Todo, "id">;

const todos = resource<Todo[]>(() => fetch("/api/todos").then((r) => r.json()), {});
const addTodo = resource(
  async (draft: Draft): Promise<Todo> =>
    (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<Todo>,
  {
    onMutate: async (variables) => {
      const temp: Todo = { id: Date.now(), ...(variables as Draft), pending: true };
      todos.setData((old) => [...(old ?? []), temp]);
      return { temp }; // context threads to this call's onSettled
    },
    onSettled: async (created, error, variables, context) => {
      const temp = (context as { temp: Todo } | undefined)?.temp;
      if (error && temp) {
        todos.setData((old) => (old ?? []).filter((t) => t.id !== temp.id));
      }
      todos.invalidate();
    },
  },
);
await addTodo.mutate({ text: "Learn mutations" });
```

Aborted mutations skip `onSettled` by design: when a mutation can be aborted (timeout, external signal), roll the optimistic write back at the abort call site too.

Reference: `packages/resource/lib/resource.ts mutate` and `packages/resource/tests/mutation-abort.test.ts`
