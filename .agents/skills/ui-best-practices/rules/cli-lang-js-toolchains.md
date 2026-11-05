---
title: Reserve --lang js for JS-only toolchains; the output still needs the HellaJS compiler
impact: MEDIUM
impactDescription: stripping types buys nothing under Bun or Deno, and the .jsx output is HellaJS JSX - a generic React transpiler cannot consume it
tags: lang, js, strip, compiler
---

## Reserve --lang js for JS-only toolchains; the output still needs the HellaJS compiler

`--lang js` strips TypeScript after the style splice (esbuild, JSX preserved) and retargets the copied names - `.tsx` becomes `.jsx`, other `.ts` files (`cn`, `tokens`) become `.js`, and `theme.css` rides through verbatim. It exists for toolchains that only speak JavaScript: Bun and Deno execute the TypeScript copies natively, so keep the `ts` default there. The `.jsx` output is not browser-ready and not React JSX - HellaJS JSX compiles to vnode calls, so the project still needs the HellaJS compiler (`vite-plugin-hellajs`); a generic JSX transpiler is not a substitute.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Bun project, js flag "for compatibility": Bun runs the TS copies as-is,
// so the strip buys nothing - and the .jsx output is still HellaJS JSX,
// not something a generic React transform can consume.
addComponent(["button"], { lang: "js" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// JS-only toolchain: the strip runs after the splice and every TS name
// retargets. Wire vite-plugin-hellajs so the .jsx output compiles to the
// vnode calls the runtime consumes.
addComponent(["button"], { lang: "js" });

const renameContract: Record<string, string> = {
  "button.tsx": "button.jsx",
  "cn.ts": "cn.js",
  "tokens.ts": "tokens.js",
};
```

`lang` defaults to `ts` and can be persisted in `hella.ui.json` like the style.

Reference: `packages/ui/lib/internal/strip.ts stripTypes` and `packages/ui/docs/concepts/plain-javascript.mdx` and `packages/ui/tests/cli/plainjs.test.ts`
