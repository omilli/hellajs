---
title: Mount compiled or component-wrapped trees, never hand-built node objects
impact: CRITICAL
impactDescription: hand-built HellaNode input throws at mount, so nothing renders and the error names an API that does not exist for hand-authoring
tags: mount, hydrate, component, TemplateBuildFn
---

## Mount compiled or component-wrapped trees, never hand-built node objects

`mount` and `hydrate` accept flagged build functions - the output of compiled JSX (a compiled component call's result, a compiled element, or a wrapper returning one), typed as `TemplateBuildFn`. There is no virtual-DOM object input: a plain `{ tag, props, children }` tree is the server/compiler currency (`HellaNode`, consumed by `@hellajs/ssr`), and passing one throws `[dom] mount: hand-built HellaNode input is not supported - compile via hellajs-compiler or build imperatively via @hellajs/dom/runtime`. Build trees as JSX components (or call the `@hellajs/dom/runtime` wiring fns imperatively) and mount them directly - the compiler attaches the disposal scope to every component call it emits.

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
import { mount } from "@hellajs/dom";

const App = () => <div id="root">hello</div>;
// Compiled JSX already flags the build and attaches the disposal scope;
// mount the component function directly.
mount(App, "#app");
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/lib/runtime.ts TemplateBuildFn` and `packages/dom/docs/api/mount.mdx`
