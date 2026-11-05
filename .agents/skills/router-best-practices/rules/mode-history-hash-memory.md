---
title: Choose the mode deliberately; memory is URL-less
impact: MEDIUM
impactDescription: memory-mode apps that read window.location or expect the back button to work sit on machinery that is never attached
tags: mode, history, hash, memory
---

## Choose the mode deliberately; memory is URL-less

`mode: "history"` (default) drives clean URLs through pushState/replaceState and popstate; `"hash"` reads and writes `#/path` URLs (plain `#section` anchors are ignored - only `#/` hashes are routes); `"memory"` attaches no listeners and never touches the URL or history - the route advances only via `navigate()`, and there is no `back()`/`forward()` API (no entry stack is kept). In every mode the current route is `route()`; never read `window.location` for it. Re-running `router()` swaps modes cleanly - the previous listeners detach first.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({ mode: "memory", routes: { "/step/:n": () => renderStep() } });

// later: wiring a back button against history that memory mode never writes
window.addEventListener("popstate", () => renderStep()); // never fires
```

**Correct (what is right):**

```ts
import { navigate, route, router } from "@hellajs/router";

router({
  mode: "memory", // wizard flow: no URL to share, no history to respect
  routes: {
    "/": () => {},
    "/step/:n": ({ n }) => step(n ?? ""),
  },
});

navigate("/step/:n", { params: { n: "2" } });
const current = route().path; // "/step/2" - no URL was touched

function step(_n: string) {}
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/lib/internal/resolve.ts go` and `packages/router/tests/memory-mode.test.ts`
