---
title: Update copies by re-running add with overwrite, never by patching node_modules
impact: HIGH
impactDescription: overwrite silently discards local edits to the copy, and node_modules patches vanish on the next install
tags: update, overwrite, node_modules
---

## Update copies by re-running add with overwrite, never by patching node_modules

`add` never replaces an existing file by default: each existing copy is skipped with a warning (`pass --overwrite to replace`). To adopt upstream changes, re-run `add <name> --overwrite` deliberately - the replace discards your local edits to that copy, so commit or hand-merge first. Never restyle by editing the registry under `node_modules/@hellajs/ui/registry/`: those files are the canonical splice sources, local to the install, replaced on every reinstall, invisible to your project's version control, and never reaching the copy already sitting in `src/components/`.

**Incorrect (what is wrong):**

```ts
import { readFileSync, writeFileSync } from "node:fs";

// "Restyle" by patching the registry inside node_modules: lost on the next
// install, invisible to git, and the already-copied button.tsx never sees it.
const path = "node_modules/@hellajs/ui/registry/button/button-css.ts";
writeFileSync(path, readFileSync(path, "utf8").replace("bg-primary", "bg-red-500"));
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Adopt upstream changes deliberately: the default add skips existing files
// with a warning; overwrite replaces them (local edits are discarded -
// commit or hand-merge first).
addComponent(["button"], { overwrite: true });
```

Reference: `packages/ui/lib/internal/copy.ts copyFiles` and `packages/ui/tests/cli/add.test.ts`
