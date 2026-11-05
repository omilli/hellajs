---
title: themeMode dark is the css-only dark-default sheet, not a toggle
impact: MEDIUM
impactDescription: dark mode plus tailwind throws at add time, and the dark sheet has no .dark remap - it is for apps that never toggle
tags: themeMode, dark, dark-default, css-only
---

## themeMode dark is the css-only dark-default sheet, not a toggle

`themeMode: "dark"` (in `hella.ui.json`, or `--theme-mode dark` on `init`/`add`) selects a different theme artifact: `tokens.dark.ts` copies in place of `tokens.ts` - the dark palette registered on `:root` with no `.dark` remap, for apps that ship dark-first and never toggle. It supports the css style only - a dark themeMode meeting the tailwind style throws at add time. The two dark paths are distinct: togglable apps keep the default light sheet and toggle the `.dark` class; never-toggle apps set the dark-default sheet once. `init` persists the mode into `hella.ui.json`, so it is a one-time decision, not a per-add flag.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Throws at add time: [ui] addComponent: themeMode "dark" supports the css
// style only, received style "tailwind". Tailwind dark mode is the .dark
// class contract on the default theme.css - there is no dark sheet for it.
addComponent(["theme"], { style: "tailwind", themeMode: "dark" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Dark-default, css style: tokens.dark.ts lands AS tokens.ts (same file
// name, dark palette, no remap). Set once via init --theme-mode dark -
// persisted into hella.ui.json, inherited by every later add.
addComponent(["theme"], { themeMode: "dark" });
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/registry/theme/tokens.dark.ts` and `packages/ui/tests/cli/registry.test.ts`
