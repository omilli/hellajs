---
title: Let intercept handle same-origin anchors
impact: MEDIUM
impactDescription: hand-rolled click interceptors duplicate the built-in one and double-navigate, while fighting its skip rules
tags: intercept, links, clicks, anchors
---

## Let intercept handle same-origin anchors

`intercept` defaults to `true`: same-origin http(s) `<a>` clicks route through `navigate()` with no page reload. The built-in handler already skips what it must - `defaultPrevented`, modifier keys (ctrl/meta/shift/alt), `target !== "_self"`, `download` links, cross-origin and non-http(s) hrefs, malformed hrefs - and in history mode leaves in-page `#anchor` jumps native; hash mode requires `#/`-prefixed hrefs. Author plain anchors with `href()`-built URLs and let this run; set `intercept: false` only when you own click handling yourself.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({ routes: { "/about": () => renderAbout() } });

// duplicate interceptor: both this and the built-in handler fire,
// and none of the built-in skip rules are respected
document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest("a");
  if (anchor) {
    event.preventDefault();
    navigate(anchor.getAttribute("href") ?? "/");
  }
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

// plain <a href> authoring: same-origin clicks route through navigate()
router({
  routes: {
    "/": () => {},
    "/about": () => {},
  },
  // intercept defaults to true - omit it
});

// opt out only when you own click handling end to end:
router({
  routes: { "/about": () => {} },
  intercept: false,
});
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/tests/intercept.test.ts` and `packages/router/docs/api/router.mdx`
