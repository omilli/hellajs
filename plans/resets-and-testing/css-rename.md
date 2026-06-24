## [ ] Rename css reset/remove family to resetCss/removeCss convention
**Type:** Code

### Depends On
- None

### Objective
Every css reset/remove export follows the project-wide verb-first `reset<Package>` / `remove<Package>` convention matching `resetDom`, `resetRouter`, `resetResource`.

### Solution
Rename four public exports — files, functions, and barrel re-exports — in `packages/css/`:

| Old | New |
|---|---|
| `lib/cssReset.ts` → `cssReset` | `lib/resetCss.ts` → `resetCss` |
| `lib/cssVarsReset.ts` → `cssVarsReset` | `lib/resetCssVars.ts` → `resetCssVars` |
| `lib/cssRemove.ts` → `cssRemove` | `lib/removeCss.ts` → `removeCss` |
| `lib/cssVarsRemove.ts` → `cssVarsRemove` | `lib/removeCssVars.ts` → `removeCssVars` |

Move each file to its new path, rename the exported function, keep the existing JSDoc and implementation verbatim. Update `packages/css/lib/index.ts` re-exports to the four new names. Follow `guides/code.md`: filename matches export name, one public API function per file, double quotes, semicolons.

Breaking change (four public symbols renamed) → major changeset for `@hellajs/css`.

Caller-facing change:

```ts
// Before
import { cssReset, cssVarsReset, cssRemove, cssVarsRemove } from "@hellajs/css";

// After
import { resetCss, resetCssVars, removeCss, removeCssVars } from "@hellajs/css";
resetCss();        // nuke all css rules + in-memory maps
resetCssVars();    // nuke all vars + dispose vars effects
removeCss(name);   // refcount teardown of one css scope (unchanged behavior)
```

### Definition of Done
- [ ] `bun check css` exits 0
- [ ] `bun lint` exits 0
- [ ] Solution includes a runnable code example for each changed public API symbol (the Before/After block above)
- [ ] Every changed exported symbol has JSDoc (these four are re-exported by `index.ts`, so no `@internal`)
- [ ] A changeset exists at `.changeset/*.md` declaring `major` for `@hellajs/css`
- [ ] Audit skill run on the four renamed files + `lib/index.ts` reports no deviations from `./guides/code.md`
