---
title: Mount compiled or component-wrapped trees, never hand-built node objects
impact: CRITICAL
impactDescription: hand-built HellaNode input throws at mount, so nothing renders and the error names an API that does not exist for hand-authoring
tags: mount, hydrate, component, TemplateBuildFn
---

## Mount compiled or component-wrapped trees, never hand-built node objects

`mount` and `hydrate` accept flagged build functions - the output of compiled JSX (a `component()` result, a compiled element, or a wrapper returning one), typed as `TemplateBuildFn`. There is no virtual-DOM object input: a plain `{ tag, props, children }` tree is the server/compiler currency (`HellaNode`, consumed by `@hellajs/ssr`), and passing one throws `[dom] mount: hand-built HellaNode input is not supported - compile via hellajs-compiler or build imperatively via @hellajs/dom/runtime`. Build trees as JSX components (or call the `@hellajs/dom/runtime` wiring fns imperatively), wrap in `component()` when you need a disposal scope, and mount that.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// Hand-built node object: the VDOM instinct. Throws the documented rejection -
// HellaNode is the server stringifier's currency, not a mount input.
const tree = { tag: "div", props: { id: "root" }, children: ["hello"] };
mount(tree as never, "#app");
```

**Correct (what is right):**

```tsx
import { component, mount } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const App = () => <div id="root">hello</div>;
// component() wraps the render in a disposal scope and flags the build; the
// cast narrows ComponentReturn to its client arm for the mount parameter.
mount(() => component(App, {}) as TemplateBuildFn, "#app");
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/lib/runtime.ts TemplateBuildFn` and `packages/dom/docs/api/mount.mdx`
