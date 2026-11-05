---
title: Custom element attributes are reactive string getters; children are captured once
impact: HIGH
impactDescription: treating element() props as values instead of functions freezes the render at initial attribute values, and later slot-content mutations never re-project
tags: element, custom elements, slots, shadow
---

## Custom element attributes are reactive string getters; children are captured once

`element(tagName, render, options?)` defines a custom element (tag must be hyphenated). Inside the render fn, `props` is a proxy: every attribute key reads as a reactive getter `() => string | null` that re-runs when the attribute changes (attributes are always strings - parse numbers yourself; missing attributes read `null`), while `props.children` and `props.slots` expose the child nodes captured once before first mount - later DOM changes to slot content never re-project. Call the getter inside the render to stay reactive; wrap it in a signal or computation when you need a typed value. Pass `options.shadow` (boolean or `ShadowRootInit`) to render into a shadow root instead of light DOM. Disconnect disposes and a reconnect re-renders from scratch - component state does not survive.

**Incorrect (what is wrong):**

```tsx
import { element } from "@hellajs/dom";

// Reads the attribute once as a string and renders it statically -
// attribute changes never re-run anything.
element("user-badge", (props) => {
  const name = String(props.name);
  return <span>{name}</span>;
});
```

**Correct (what is right):**

```tsx
import { element } from "@hellajs/dom";

// props.name is a reactive getter: call it in the render so the span
// re-renders when setAttribute("name", ...) fires.
element("user-badge", (props) => {
  return <span class="badge">{props.name}</span>;
});
```

Reference: `packages/dom/lib/element.ts element` and `packages/dom/docs/api/element.mdx` and `packages/dom/docs/concepts/custom-elements.mdx`
