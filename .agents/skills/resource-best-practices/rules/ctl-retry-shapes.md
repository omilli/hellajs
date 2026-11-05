---
title: Pick retry counts, predicates, and delays
impact: MEDIUM
impactDescription: a bare retry count re-issues 404s and other permanent failures, burning battery and hammering the API for responses that will never change
tags: retry, retryDelay, backoff, ResourceError
---

## Pick retry counts, predicates, and delays

`retry` accepts a number (attempts), a boolean (`true` is exactly one retry), or a predicate `(failureCount, error)` where the count starts at 1 on the first failure and `error` is a categorized `ResourceError` (`.category`: `not_found`, `server`, `client`, `unknown`; `.statusCode` when the message carried an HTTP status). `retryDelay` accepts fixed ms (default 1000) or `(attempt, error) => ms` for exponential backoff. Retry applies to fetches and mutations alike; abort errors never retry, an abort during the delay interrupts it, and retries happen before caching - a retried-then-successful fetch caches the successful result. Use the predicate to retry transient classes only.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Retries 404s three times: the resource will never appear
const user = resource((id: string) => fetch(`/api/users/${id}`).then((r) => r.json()), {
  retry: 3,
});
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const resilient = resource(() => fetch("/api/data").then((r) => r.json()), {
  retry: (count, error) => error.category !== "not_found" && count < 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** (attempt - 1), 30_000),
});
await resilient.fetch({ force: true });
```

Reference: `packages/resource/lib/internal/retry.ts fetchWithRetry` and `packages/resource/tests/retry.test.ts`
