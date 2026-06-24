# [ ] agents-md-sync

## Contract

### Surface change
no — no package `index.ts` barrel is touched; this plan edits agent-authoring markdown (`packages/*/AGENTS.md`, root `AGENTS.md`) and regenerates generated mirrors. Non-package work is Surface change: `no` by definition.

### Package
meta — cross-cutting agent-instruction sync; not a package workspace (no `index.ts`).

### Guide governance
- Files ← `code.md` §Config Verification Checklist (per `AGENTS.md`: config + agent-authoring files follow `code.md`'s Config checklist by convention). NOTE: `docs.md` governs package API/concept docs (`packages/*/docs/**`, `docs/**`) and does NOT apply to `AGENTS.md` — these are authoring artifacts the agent reads at runtime, not published docs. Cited to avoid mis-applying `docs.md` templates here (same precedent as `plans/meta/misc/add-plan-strategy-examples.md` and `plans/meta/misc/fix-sync-autocommit-files.md`).

### Files
- `packages/css/AGENTS.md` — modify — exports table: rename the four entries (`cssReset`→`resetCss`, `cssVarsReset`→`resetCssVars`, `cssRemove`→`removeCss`, `cssVarsRemove`→`removeCssVars`); update every inline mention to the new names.
- `packages/resource/AGENTS.md` — modify — exports table: add `resetResource`; note `invalidateAll` is NOT a full reset (misses dedup map + `onlineCallbacks`).
- `packages/router/AGENTS.md` — modify — exports table: add `resetRouter`; note it does not touch the URL (history API left as-is).
- `packages/dom/AGENTS.md` — modify — trim the exports table (remove `flushMount`, `queueCleanup`, `resetDomState`→rename to `resetDom`, `getState`/`hasState`/`peekState`/`deleteState`, `checkMultiSelectors`/`multiSelectors`); add `resetDom` and the `mount()` `MountHandle` return shape (`container`, `flush()`, `unmount()`); rewrite the "Testing approach" section to drop global-helpers references and point at explicit imports + `utils/test-helpers.ts` + source-relative inspector imports for the repo's impl-detail assertions.
- `packages/core/AGENTS.md` — modify — relabel `flush` as operational (not "advanced/testing"); update the testing section to explicit imports (no globals).
- `packages/store/AGENTS.md` — modify — note no global nuke (per-instance `cleanup()` only); update the testing section to explicit imports.
- Root `AGENTS.md` — modify — packages table and Testing section: update wherever it references globals or the old export names (`flushMount`, `resetDomState`, `cssReset`, etc.).
- `CLAUDE.md` mirrors + `.github/instructions/*.instructions.md` + `.github/copilot-instructions.md` — regenerate — via `bun sync` after every `AGENTS.md` edit (root + per-package).

### Tests view
No impact. `packages/*/AGENTS.md` and root `AGENTS.md` are agent-authoring markdown, not source under `packages/*/lib/`; `tests.md` §Files governs `packages/*/tests/**` named after a public surface. No `test()` applies. Verification is the DoD (exports tables match `lib/index.ts`, no stale references, `bun sync` exits 0).

### Docs view
This plan IS the docs task — every package `AGENTS.md` is the agent's runtime truth for exports + testing approach, and is regenerated into `CLAUDE.md` + `.github/instructions/*` via `bun sync`. `docs.md` does NOT govern `AGENTS.md` (agent-authoring); `code.md` §Config Verification Checklist applies by convention (precedent: `plans/meta/misc/add-plan-strategy-examples.md`, `plans/meta/misc/fix-sync-autocommit-files.md`).

---

## [ ] Sync package AGENTS.md files to the new exports and testing approach
**Type:** Docs
**Depends on:** None

### Strategy
Cross-PLAN dependencies (NOT intra-file `Depends on:`): the css rename (`plans/css/code/css-rename.md`), resource reset, router reset, dom reset + mount handle, and the test-harness explicit-import migration must all land first — this plan reflects their settled surface in agent-authoring truth. `AGENTS.md` is the source of truth; `CLAUDE.md` mirrors and `.github/instructions/*` regenerate via `bun sync`, so the workflow is: edit each `packages/*/AGENTS.md` + root `AGENTS.md`, then run `bun sync` once to regenerate the full closed generated set. Per-package edit substance is anchored in Contract.Files (rename vs add vs trim vs rewrite, with the precise insufficiency/behavioral notes — e.g. `invalidateAll` misses dedup + `onlineCallbacks`; `resetRouter` does not touch the URL; store has no global nuke). Trade-off considered and rejected: deferring root `AGENTS.md` to a separate plan — the packages table and Testing section reference the same old export names, so a single coherent sweep is clearer and avoids an interim state where root truth contradicts package truth (Correctness over Brevity).

### Definition of Done
- [ ] Every package `AGENTS.md` exports table matches the actual `lib/index.ts` (cross-checked per package)
- [ ] No `AGENTS.md` references `flushMount`, `queueCleanup`, `resetDomState`, `peekState`, `getState`, `hasState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`, `cssReset`, `cssVarsReset`, `cssRemove`, `cssVarsRemove`, or the injected testing globals as current public API
- [ ] `bun sync` exits 0 and regenerates `CLAUDE.md` mirrors + `.github/instructions/*`
- [ ] No claim in any `AGENTS.md` contradicts the implementation
