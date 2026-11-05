---
title: Keep the theme artifacts straight - tokens.ts is css, theme.css is tailwind
impact: MEDIUM
impactDescription: pulling @hellajs/css machinery into a tailwind project (or tokens.ts without the css style) adds a runtime the flavor exists to avoid
tags: tokens, theme-css, split, palette
---

## Keep the theme artifacts straight - tokens.ts is css, theme.css is tailwind

One palette, two artifacts. The css flavor's `tokens.ts` is a `@hellajs/css` `vars` sheet exporting `tokens`, a camelCase-keyed map whose every key resolves to its `var(--kebab)` reference (`tokens.primaryForeground` is `var(--primary-foreground)`); copied css components import it for typed token access, and the custom-property names stay kebab. The tailwind flavor's `theme.css` is plain CSS with zero JavaScript and zero `@hellajs/css` - utilities (`bg-primary`, `text-foreground`, `rounded-md`) read the same token names through the `@theme inline` mapping. The split is deliberate: a tailwind project should not need a CSS-in-JS runtime for its palette. Do not import `tokens.ts` in a tailwind project or reach for `@hellajs/css` there; do not expect a `tokens` export from `theme.css`.

**Incorrect (what is wrong):**

```ts
// Tailwind project reaching for the css artifact: drags the @hellajs/css
// runtime in for nothing - the tailwind copies read utility classes off
// theme.css and never touch the tokens map.
import { tokens } from "./src/components/tokens";

const primary: string = tokens.primary;
```

**Correct (what is right):**

```ts
// One palette, two carriers - identical token names, different machinery:
//   css: tokens.ts (a vars sheet) - `tokens.primary` is "var(--primary)";
//        import once; typed token access for your own rules.
//   tailwind: theme.css (plain CSS, zero JS, zero @hellajs/css) - the
//        `bg-primary` utility reads --primary through @theme inline.
const paletteTokens: string[] = ["--primary", "--foreground", "--muted", "--border", "--ring"];
```

For joining class fragments in your own css-flavor code, `cx` from `@hellajs/css` is the joiner; the tailwind flavor's joiner is the copied `cn`.

Reference: `packages/ui/docs/concepts/theming.mdx` and `packages/ui/registry/theme/theme.css` and `packages/ui/registry/theme/tokens.dark.ts`
