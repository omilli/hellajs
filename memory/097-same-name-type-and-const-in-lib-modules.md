---
title: Never import a type and export a same-named const in one lib module
description: "A const rows/part object cannot be annotated by an imported interface of the same name (TS2395 merged-declaration error); ship the const unannotated with self-typed members and reference the interface via `typeof` at internal signatures, leaving the d.ts interface as the public type."
tags: [typescript, lib, exports, rows, components, tsc, merged-declarations]
confirmed: "2026-11-01"
---
# Why

`import type { X }` + `export const X: X` in one module trips TS2395 ("Individual declarations in merged declaration 'X' must be all exported or all local") because the import binding and the exported const merge for the module's export surface; re-exporting the type from the module violates the no-re-export rule, and aliases (`as XShape`) leave four noisy sites. The clean shape: drop the annotation (member arrows already carry explicit prop/return types, so the literal is self-typed), type internal signatures with `typeof X`, and keep the same-named interface in the hand-written `lib/types/*.d.ts` as the documented public type — consumers still see both a value and a type named `X` through the barrel (`export { X }` + `export type *`). Drift risk between interface and const is the package's existing hand-mirrored-d.ts architecture, not a new gap.

# Evidence

`node ./scripts/bundle.ts headless --quiet` failed with TS2395 at the `export const PopoverRows: PopoverRows` pattern (2026-11-01); the same build passed after dropping the annotations and switching `makeSubComponents(items: typeof MenuRows, ...)` in `packages/headless/lib/menu.tsx`, with the interfaces kept in `packages/headless/lib/types/components.d.ts` and both shapes public through `packages/headless/lib/index.ts`. `rg -n 'export const X: X' packages/*/lib` shows no repo precedent for the merged form.
