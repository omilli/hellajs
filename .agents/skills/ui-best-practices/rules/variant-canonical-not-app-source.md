---
title: Consume copies, not canonical source; markers and splice modules are registry internals
impact: HIGH
impactDescription: a hand-copied canonical ships marker comments and undefined style bindings - the component crashes at first render
tags: canonical, markers, splice, applyStyleVariant, inlineTypes
---

## Consume copies, not canonical source; markers and splice modules are registry internals

The registry's canonical form is a splice template, not a component: `// @hella:styles` and `// @hella:compose` marker regions (consumed and stripped at copy time), ambient `declare const` placeholders where the style module lands, and sibling style/types modules (`<name>-css.ts`, `<name>-tailwind.ts`, `<name>-types.ts`) that are never copied as files. Hand-copying `registry/<name>/<name>.tsx` out of node_modules bypasses the splice: the markers ride along as inert comments and the style bindings (`base`, `variants`) are undefined at render. `applyStyleVariant` and `inlineTypes` are the tooling surface over this contract - the same two passes `add` runs (splice the style module into the marker regions, inline the shared types module at its import site) - for generators that must reproduce add output; app code takes the copy.

**Incorrect (what is wrong):**

```tsx
// Hand-copied canonical straight from the registry folder: the compose
// array references `base` and `variants`, which only exist after the CLI
// splices the style module - ReferenceError at first render, markers
// riding along as dead comments.
const cls = [base, variants["default"]];
```

**Correct (what is right):**

```ts
import { applyStyleVariant, inlineTypes } from "@hellajs/ui";

// Tooling that must reproduce add output runs the same two passes: splice a
// style module into a canonical's marker regions, then inline the shared
// types module at its import site. App code never does this - it takes the
// copy `add` writes.
const canonical = [
  "// @hella:styles",
  "// @hella:end",
  'import type { P } from "./x-types.js";',
  "// @hella:compose",
  "[base]",
  "// @hella:end",
].join("\n");
const styleModule = 'export const base = "inline-flex rounded-md";\n';
const typesModule = "export type P = { class?: string };\n";

const spliced: string = applyStyleVariant(canonical, styleModule, "css");
const standalone: string = inlineTypes(spliced, typesModule);
```

Marker lines must stay standalone in any source fed to the splice - a trailing code fragment on a marker line, or an unknown `@hella:` marker, throws instead of shipping silently.

Reference: `packages/ui/lib/internal/transform.ts applyStyleVariant` and `packages/ui/lib/internal/registry.ts resolveEntry` and `packages/ui/tests/cli/apply-style-variant.test.ts`
