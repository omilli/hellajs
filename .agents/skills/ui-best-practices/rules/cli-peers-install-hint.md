---
title: Install the peers the add hint names; they never arrive transitively
impact: HIGH
impactDescription: copied source imports @hellajs/* and the tailwind helpers as YOUR dependencies - skipping the hint leaves a build that cannot resolve them
tags: peers, install, checkPeers
---

## Install the peers the add hint names; they never arrive transitively

Copied source imports its packages as regular dependencies of the target project - `@hellajs/ui` itself is never a runtime dependency, so nothing arrives transitively. `add` reads the target root's `package.json` (it throws when there is none, or when the JSON is unparseable) and warns, naming exactly the missing packages with an `npm install` line: every component declares `@hellajs/core` and `@hellajs/dom`; the css style adds `@hellajs/css`; the tailwind style adds `clsx`, `tailwind-merge`, and `tw-animate-css`; the interactive set (menus, popovers, dialogs, overlays, tabs) adds `@hellajs/headless`. The warning is not the build failing - that happens later, at import resolution, far from the command that named the fix. Install exactly what the hint names.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// "The CLI ran fine, so the peers must be fine" - the add only warns. The
// css copy imports @hellajs/css, which resolves nowhere in package.json;
// the build fails at resolution, not at add.
addComponent(["button"]);
```

**Correct (what is right):**

```ts
// The peer sets per style - install the missing subset the hint names:
const cssPeers: string[] = ["@hellajs/core", "@hellajs/dom", "@hellajs/css"];
const tailwindPeers: string[] = [
  "@hellajs/core",
  "@hellajs/dom",
  "clsx",
  "tailwind-merge",
  "tw-animate-css",
];
// Interactive components (dialog, menu, popover, tabs, ...) add @hellajs/headless.
```

The peer list for a given add is the union over every resolved entry, dependencies included.

Reference: `packages/ui/lib/internal/peers.ts checkPeers` and `packages/ui/docs/concepts/cli.mdx` and `packages/ui/tests/cli/add.test.ts`
