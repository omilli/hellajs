---
title: Falsy removes, zero renders, style objects kebab-case with no auto-px
impact: MEDIUM
impactDescription: assuming VDOM-style value handling produces removed attributes where "0" was meant, unitless style numbers that silently do nothing, and class lists that never combine
tags: attributes, style, class, falsy
---

## Falsy removes, zero renders, style objects kebab-case with no auto-px

`renderProp` applies values through a fixed branch order, not React-style attribute normalization. `false`, `null`, and `undefined` REMOVE the attribute - that is the intended conditional-attribute pattern (`class={active() ? "on" : null}`) - while `0` is a value and renders `"0"`, and `""` renders as an empty attribute. `value`, `checked`, `selected`, and `innerHTML` set the element's IDL property directly (falsy becomes `""`, never removal). A `style` object serializes camelCase keys to kebab-case declarations, DROPS falsy declarations, and adds no automatic units - write `fontSize: "12px"`, not `12` - while `class` accepts an array of strings, space-joined with falsy entries filtered out.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const count = signal(0);
const active = signal(false);
// Expects data-count to disappear at 0 (it renders "0") and expects
// CSS "font-size: 12px" from a unitless number (no declaration renders).
const App = () => (
  <div data-count={count()} style={{ fontSize: 12 }} class={[active() && "on"]}>
    Badge
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const count = signal(0);
const active = signal(false);
// 0 renders "0"; units are explicit; the class getter is reactive, so the
// toggle re-renders (null removes, arrays space-join filtering falsy).
const App = () => (
  <div data-count={count} style={{ fontSize: "12px" }} class={() => [active() ? "on" : null]}>
    Badge
  </div>
);
```

Reference: `packages/dom/lib/internal/utils.ts renderProp` and `packages/dom/lib/types/attributes.d.ts StyleObject` and `packages/dom/docs/concepts/attribute-prefixes.mdx`
