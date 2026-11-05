---
title: Pass signals and getters as prop values, never their resolved results
impact: CRITICAL
impactDescription: calling the signal in JSX resolves the value once at build time - the attribute renders its initial value and never updates again, with no error to notice
tags: props, reactivity, signals, attributes
---

## Pass signals and getters as prop values, never their resolved results

A plain attribute value (string, number, boolean) applies once at build. A function value - a signal, or a `() => value` getter - is effect-wrapped: the element re-renders that attribute on every change. Writing `class={theme()}` calls the signal during the build, hands the renderer a plain string, and freezes the attribute at its build-time value; `class={theme}` keeps the reactivity. The same rule holds for children (`<p>{count}</p>` is reactive, `<p>{count()}</p>` is not) and for every HellaJS prop surface that accepts `HellaPrimitive`. Call signals in JSX only inside logic that must run once (key extractors, event handlers, computed arguments).

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const theme = signal("light");
// theme() resolves NOW: the class is the string "light" forever,
// no matter how often theme changes.
const App = () => <section class={theme()}>Settings</section>;
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const theme = signal("light");
// The signal itself: the attribute is effect-wrapped and follows every write.
const App = () => <section class={theme}>Settings</section>;
```

Reference: `packages/dom/lib/runtime.ts prop` and `packages/dom/lib/types/attributes.d.ts HellaPrimitive` and `packages/dom/docs/concepts/attribute-prefixes.mdx`
