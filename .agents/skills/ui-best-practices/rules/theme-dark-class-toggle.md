---
title: Togglable dark mode is the .dark ancestor class
impact: MEDIUM
impactDescription: toggling data-theme or color-scheme flips nothing - both palettes remap under a .dark ancestor selector
tags: dark, class, toggle
---

## Togglable dark mode is the .dark ancestor class

Dark mode is the `.dark` class: both theme artifacts remap the palette under a `.dark` ancestor selector, and the class works on `<html>` or any subtree, so sections of a page can theme independently. Toggle it imperatively on `document.documentElement` (or a subtree root) driven by a signal. There is no `data-theme` attribute contract and no `color-scheme` switch - the selector is the whole mechanism, the same contract shadcn's own components style their dark variants against.

**Incorrect (what is wrong):**

```ts
// data-theme / color-scheme toggling: nothing in either theme artifact keys
// off these - the palette stays light while the flag flips.
document.documentElement.setAttribute("data-theme", "dark");
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";

const isDark = signal(false);

const toggleTheme = (): void => {
  isDark(!isDark());
  document.documentElement.classList.toggle("dark", isDark());
};
```

An app that never toggles dark mode should use the dark-default sheet instead (`themeMode: "dark"`) and drop the class machinery entirely.

Reference: `packages/ui/registry/theme/tokens.ts` and `packages/ui/docs/concepts/theming.mdx`
