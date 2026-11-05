---
title: Reset each side with its own reset function
impact: LOW
impactDescription: resetCss never touches vars state and resetVars never touches rule registrations, so calling one half and expecting a full wipe leaves the other half live
tags: resetCss, resetVars, testing
---

## Reset each side with its own reset function

The CSS system is two independent halves. `resetCss()` clears the css side only: `css()`, `style()`, and `keyframes()` registrations plus the `hella-css` sheet. `resetVars()` clears the vars side only: buckets, the static cache, reactive registries, every vars effect, and the `hella-vars` sheet. The `<style>` elements are cleared, never removed from the DOM. Tests reset both (the shared `resetTestState()` helper); production code rarely needs either.

**Incorrect (what is wrong):**

```ts
import { css, resetCss, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Wrong half: the vars registration survives with its sheet rule
resetCss();
```

**Correct (what is right):**

```ts
import { css, cssText, resetCss, resetVars, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Each reset clears its own side; both together restore initial state
resetCss();
resetVars();

cssText(); // ""
```

Reference: `packages/css/lib/resetCss.ts` and `packages/css/lib/resetVars.ts` and `utils/test-helpers.js resetTestState`
