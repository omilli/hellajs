# [ ] test-harness

## Contract

### Surface change
no

### Package
meta — cross-cutting (`utils/` root + every package's tests). Per TEMPLATE Hard rules: non-package work → `plans/meta/{type}/`; root task Type Config → `misc`.

### Guide governance
- Files ← `scripts.md` §Canonical paths, §File-structure decision tree, §Language and runtime, §Shared utils (where `utils/` applies), and `code.md` §Config Verification Checklist (for `bunfig.toml` / preload)
- Tests ← `tests.md` §Files (justifies the Tests-view + the Tests task scope), §Shared State and Cleanup, §Anti-Patterns

### Files
- `utils/happydom.js` — modify — reduce to exactly `import { GlobalRegistrator } from "@happy-dom/global-registrator"; GlobalRegistrator.register();` (2 lines); delete every `globalThis.x = …` assignment (`signal`/`effect`/`computed`/`batch`/`untracked`/`flush`/`scope`/`onError`/`tick`/`delay`/`wait`/`suppressConsole`/`setupContainer`/`resetTestState`)
- `utils/test-helpers.ts` — create — exports `wait`, `suppressConsole`, `resetTestState` (orchestrator composing each package `reset*`); imported relatively by each package's tests
- ambient `declare global` type declarations across `packages/**/types*.d.ts`, `utils/**`, and the dom/core type files — delete — declarations matching the formerly-injected symbol names
- `packages/*/tests/*.test.ts` — modify — replace global usage with explicit imports (reactive from `@hellajs/core`; DOM/error from `@hellajs/dom/bundle`; helpers from `../../../utils/test-helpers`; source-relative inspector imports for the 6 internal-state helpers; `tick(0)`→`await Promise.resolve()`; mount handle `.flush()`/`.unmount()`)
- `guides/tests.md` — modify — rewrite for the explicit-import, no-globals model (delete the `## Globals Reference` section; invert the "never import" anti-pattern into a positive import rule; rewrite the import-order rule; rewrite the async guidance around `Promise.resolve()` / `setTimeout` / `wait()`; rewrite the testing-utilities section around `resetTestState` + per-package `reset*` nukes + `flush` as an explicit import)
- `packages/core/AGENTS.md` — modify — relabel `flush` as operational (not "advanced/testing"); rewrite the testing section to explicit imports (no globals)
- `packages/dom/AGENTS.md` — modify — rewrite the **testing section** to drop global-helpers references and point at explicit imports + `utils/test-helpers.ts` + source-relative inspector imports. NOTE: only the testing section — the exports-table delta (`resetDom`, `MountHandle`, eight-entry trim) is owned by `plans/dom/code/dom-reset-mount-handle.md`
- `packages/store/AGENTS.md` — modify — note no global nuke (per-instance `cleanup()` only); rewrite the testing section to explicit imports
- `AGENTS.md` (root) — modify — packages table and Testing section: update wherever it references globals or the old export names (`flushMount`, `resetDomState`, `cssReset`, etc.)
- `CLAUDE.md` mirrors + `.github/instructions/*.instructions.md` + `.github/copilot-instructions.md` — regenerate — via `bun sync` after every `AGENTS.md` edit (root + per-package)

### Tests view
This plan's own Tests task (Rewrite package tests to explicit imports) is the test-side change — point at it. The Config task sets up the harness; the Tests task migrates every `packages/*/tests/*.test.ts` to explicit imports per `tests.md` §Files, §Shared State and Cleanup, §Anti-Patterns.

### Docs view
This plan owns the testing-model documentation surface: rewrite `guides/tests.md` for the explicit-import, no-globals model (the guide describes the reality tasks 1–2 land), and rewrite the **testing-section** of each package `AGENTS.md` (core/dom/store) + the root `AGENTS.md` packages table + Testing section to match, then `bun sync` to regenerate mirrors. NOTE the split: each feature plan owns its package `AGENTS.md` **exports-table** delta (which symbols it ships); THIS plan owns only the cross-cutting **testing-section** rewrite + root sync. Per `code.md` §Config Verification Checklist (guides + AGENTS.md are authoring artifacts, not published docs; `docs.md` does not govern them).

---

## [ ] Strip happydom preload and add utils/test-helpers
**Type:** Config
**Depends on:** None

### Strategy
Cross-plan dependency note: this plan depends on the reset nukes existing so `resetTestState()` can compose them — `plans/css/code/css-rename.md` (css reset/remove rename), `plans/resource/code/resource-reset.md` (`resetResource`), `plans/router/code/router-reset.md` (`resetRouter`), `plans/dom/code/dom-reset-mount-handle.md` (`resetDom` + mount handle). Those plans must land first.

Reduce `utils/happydom.js` to exactly:

```js
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();
```

Delete every `globalThis.x = …` assignment (`signal`/`effect`/`computed`/`batch`/`untracked`/`flush`/`scope`/`onError`/`tick`/`delay`/`wait`/`suppressConsole`/`setupContainer`/`resetTestState`). DOM globals (`document`, `window`, `MutationObserver`, …) remain on `globalThis` — that is happy-dom's contract, not ours.

Locate and delete the ambient type declarations that declared those symbols as globals (search `packages/**/types*.d.ts`, `utils/**`, and the dom/core type files for `declare global`/ambient signatures matching the injected names) — TypeScript must flag any leftover bare reference as undefined.

Create `utils/test-helpers.ts` exporting the non-trivial shared helpers (imported relatively by each package's tests):
- `wait(fn, ms?)` — poll-until-true (port verbatim from the current preload).
- `suppressConsole()` — `console.error` capture (port verbatim).
- `resetTestState(html?)` — orchestrator: sets `document.body.innerHTML`, sweeps `<style>` elements, and calls `resetDom()`, `resetCss()`, `resetCssVars()`, `resetResource()`, `resetRouter()` (imported from each owning package). This fixes the current css in-memory-map leak (the old `resetTestState` only removed DOM `<style>` elements, not css's `refCounts`/`inlineCache`/vars registries).

Trivial idioms stay inline in tests (`await Promise.resolve()` for one microtask; `await new Promise(r => setTimeout(r, ms))` for real time) — do not export `tick`/`delay`/`setupContainer`. `bunfig.toml`'s `preload` keeps pointing at `utils/happydom.js`; confirm coverage globs still exclude test infra.

### Definition of Done
- [ ] `bun check` exits 0 for every package the change touches
- [ ] `bun lint` exits 0
- [ ] `utils/happydom.js` contains no `globalThis.` assignment (verified by reading the file)
- [ ] No ambient `declare global`/type declaration for the formerly-injected symbols remains (verified by searching the type files)
- [ ] `utils/test-helpers.ts` exports `wait`, `suppressConsole`, `resetTestState` and imports each `reset*` from its owning package
- [ ] Every `scripts` entry referenced by a workflow or another script still runs (preload path unchanged; it still registers happy-dom)
- [ ] No new runtime dependency

---

## [ ] Rewrite package tests to explicit imports
**Type:** Tests
**Depends on:** Strip happydom preload and add utils/test-helpers

### Strategy
Across every `packages/*/tests/*.test.ts`, replace global usage with explicit imports following the `guides/tests.md` import order:
- Reactive primitives: `import { signal, effect, … } from "@hellajs/core";` — only the symbols each file uses.
- DOM/error API: `import { mount, html, onError, … } from "@hellajs/dom/bundle";` (bundle path stays — coverage instruments the bundle).
- Mount lifecycle: replace `flushMount(root)` → `app.flush()` on the handle returned by `mount()`; replace `el.remove(); queueCleanup(el)` → `app.unmount()` (or `el.remove()` + `await Promise.resolve()` where observer-drain is the point).
- Shared dev helpers: `import { wait, suppressConsole, resetTestState } from "../../../utils/test-helpers";` (adjust relative depth per file); `beforeEach(() => resetTestState())` calls the imported orchestrator.
- The six internal-state inspectors (`peekState`, `getState`, `hasState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`) that this repo's tests still need for implementation-detail assertions (e.g. the `cachedBoundary` memo in `error-boundary.test.ts`) are imported source-relative: `import { peekState } from "../lib/internal/state";`. End users never see these — repo-internal test reaches only.
- Inline `tick(0)` → `await Promise.resolve()`; `tick(ms)` → `await new Promise(r => setTimeout(r, ms))`; `delay(v, ms)` → `await Promise.resolve(v)` where the value is already resolved.

### Definition of Done
- [ ] `bun check` exits 0 for every package (full suite green)
- [ ] `bun coverage` overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md` (`jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files)
- [ ] No test file contains a bare reference to a formerly-global symbol (the suite compiling under `--strict` with ambient decls removed verifies this)
- [ ] Every test still asserts a behavior the source exposes

---

## [ ] Rewrite guides/tests.md for explicit-import testing
**Type:** Docs
**Depends on:** Rewrite package tests to explicit imports

### Strategy
Cross-PLAN dependency (NOT intra-file `Depends on:`): the test-harness migration off globals to explicit imports (`utils/test-helpers.ts`) must land first — this rewrite describes that reality, so prose must not precede behavior. Edit `guides/tests.md` in place (no new file). The five coordinated edits anchored in Contract.Files are all in service of one goal: every claim in the guide reflects what a test author actually types today. The two highest-leverage edits are (a) deleting the `## Globals Reference` section wholesale — it is the strongest signal of the old model and leaving any sub-table would keep the anti-pattern alive — and (b) inverting the "never import" anti-pattern into a positive import rule, since that inversion is the entire conceptual axis of the migration. The async rewrite drops the `tick` decision tree entirely because the `tick` symbol no longer exists; the three-replacement ladder (`Promise.resolve()` / `new Promise(r => setTimeout(r, ms))` / `wait()`) covers every real case. Trade-off considered and rejected: keeping a deprecated "globals (legacy)" note for a release cycle — would contradict the single-source-of-truth rule and this plan's clean break, leaving audit/worker skills parsing a stale model.

### Definition of Done
- [ ] Every code example in the changed `guides/tests.md` reflects the actual explicit-import signatures (cross-checked against `utils/test-helpers.ts` and the package barrels)
- [ ] The `## Globals Reference` section is gone, and no claim remains that reactive primitives / dom helpers / async helpers are globals
- [ ] No claim contradicts the implementation — cross-checked against `utils/test-helpers.ts`, `utils/happydom.js`, and the package `reset*` exports
- [ ] File name unchanged (`guides/tests.md`, edited in place)

---

## [ ] Sync package testing sections + root AGENTS.md
**Type:** Config
**Depends on:** Rewrite package tests to explicit imports

### Strategy
The package `AGENTS.md` testing sections and the root `AGENTS.md` Testing section currently describe the globals model; this task rewrites them to match the explicit-import reality tasks 1–2 land. Scope is the **testing-section** rewrite only — each feature plan owns its package `AGENTS.md` **exports-table** delta (which symbols it ships). Specifically: core (relabel `flush` operational + testing section), dom (testing section only — the exports-table `resetDom`/`MountHandle`/eight-trim delta stays with `plans/dom/code/dom-reset-mount-handle.md`), store (no-global-nuke note + testing section), and root `AGENTS.md` (packages table + Testing section, wherever it references globals or old export names). After every `AGENTS.md` edit, run `bun sync` once to regenerate the full closed generated set (`CLAUDE.md` mirrors + `.github/instructions/*` + `.github/copilot-instructions.md`). Trade-off considered and rejected: distributing the testing-section rewrites into each feature plan — the testing-section story is one cross-cutting concern driven by the harness migration, so a single owner next to the migration is clearer and avoids five plans each re-deriving the same explicit-import prose (Correctness/Clarity over Brevity).

### Definition of Done
- [ ] `packages/core/AGENTS.md` relabels `flush` as operational and its testing section uses explicit imports (no globals)
- [ ] `packages/dom/AGENTS.md` testing section drops global-helpers references and points at explicit imports + `utils/test-helpers.ts` + source-relative inspector imports (exports-table delta left to `plans/dom/code/dom-reset-mount-handle.md`)
- [ ] `packages/store/AGENTS.md` notes no global nuke (per-instance `cleanup()` only) and its testing section uses explicit imports
- [ ] Root `AGENTS.md` packages table and Testing section reference no globals and no old export names (`flushMount`, `resetDomState`, `cssReset`, etc.) as current public API
- [ ] `bun sync` exits 0 and regenerates `CLAUDE.md` mirrors + `.github/instructions/*` + `.github/copilot-instructions.md`
- [ ] No `AGENTS.md` contradicts the implementation — cross-checked against `utils/test-helpers.ts`, `utils/happydom.js`, and the package barrels
