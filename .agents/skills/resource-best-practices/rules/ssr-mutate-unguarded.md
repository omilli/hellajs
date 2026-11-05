---
title: Never call mutate during render
impact: HIGH
impactDescription: mutate is deliberately unguarded by the server check, so a render-path call fires a real network write from the server instead of failing fast
tags: mutate, ssr, server, render, network write
---

## Never call mutate during render

Reads no-op on the server, but `mutate()` is intentionally unguarded by the window check: it is user-initiated by contract, and guarding it would silently drop legitimate client-side mutations. The consequence is directional - code that reaches `mutate()` from a render path (a component body, a top-level statement, an effect that runs during server stringification) executes a real network write from the server. Keep `mutate()` in event handlers and client-only code paths, and let the resource's read side carry server data through `initialData`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const save = resource(
  async (draft: { text: string }) => (await fetch("/api/notes", { method: "POST", body: JSON.stringify(draft) })).json(),
  {},
);
// Render-path call: on the server this POSTs for real, once per render
function NoteEditor() {
  save.mutate({ text: "hello" });
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Draft { text: string; }
const save = resource(
  async (draft: Draft): Promise<{ ok: boolean }> =>
    (await fetch("/api/notes", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<{ ok: boolean }>,
  {},
);

// Event handlers run client-side only - mutate stays off the server render path
function onSave() {
  save.mutate({ text: "hello" }).catch(() => {});
}
onSave();
```

Reference: `packages/resource/tests/ssr-mode.test.ts` and `packages/resource/docs/concepts/resources.mdx`
