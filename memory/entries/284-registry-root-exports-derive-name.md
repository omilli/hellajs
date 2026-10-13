---
type: decision
title: "Registry root exports: derive the name from source, alias at import"
description: "Registry roots don't follow dir names (sonner→Toaster, resizable→ResizablePanelGroup): derive from source/dist, never the path; default→named rewrites alias `{ Root as Binding }`."
tags: [ui, contract]
timestamp: 2026-10-12
last_confirmed: 2026-10-12
triggers: [import-rewrite, registry-export, named-import, dist-module]
---
# Why

A default import binds any identifier (`import Resizable from …`), so consumer
binding names routinely diverge from the module's real export name. Flipping to
named imports mechanically preserves the identifier (`import { Resizable }`) —
which only resolves where binding = export. Guessing the export from the
component dir is wrong in both directions: `sonner` exports `Toaster`,
`resizable` exports `ResizablePanelGroup`; and flat-file probes miss the other
consumer shapes that break: `.default` member accesses on namespace imports
(44 cast-chain + 4 direct sites in `variants.ts` alone), dynamic imports of
COPIED registry files (`plainjs.test.ts` read `written.default` of the
stripped output), and `../` vs `../../` depth variants that path-anchored
sweep patterns silently exclude. A trailing `export { Root };` re-export in a
canonical is legal beside a default export and becomes a TS2323 redeclaration
the moment the root goes named (command/combobox, both formats).

# Evidence

2026-10-12 named-registry-exports plan run (`plans/ui/code/named-registry-exports`):
`SyntaxError: Export named 'ButtonCssJsx' not found in module …/button/css/button.js`,
`[MISSING_EXPORT] "Resizable" is not exported by …/resizable/css/resizable.js`,
`TS2323: Cannot redeclare exported variable 'Command'`. Fix that went green:
derive each root from the canonical's `export default function <Name>` line
(git HEAD pre-rewrite; post-change, the matching root `export function` line),
assert it against the built dist's `export function <Root>(`, rewrite imports
as `import { Root as Binding }`, convert `.default` accesses to the root name,
and verify every docs-site `@registry` import against dist exports by script.
`bun coverage ui` 3263 pass / 0 fail; `cd docs && bun run build` 181 pages.
