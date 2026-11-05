---
title: hella.ui.json holds per-project defaults; flags override per call
impact: MEDIUM
impactDescription: an invalid config value throws a named error instead of falling back, and per-call style flags silently mix variants when the config was never set
tags: config, flags, precedence, readConfig
---

## hella.ui.json holds per-project defaults; flags override per call

Every add resolves four fields - `componentsDir` (`src/components`), `style` (`css`), `themeMode` (`light`), `lang` (`ts`) - by explicit option first, then `hella.ui.json`, then the built-in default per field. The config is the right home for the one-time decisions (the style especially); flags are for one-off overrides. Values are validated at read and at add: invalid JSON, or a `style`/`themeMode`/`lang` outside its enum, throws the named `[ui] readConfig:` / `[ui] addComponent:` error rather than silently falling back.

**Incorrect (what is wrong):**

```ts
import { readConfig } from "@hellajs/ui";

// A hand-edited { "style": "scss" } in hella.ui.json makes every command at
// this root throw - [ui] readConfig: style must be one of css, tailwind -
// instead of quietly falling back to the css default.
const config = readConfig();
```

**Correct (what is right):**

```ts
import { readConfig } from "@hellajs/ui";

// The effective copy plan: config fields, each falling back to its default
// (componentsDir "src/components", style "css", themeMode "light", lang "ts");
// per-call flags override these without rewriting the file.
const config = readConfig();
const style: string = config.style; // "css" | "tailwind"
const target: string = config.componentsDir;
```

A config written before a field existed keeps behaving as its default - no migration is needed.

Reference: `packages/ui/lib/internal/config.ts readConfig` and `packages/ui/tests/cli/config.test.ts`
