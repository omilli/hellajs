---
title: Capture rest paths with * and insert wildcard values raw
impact: MEDIUM
impactDescription: assuming a leading slash on wildcard captures or pre-encoding wildcard builds yields doubled or broken path joins
tags: wildcard, params, patterns
---

## Capture rest paths with * and insert wildcard values raw

A trailing `*` captures the remaining segments without a leading slash: `/files/*` matched against `/files/docs/readme.md` gives `params["*"] === "docs/readme.md"`. On the build side `navigate`/`href` insert the `"*"` value raw (not `encodeURIComponent`'d) because it holds path segments that may contain `/` - unlike `:param` values, which always encode. Join the captured value onto prefixes with an explicit slash, and treat `params["*"]` as possibly absent under strict null checks.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // expects params["*"] to start with "/": "/api/files" + "docs/x"
    // concatenates to "/api/filesdocs/x"
    "/files/*": (params) => fetchFile("/api/files" + params["*"]),
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/files/*": (params) => view("/api/files/" + (params["*"] ?? "")),
  },
});

// wildcard values insert raw - already a path, never URL-encoded
navigate("/files/*", { params: { "*": "docs/readme.md" } }); // -> /files/docs/readme.md
```

Reference: `packages/router/lib/internal/match.ts matchPattern` and `packages/router/lib/internal/path.ts buildPath` and `packages/router/tests/url-encoding.test.ts`
