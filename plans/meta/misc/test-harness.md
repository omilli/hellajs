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

### Tests view
This plan's own Tests task (Rewrite package tests to explicit imports) is the test-side change — point at it. The Config task sets up the harness; the Tests task migrates every `packages/*/tests/*.test.ts` to explicit imports per `tests.md` §Files, §Shared State and Cleanup, §Anti-Patterns.

### Docs view
No impact. `docs.md` governs package/website docs; no public symbol changes here. The companion guide rewrite (the test-harness import conventions, anti-patterns, and reset-composition rules) is owned by `plans/meta/docs/guides-tests-md.md` — cite it, do not duplicate.

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
