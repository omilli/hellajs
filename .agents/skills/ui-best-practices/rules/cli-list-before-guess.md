---
title: Discover component names with list; names are kebab-case registry slugs
impact: LOW
impactDescription: a guessed PascalCase or plural name fails the add with a named not-found throw - cheap, but avoidable by reading the catalog first
tags: list, names, discovery
---

## Discover component names with list; names are kebab-case registry slugs

Registry names are kebab-case slugs (`alert-dialog`, `native-select`, `input-otp`), not PascalCase exports - `AlertDialog` is a component the copy exports, never a name the CLI resolves. `list` prints every entry; `listComponents()` returns them sorted. Resolution validates up front: an unknown name throws `[ui] resolveEntry: component "<name>" not found in registry`, and a component unavailable at the chosen style throws its own named error. Read the catalog instead of guessing.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// PascalCase guess: the registry holds "alert-dialog", not "AlertDialog" -
// throws [ui] resolveEntry: component "AlertDialog" not found in registry.
addComponent(["AlertDialog"]);
```

**Correct (what is right):**

```ts
import { listComponents } from "@hellajs/ui";

const names: string[] = listComponents(); // the live catalog, sorted slugs
const hasDialog: boolean = names.includes("alert-dialog");
```

Dependencies do not need to be named: `add <name>` resolves each entry's registry dependencies recursively and copies them alongside.

Reference: `packages/ui/lib/listComponents.ts listComponents` and `packages/ui/lib/internal/registry.ts resolveEntry` and `packages/ui/docs/concepts/cli.mdx`
