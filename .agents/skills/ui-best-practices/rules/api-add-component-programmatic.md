---
title: Drive addComponent from tooling with the CLI's exact contract
impact: MEDIUM
impactDescription: scaffolding that guesses the options contract writes wrong-flavor files or silently skips existing ones
tags: addComponent, tooling, scaffolding
---

## Drive addComponent from tooling with the CLI's exact contract

`addComponent(names, options)` is the add command as a function - same validation, same throw contracts, same copy pipeline: options override `hella.ui.json` per field; names resolve recursively (dependencies copy alongside, a shared dependency resolves once, a cycle throws); the peer check runs against the target root's `package.json` (throwing when it is absent); existing files are skipped with a warning unless `overwrite` is set. Empty names, or an invalid `style`/`themeMode`/`lang`, throw the same `[ui] addComponent:` errors the CLI surfaces. Pass `dir` explicitly whenever the process cwd is not the target project.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Scaffold tool guessing names and options: "Button" is not a registry
// slug (throws not-found), "base" is not a style (throws the two-style
// contract), and without dir the peer check reads the tool's own
// package.json, not the target project's.
addComponent(["Button"], { style: "base" as "css" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Same contract as the CLI: options override hella.ui.json per field; the
// peer check reads dir's package.json; overwrite is opt-in (the default
// skips existing files with a warning).
addComponent(["dialog", "button"], {
  dir: "path/to/project",
  overwrite: true,
});
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/tests/cli/cli-e2e.test.ts`
