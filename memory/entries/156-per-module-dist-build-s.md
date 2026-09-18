---
type: decision
title: "The per-module dist build's specifier fixup rewrites `from \"./x\"` shapes inside string literals — lib constants embedding import text must carry the final `.js` form to stay identical across dist shapes"
description: esbuild-build.ts's specifier fixup is content-blind — it rewrites `from "./x"` shapes inside string literals, and only the per-module path runs it, so embedded import text must carry final `.js`.
tags: [tooling, bundling, imports]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [import-string-literal, dist-shape-divergence, specifier-fixup, codegen-constant]
---
# Why

`scripts/bundle/esbuild-build.ts` `buildIndividualModules` post-processes each per-module output with `/from\s+["'](\.\.?\/[^"']+)["']/g`, appending `.js` (or `/index.js`) to extensionless relative specifiers for node-ESM resolvability. The regex scans the WHOLE file text, not just import statements — any lib-source string literal containing an import-shaped fragment (`packages/ui/lib/internal/transform.ts`'s `CN_IMPORT`, the injected `cn` import line) gets rewritten in `dist/internal/*.js` while `dist/bundle.js` (flattened, no per-module pass) keeps the source bytes. The two shipped dist shapes then disagree: the CLI (bin → dist/index.js → per-module) emits one form, barrel imports (tests via `@hellajs/ui/bundle`) another — e2e red while unit tests green. The stable fix is authoring the constant in final form (`from "./cn.js"` — the fixup skips specifiers already ending `.js`, and `.js` is the TS convention resolving to the copied `cn.ts` in user projects). Splitting the literal does not survive: esbuild constant-folds string concatenation.

Recall when: embedding import/export text in lib constants (codegen, injectors, template engines), or diagnosing a dist/bundle.js vs dist/internal/*.js content mismatch.

# Evidence

- Divergence observed: `dist/internal/transform.js` carried `import { cn } from "./cn.js";` while `dist/bundle.js` carried `import { cn } from "./cn";` from the same `CN_IMPORT` source constant — `cli-e2e.test.ts` red (bin path), `add.test.ts` green (bundle path).
- Fixup source: `scripts/bundle/esbuild-build.ts` `buildIndividualModules` — `content.replace(/from\s+["'](\.\.?\/[^"']+)["']/g, ...)` with the `.js`-already-present skip.
- Green: constant authored as `'import { cn } from "./cn.js";'` → rebuild → both dist shapes identical; `bun coverage ui` + full `bun lint` exit 0 (68 pass / 0 fail).
