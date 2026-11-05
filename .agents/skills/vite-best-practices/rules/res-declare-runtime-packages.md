---
title: Declare every @hellajs/* package the app compiles against
impact: HIGH
impactDescription: an undeclared runtime package fails the build on an unresolvable @hellajs/dom/runtime import
tags: vite, dependencies, runtime
---

## Declare every @hellajs/* package the app compiles against

`vite-plugin-hellajs` transforms code; it provides no runtime. Every JSX module compiles to imports from `@hellajs/dom/runtime` - see any compiled artifact, e.g. `import { template as _hellaTemplate, mark as _hellaMark, ... } from "@hellajs/dom/runtime"` - and app code imports the packages directly (`@hellajs/core` signals, `@hellajs/dom` `mount`, `@hellajs/css` `style`). Each package the app touches must be present in the project's own dependencies; Vite resolves those specifiers like any other import, and a missing package surfaces as "Failed to resolve import" against a specifier the app never wrote by hand. When that error points at `@hellajs/*`, check `package.json` first, not the plugin config.

**Incorrect (what is wrong):**

```tsx
// package.json declares only the build plugin:
// { "devDependencies": { "vite-plugin-hellajs": "^0.8.9" } }
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

// The JSX below compiles to `import { ... } from "@hellajs/dom/runtime"` -
// not installed: the build fails with "Failed to resolve import
// \"@hellajs/dom/runtime\"" against a specifier never written by hand.
const count = signal(0);
const App = () => <button on:click={() => count(count() + 1)}>{count}</button>;

mount(App, "#app");
```

**Correct (what is right):**

```tsx
// package.json dependencies include the packages the app compiles against:
// "@hellajs/core", "@hellajs/dom" (plus "vite-plugin-hellajs" for the config)
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

const count = signal(0);
const App = () => <button on:click={() => count(count() + 1)}>{count}</button>;

mount(App, "#app");
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `packages/headless/dist/avatar.js` and `examples/counter/src/main.jsx`
