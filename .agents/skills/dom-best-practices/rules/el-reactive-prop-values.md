---
title: Element positions auto-wrap reactive expressions; component props and children pass through as-is
impact: CRITICAL
impactDescription: a signal call at component position resolves once at build time - the prop or child renders its initial value and never updates again, with no error to notice
tags: props, reactivity, signals, attributes, compiler
---

## Element positions auto-wrap reactive expressions; component props and children pass through as-is

At element position the compiler wraps any call-containing attribute value or child in a getter, so `class={theme()}` and `<p>{count()}</p>` are reactive, exactly like the bare forms `class={theme}` and `<p>{count}</p>`. At component position nothing is wrapped: props and children pass through as-is, so `label={theme()}` (or a child `<Card>{count()}</Card>`) resolves the signal during the build and the value freezes at its initial state, silently. Pass the signal or a getter into components and let the child component read it at its own element positions. Hand-authored `@hellajs/dom/runtime` calls mirror the component rule: a plain value applies once, a function value is effect-wrapped.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const theme = signal("light");
// label={theme()} resolves NOW: the child receives the string "light"
// forever, no matter how often theme changes.
const App = () => <ThemeCard label={theme()}>Settings</ThemeCard>;
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

const theme = signal("light");

type ThemeCardProps = { label: Signal<string>; children?: HellaChildren };

const ThemeCard = ({ label }: ThemeCardProps) => (
  <section>{label}</section>
);

// The signal itself: the child's element positions keep the binding
// reactive across the component boundary.
const App = () => <ThemeCard label={theme}>Settings</ThemeCard>;
```

Reference: `plugins/compiler/src/processors/attributes.mjs maybeReactive` and `packages/dom/lib/runtime.ts prop` and `packages/dom/docs/concepts/components.mdx`
