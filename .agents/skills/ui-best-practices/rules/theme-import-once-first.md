---
title: Import the theme artifact once, before any styled component mounts
impact: HIGH
impactDescription: the palette registers as :root custom properties at import time - imported late or never, every token resolves to nothing
tags: theme, tokens, entry, import
---

## Import the theme artifact once, before any styled component mounts

The css theme artifact (`tokens.ts`) is a `vars` sheet registering the light palette as custom properties on `:root` and remapping the same properties under `.dark`; the tailwind artifact (`theme.css`) is a plain stylesheet carrying the same palette plus the `@theme inline` utility mapping and the `tw-animate-css` import. Both act at import time and are per-app singletons: import the css sheet once in the app entry, before any styled component mounts (server rendering collects it through `cssText` like every other `@hellajs/css` registration), and link or import `theme.css` once. Every component reads the same properties - without the import the custom properties resolve to nothing and the registry renders unstyled.

**Incorrect (what is wrong):**

```ts
import "./src/components/app-shell";

// tokens never imported at the entry: every var(--primary) in the copied
// components' declarations resolves to nothing - the app renders unstyled
// no matter how correct each copy is. A lazy import races the first paint.
```

**Correct (what is right):**

```ts
// entry.tsx (css flavor): the sheet registers the palette on :root - import
// it first, before any styled component mounts; SSR collects it via cssText().
import "./src/components/tokens";

// tailwind flavor instead: import "./src/components/theme.css"; - once.
```

Reference: `packages/ui/registry/theme/tokens.ts` and `packages/ui/docs/concepts/theming.mdx`
