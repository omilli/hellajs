---
title: Never import @hellajs/ui at runtime; run the CLI
impact: CRITICAL
impactDescription: the package exports CLI functions only - a component import fails to resolve and the build breaks
tags: import, runtime, cli, ownership
---

## Never import @hellajs/ui at runtime; run the CLI

`@hellajs/ui` has no importable component surface: the npm artifact is the CLI (`bin/hellajs-ui.js` over `dist/index.js`), and its module entry exports only the tooling functions (`main`, `addComponent`, `initProject`, `listComponents`, `loadRegistry`, `readConfig`, `applyStyleVariant`, `inlineTypes`). Components reach a project as copied source files (`src/components/<name>.tsx`) that import nothing but the peers beside them, and the package never becomes a runtime dependency - any package runner (`npx`, `bunx`, `pnpm dlx`) can drive it. Importing a component from the package (or from a registry subpath) fails resolution: the `exports` map exposes only the dist entry points.

**Incorrect (what is wrong):**

```ts
import { Button } from "@hellajs/ui";
import { Button as RegistryButton } from "@hellajs/ui/registry/button/button";

// Both fail: the entry exports CLI functions, and the exports map exposes
// no registry subpath - there is no component surface to import.
const go = () => <Button variant="outline">Go</Button>;
```

**Correct (what is right):**

```ts
import { main } from "@hellajs/ui";

// The package is its CLI. Run it (npx @hellajs/ui add button) or drive the
// same dispatch programmatically; the component lands as project source in
// src/components/button.tsx and is imported from the copy.
const code: number = await main(["add", "button", "--style", "css"]);
```

A scaffold or generator may import the tooling exports (`addComponent`, `loadRegistry`) - that is the package's actual surface; components never are.

Reference: `packages/ui/lib/index.ts` and `packages/ui/package.json` and `packages/ui/docs/concepts/installation.mdx`
