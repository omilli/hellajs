---
title: Import utils from the headless/utils subpath
impact: MEDIUM
impactDescription: importing utils through the package root drags the dom-dependent component-factory tier into renderer-free surfaces
tags: imports, utils, entry
---

## Import utils from the headless/utils subpath

`@hellajs/headless/utils` re-exports the fifteen wiring utils (`trapFocus` through `modal`); the package root additionally exports the component-factory tier (`popover`, `menu`, `combobox`, ...), which imports `@hellajs/dom` for portals and rendering. The utils tier is deliberately kept renderer-free for wiring over real DOM nodes - only `modal` touches dom, for node-scoped disposal. Util-only consumers (script augmentations, editor toolbars, code that must not pull a renderer) import from the subpath; importing a util through the root works but links the whole factory surface into the module graph.

**Incorrect (what is wrong):**

```ts
import { onEscape } from "@hellajs/headless";

// Resolves, but links popover/dialog/menu/combobox/... and their
// @hellajs/dom dependency graph into a surface that only dismisses a panel.
const dismiss = onEscape(panel, () => hide());
```

**Correct (what is right):**

```ts
import { onEscape } from "@hellajs/headless/utils";

const armPanel = (panel: HTMLElement, hide: () => void) => onEscape(panel, hide);
```

Components stay on the root entry: `import { popover } from "@hellajs/headless"`.

Reference: `packages/headless/lib/utils/index.ts` and `packages/headless/docs/concepts/headless-utils.mdx`
