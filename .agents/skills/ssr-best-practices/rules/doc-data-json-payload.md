---
title: Ship plain JSON values through the data payload
impact: MEDIUM
impactDescription: nested functions and signals are silently dropped by JSON.stringify (the payload ships empty), and circular structures throw before any document is produced
tags: doc, data, json, payload, serialization
---

## Ship plain JSON values through the data payload

`doc({ data })` is a plain JSON channel, not reactive-state serialization: the value runs through `JSON.stringify` with every `<` escaped to `\u003c`, and lands as `<script type="application/json" id="hella-data">` after the mount wrapper, before `</body>`, in both the string and streaming modes. Resolve server values before passing them: a signal nested under `data` is a function, so `JSON.stringify` silently drops it (the client reads back an empty object), and a lone function or symbol as `data` throws `[ssr] doc: data must be JSON-serializable` - as does a circular structure, in both modes, before anything is returned or streamed. The client reads the payload with `JSON.parse(document.getElementById("hella-data").textContent)`.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { doc } from "@hellajs/ssr";

const user = signal({ id: 1, name: "Ada" });

// A signal is a function: nested under data it is silently dropped, so the
// payload ships {} and the client boots with no server data at all.
const page = doc({ data: { user }, body: "<h1>Hi</h1>" });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { doc } from "@hellajs/ssr";

const user = signal({ id: 1, name: "Ada" });

// Read the value out server-side: data carries plain JSON values only,
// and the client seeds its state from #hella-data on boot.
const page = doc({ data: { user: user() }, body: "<h1>Hi</h1>" });
```

Reference: `packages/ssr/lib/doc.ts` and `packages/ssr/lib/types.d.ts DocOptions`
