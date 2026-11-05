---
title: Streamed Suspense regions need nonces and client error boundaries
impact: HIGH
impactDescription: a strict Content-Security-Policy blocks every inline swap script so regions stay on their fallbacks, and an isolated rejection surfaces only at a client error boundary that may not exist
tags: islands, suspense, stream, nonce, csp, error boundary
---

## Streamed Suspense regions need nonces and client error boundaries

Under `ssr.stream`, a `<Suspense>` boundary flushes its `fallback` inline, then streams the resolved children as a `<template id="hsN">` followed by an inline `<script>$hs("hsN")</script>` that swaps the fallback out the moment the region arrives (a one-time `$hs` bootstrap precedes them). Two client-facing obligations follow. First, the swap scripts are inline: under a strict `Content-Security-Policy` (no `unsafe-inline`) the browser blocks them and every region stays on its fallback until hydrate re-suspends it - pass `{ nonce }` to `ssr.stream` and mirror the same value in the response header. Second, a rejecting region is isolated server-side: its `<template>` is skipped (fallback and sentinel stay), the stream completes with its healthy siblings, and `hydrate` re-suspends the failed region on the client where the rejection reaches the nearest `onError`/`error:fallback` boundary - ship one, or the rejection is unhandled.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// No nonce: under a strict CSP the browser blocks every inline $hs swap
// script and each region stays frozen on its fallback.
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Thread the nonce onto every inline script the stream emits (the $hs
// bootstrap and each per-region swap); mirror it in the response header.
const nonce = crypto.randomUUID();
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
  { nonce },
);
```

Bare Promises are a different failure class: a rejected bare Promise in the main walk errors the stream itself (see the member-choice rule).

Reference: `packages/ssr/lib/ssrStream.ts` and `packages/ssr/tests/hydrate-integration.test.tsx`
