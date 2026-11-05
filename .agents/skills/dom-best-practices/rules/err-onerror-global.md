---
title: onError is the global drain: first non-null fallback build wins
impact: MEDIUM
impactDescription: with no onError handler registered every dispatched error is just console.error with no UI change, and handler ordering surprises when several are registered
tags: onError, errors, global handlers, teardown
---

## onError is the global drain: first non-null fallback build wins

`onError(fn)` registers a global handler that sees every dispatched error - render, mount, update, and event phases - including the ones no boundary caught (async mount rejections have no element context and can only land here). Handlers run in insertion order; the FIRST handler returning a non-null flagged build wins and later handlers are skipped for that error - return `null` to pass, a build to render. Registering does not replace: `onError(fn)` adds, the returned function removes that one handler, and `onError(null)` clears every handler. An error thrown inside a handler is caught and logged (`[dom] Error handler threw:`), never re-dispatched.

**Incorrect (what is wrong):**

```tsx
import { mount, onError } from "@hellajs/dom";

// Registered after mounting async roots, and returns a build for EVERYTHING -
// later, more specific handlers never see an error this one swallows.
mount(async () => loadApp(), "#app");
onError((error) => () => <p>{error.message}</p>);
```

**Correct (what is right):**

```tsx
import { onError } from "@hellajs/dom";

// Registered before any mount; passes on event-phase errors so a later
// handler (or telemetry-only default) still sees them.
onError((error, context) => {
  if (context.phase === "event") return null;
  return <p role="alert">{error.message}</p>; // a JSX build is the flagged fn
});

onError(null); // test teardown: clears every handler (pair with resetDom)
```

Reference: `packages/dom/lib/features/errors.ts onError` and `packages/dom/docs/api/onerror.mdx`
