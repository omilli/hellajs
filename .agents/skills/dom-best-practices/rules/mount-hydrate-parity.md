---
title: Hydrate the same build the server rendered with the same initial state
impact: CRITICAL
impactDescription: a different build or different initial signal values diverge from the server HTML - regions warn and rebuild, unmatched root claims throw, and the user sees a flash or a dead page
tags: hydrate, ssr, hydration, mismatch
---

## Hydrate the same build the server rendered with the same initial state

`hydrate(node, target)` wires effects, handlers, and state onto the DOM the server shipped - it never replaces nodes. The input must be the same compiled component the server rendered (`ssr()` output must be the target's children), and every signal must initialize to the same values the server rendered: drift is a mismatch. Divergence surfaces two ways - a reactive region whose count or markers disagree warns and fresh-mounts that region, while a root claim with no matching server node throws `[dom] hydrate: unmatched server DOM for imperative root`. Derive initial state on the client from the same source the server used (props, cookies, serialized state), never from a different default.

**Incorrect (what is wrong):**

```tsx
import { hydrate } from "@hellajs/dom";
import { signal } from "@hellajs/core";

// Server rendered open=false; the client initializes open=true - every
// region reading `open` mismatches its server HTML on first paint.
const open = signal(true);
hydrate(() => <details open={open}>Panel</details>, "#app");
```

**Correct (what is right):**

```tsx
import { hydrate } from "@hellajs/dom";
import { signal } from "@hellajs/core";

// Same initial value the server rendered: regions claim their server nodes
// in place (identity preserved - nothing is cloned or re-created).
const open = signal(false);
hydrate(() => <details open={open}>Panel</details>, "#app");
```

An empty container is legal: `hydrate` mounts fresh through the same create arms, so one code path serves both entry points.

Reference: `packages/dom/lib/hydrate.ts hydrate` and `packages/dom/tests/hydrate-imperative.test.ts` and `packages/dom/docs/api/hydrate.mdx`
