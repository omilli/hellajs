---
title: Pass params through options, never string interpolation
impact: CRITICAL
impactDescription: hand-interpolated params with spaces, slashes, or reserved characters change which route matches or silently truncate the path
tags: navigate, params, URL encoding
---

## Pass params through options, never string interpolation

`navigate` and `href` substitute `:param` tokens with `encodeURIComponent` applied (`"hello world & more!"` becomes `hello%20world%20%26%20more!`), serialize the query, and strip unmatched tokens - all in one shared builder. Template-string interpolation skips the encoding and the type-checked `ExtractParams` mapping: a value containing `/` or `?` splits into extra segments, a `&` or `#` truncates, and a typo'd key fails silently instead of at compile time. Only the wildcard `"*"` value is inserted raw - it is already a path.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

const slug = "hello world & more!";
navigate(`/posts/${slug}`); // -> /posts/hello world & more!
// the space and & break the URL; the route matches "/posts/:somethingElse"
// or nothing, and no compile-time check tied the value to the pattern
```

**Correct (what is right):**

```ts
import { navigate } from "@hellajs/router";

const slug = "hello world & more!";
navigate("/posts/:slug", { params: { slug } }); // -> /posts/hello%20world%20%26%20more!
navigate("/search", { query: { q: slug } }); // query values encode too
```

Reference: `packages/router/lib/internal/path.ts buildPath` and `packages/router/docs/api/navigate.mdx` and `packages/router/tests/url-encoding.test.ts`
