---
title: Encode string streams through TextEncoderStream for the wire
impact: MEDIUM
impactDescription: doc and ssr.stream yield string chunks, and a Response body must be bytes - handing the string stream over unencoded fails when the body is consumed
tags: doc, stream, response, encoding, textencoderstream
---

## Encode string streams through TextEncoderStream for the wire

Both streaming surfaces yield `ReadableStream<string>` chunks: `ssr.stream(node)` from the walk, and `doc({ body: stream })` around it (shell first, body chunks piped through, closing tags last - the suffix flushes only after every staged `<Suspense>` swap has streamed). Web `Response` bodies are byte streams, so pipe the string stream through `new TextEncoderStream()` before serving; in Node's `http` module, wrap the web stream with `Readable.fromWeb(...)` after the same encoding. Delivery stays pull-driven end to end: a slow client exerts backpressure on the walk instead of buffering the whole response.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const App = () => <main>Dashboard</main>;

// doc returns a ReadableStream of strings; a Response body must be bytes.
// The exchange fails when the body is consumed - nothing is served.
const handler = () => new Response(doc({ body: ssr.stream(App()) }));
```

**Correct (what is right):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const App = () => <main>Dashboard</main>;

// Encode the string chunks on the way out: the shell flushes first and the
// closing tags land only after the body stream (and its staged swaps) close.
const handler = () =>
  new Response(doc({ body: ssr.stream(App()) }).pipeThrough(new TextEncoderStream()), {
    headers: { "content-type": "text/html" },
  });
```

Reference: `packages/ssr/lib/doc.ts` and `packages/ssr/docs/api/ssr.mdx`
