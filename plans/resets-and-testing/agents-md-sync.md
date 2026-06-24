## [ ] Sync package AGENTS.md files to the new exports and testing approach
**Type:** Docs

### Depends On
- Rename css reset/remove family to resetCss/removeCss convention
- Add resetResource nuke
- Add resetRouter nuke
- Add resetDom nuke and mount lifecycle handle
- Migrate test harness off globals to explicit imports

### Objective
Every package `AGENTS.md` (and its generated `CLAUDE.md` mirror) reflects the new exports (css renames, new resets, dom's trimmed barrel + mount handle) and the no-globals testing approach.

### Solution
`AGENTS.md` is the source of truth; `CLAUDE.md` mirrors regenerate via `bun sync`. Edit per package:
- `packages/css/AGENTS.md` — rename the four exports in the file table (`resetCss`, `resetCssVars`, `removeCss`, `removeCssVars`) and every inline mention.
- `packages/resource/AGENTS.md` — add `resetResource` to public exports; note `invalidateAll` is not a full reset (misses dedup + `onlineCallbacks`).
- `packages/router/AGENTS.md` — add `resetRouter`; note it does not touch the URL.
- `packages/dom/AGENTS.md` — trim the exports table (remove `flushMount`, `queueCleanup`, `resetDomState`→rename to `resetDom`, `getState`/`hasState`/`peekState`/`deleteState`, `checkMultiSelectors`/`multiSelectors`); add `resetDom` and the `mount()` `MountHandle` return; rewrite the "Testing approach" section to drop global-helpers references and point at explicit imports + `utils/test-helpers.ts` + source-relative inspector imports for the repo's impl-detail assertions.
- `packages/core/AGENTS.md` — relabel `flush` as operational (not "advanced/testing"); update the testing section to explicit imports (no globals).
- `packages/store/AGENTS.md` — note no global nuke (per-instance `cleanup()`); update the testing section to explicit imports.
- Root `AGENTS.md` — update the packages table and the Testing section wherever it references globals or the old export names.

After editing every `AGENTS.md`, run `bun sync` to regenerate the `CLAUDE.md` mirrors and `.github/instructions/*`.

### Definition of Done
- [ ] Every package `AGENTS.md` exports table matches the actual `lib/index.ts` (cross-checked per package)
- [ ] No `AGENTS.md` references `flushMount`, `queueCleanup`, `resetDomState`, `peekState`, `getState`, `hasState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`, `cssReset`, `cssVarsReset`, `cssRemove`, `cssVarsRemove`, or the injected testing globals as current public API
- [ ] `bun sync` exits 0 and regenerates `CLAUDE.md` mirrors + `.github/instructions/*`
- [ ] No claim in any `AGENTS.md` contradicts the implementation
