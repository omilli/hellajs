---
title: Import @hellajs/headless directly in islands - the server arm renders it safely
impact: MEDIUM
impactDescription: gating server-safe imports behind client:only or dynamic import discards the server HTML the ssr condition exists to provide
tags: astro, headless, resolution, islands, ssr
---

## Import @hellajs/headless directly in islands - the server arm renders it safely

The `ssr` condition means island code imports headless components bare and uses them unguarded: the server arm renders the trigger and the closed content gate to HTML, and the client hydrates the same markup through the dom arm. No `import.meta.env.SSR` branching, no dynamic `import()` deferral, no mock - the package resolves the right arm per environment on its own, and island code is identical on both sides. Wrapping headless usage in `client:only` (or lazily importing it after load) trades away exactly what the condition provides: server-rendered markup that hydrates in place instead of flashing in late. Packages without an `ssr` condition resolve their regular entry in every environment, unchanged.

**Incorrect (what is wrong):**

```astro
---
import Settings from '../components/Settings';
---
<!-- client:only skips the server render the ssr arm already supports:
     the island renders fresh on the client instead of hydrating -->
<Settings client:only="astro-hellajs" />
```

**Correct (what is right):**

```tsx
import { popover } from "@hellajs/headless";
import type { HellaNode } from "@hellajs/dom";

const Popover = popover();

export default function Settings(): HellaNode {
  return (
    <div>
      <Popover.Trigger>Settings</Popover.Trigger>
      <Popover.Content side="bottom">Panel content</Popover.Content>
    </div>
  );
}
```

Used as `<Settings client:load />` in the `.astro` page.

Reference: `plugins/astro/index.mjs configEnvironment` and `plugins/astro/README.md` and `packages/headless/lib/popover.tsx popover`
