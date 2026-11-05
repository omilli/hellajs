---
title: Run init once before adding components; it owns the theme entry
impact: HIGH
impactDescription: css copies import the tokens sheet beside them - components added without the theme carry a dangling import and an unregistered palette
tags: init, theme, tokens, config
---

## Run init once before adding components; it owns the theme entry

`init` does two things once per project: writes `hella.ui.json` (an existing file is kept unless `--force` rewrites it) and adds the shared `theme` entry through the same add path - `tokens.ts` for the css style, `theme.css` plus the shared `cn` helper for tailwind. The theme is why: every css-flavor copy imports `./tokens.js` beside it (the splice rewrites the registry's `../theme/tokens.js` reference to a components-dir sibling), so components added without the theme entry carry an import to a file that does not exist and a palette that resolves to nothing. `init` runs at the project root - the peer check reads `package.json` there.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// No init, no theme entry: the css copy's spliced style module imports
// ./tokens.js, which was never copied - broken resolution, empty palette.
addComponent(["button"]);
```

**Correct (what is right):**

```ts
import { initProject } from "@hellajs/ui";

// One-time, at the project root: writes hella.ui.json (kept unless force)
// and adds the theme entry - tokens.ts (css) or theme.css + cn (tailwind).
initProject({ themeMode: "light" });
```

The theme entry can also be added standalone (`add theme`) when the config already exists; the invariant is one theme per project, imported once in the app entry.

Reference: `packages/ui/lib/initProject.ts initProject` and `packages/ui/docs/concepts/installation.mdx`
