## [ ] Migrate test harness off globals to explicit imports

### Depends On
- Rename css reset/remove family to resetCss/removeCss convention
- Add resetResource nuke
- Add resetRouter nuke
- Add resetDom nuke and mount lifecycle handle

### Objective
No HellaJS symbol is injected onto `globalThis`; every test imports what it uses (reactive primitives from `@hellajs/core`, mount handle / resets from owning packages, shared dev helpers from a relative `utils/test-helpers.ts`), and a single `resetTestState()` orchestrates every package's nuke.

### Sub-tasks

#### [ ] Strip happydom preload and add utils/test-helpers.ts (Config)
**Solution:** Reduce `utils/happydom.js` to exactly:

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

**Definition of Done:**
- [ ] `bun check` exits 0 for every package the change touches
- [ ] `bun lint` exits 0
- [ ] `utils/happydom.js` contains no `globalThis.` assignment (verified by reading the file)
- [ ] No ambient `declare global`/type declaration for the formerly-injected symbols remains (verified by searching the type files)
- [ ] `utils/test-helpers.ts` exports `wait`, `suppressConsole`, `resetTestState` and imports each `reset*` from its owning package
- [ ] Every `scripts` entry referenced by a workflow or another script still runs (preload path unchanged; it still registers happy-dom)
- [ ] No new runtime dependency

#### [ ] Rewrite package tests to explicit imports (Tests)
**Solution:** Across every `packages/*/tests/*.test.ts`, replace global usage with explicit imports following the `guides/tests.md` import order:
- Reactive primitives: `import { signal, effect, … } from "@hellajs/core";` — only the symbols each file uses.
- DOM/error API: `import { mount, html, onError, … } from "@hellajs/dom/bundle";` (bundle path stays — coverage instruments the bundle).
- Mount lifecycle: replace `flushMount(root)` → `app.flush()` on the handle returned by `mount()`; replace `el.remove(); queueCleanup(el)` → `app.unmount()` (or `el.remove()` + `await Promise.resolve()` where observer-drain is the point).
- Shared dev helpers: `import { wait, suppressConsole, resetTestState } from "../../../utils/test-helpers";` (adjust relative depth per file); `beforeEach(() => resetTestState())` calls the imported orchestrator.
- The six internal-state inspectors (`peekState`, `getState`, `hasState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`) that this repo's tests still need for implementation-detail assertions (e.g. the `cachedBoundary` memo in `error-boundary.test.ts`) are imported source-relative: `import { peekState } from "../lib/internal/state";`. End users never see these — repo-internal test reaches only.
- Inline `tick(0)` → `await Promise.resolve()`; `tick(ms)` → `await new Promise(r => setTimeout(r, ms))`; `delay(v, ms)` → `await Promise.resolve(v)` where the value is already resolved.

**Definition of Done:**
- [ ] `bun check` exits 0 for every package (full suite green)
- [ ] `bun coverage` overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md` (`jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files)
- [ ] No test file contains a bare reference to a formerly-global symbol (the suite compiling under `--strict` with ambient decls removed verifies this)
- [ ] Every test still asserts a behavior the source exposes
