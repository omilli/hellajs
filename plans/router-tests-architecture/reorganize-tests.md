## [ ] Reorganize router tests to one API surface per file and extract shared helpers
**Type:** Tests

### Depends On
- Enforce one inner describe per file in the test style guide

### Objective
Every file under `packages/router/tests/` covers exactly one API surface, is named for that surface, contains at most one inner `describe`, and shares its setup through `helpers.ts` instead of repeating it.

### Solution
No router source code changes. All work is under `packages/router/tests/`. Coverage baseline before this task: `99.81%` lines / `100.00%` functions on `packages/router/dist/bundle.js`. No source lines change, so coverage must not drop.

**File reorganization.** Rename and split so each file maps to one API surface. Each resulting file keeps the outer `describe("router")` wrapper and at most one inner `describe` (or none, with tests directly under the outer wrapper).

- `features-scroll.test.ts` → rename to `scroll.test.ts`. Inner describe `scroll` stays. Contents unchanged otherwise.
- `features-nav.test.ts` → rename to `navigate-options.test.ts`. Inner describe `navigate options` stays.
- `features.test.ts` → **delete**, split its three sibling concerns into three files:
  - `hash-mode.test.ts` — the `describe("hash mode")` block (currently lines 6-88).
  - `meta.test.ts` — the `describe("meta")` block (currently lines 91-186).
  - `inherit-meta.test.ts` — the `describe("inheritMeta")` block (currently lines 188-410). While moving, fix the indentation regression on the tests currently at 2-space indent (lines 306-409) so the whole file sits at a consistent 4-space indent under its inner `describe`. Each of the three new files gets its own outer `describe("router")` wrapper and its own `beforeEach`.
- `active-crumbs.test.ts` → **delete**, split its two sibling describes into two files:
  - `active.test.ts` — the `describe("active")` block (7 tests).
  - `crumbs.test.ts` — the `describe("crumbs")` block (8 tests). Each gets its own outer `describe("router")` wrapper and its own `beforeEach`.

After the split, no file under `packages/router/tests/` contains more than one inner `describe`, and no file is named `features*` or `active-crumbs*`.

**Shared helpers.** Extend `packages/router/tests/helpers.ts` with two exports that replace repeated setup and assertion blocks across the files being moved.

Add `setupRouterEnv`:

```typescript
export const setupRouterEnv = (): {
  container: HTMLDivElement;
  render: (content: string) => void;
} => {
  resetTestState();
  const container = setupContainer();
  const render = renderInto(container);
  window.history.replaceState({}, "", "/");
  return { container, render };
};
```

This replaces the four-line block (`resetTestState(); container = setupContainer(); render = renderInto(container); window.history.replaceState({}, "", "/");`) currently duplicated across ten files. Each file's `beforeEach` becomes `const { container, render } = setupRouterEnv();`, assigning to describe-scoped `let` bindings. Files that patch `window.scrollTo` or `window.location` keep those patches in their own `beforeEach` after calling `setupRouterEnv()`. `hooks.test.ts` builds its logging `render` on top of the returned `container` (it ignores the plain `render` and constructs its own that also pushes to `log`).

Add `expectLoggedError`:

```typescript
export const expectLoggedError = (
  sup: { errors: [string, unknown][] },
  prefix: string,
  message?: string
): void => {
  expect(
    sup.errors.some(
      ([p, e]) =>
        p === prefix &&
        e instanceof Error &&
        (message === undefined || e.message === message)
    )
  ).toBe(true);
};
```

This replaces the `expect(sup.errors.some(([p, e]) => p === "..." && e instanceof Error)).toBe(true)` lambda currently repeated over thirteen times in `errors.test.ts`. Call sites become `expectLoggedError(sup, "[router] Global before:");` and, where a message is asserted, `expectLoggedError(sup, "[router] hook:", "Before error");`.

`helpers.ts` uses the globals `resetTestState`, `setupContainer` directly (no imports — they are preloaded, per `guides/tests.md`). The existing `renderInto` export stays.

No public API change — this task touches tests only; nothing re-exported by `packages/router/lib/index.ts` changes.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] `bun coverage router` line coverage is `>= 99.81%` (the pre-task baseline) and function coverage stays `100.00%`
- [ ] No anti-pattern from `guides/tests.md` in any changed file: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every moved test still asserts a behavior the source actually exposes — cross-checked against `packages/router/lib/`
- [ ] Running `rg -l "describe\(" packages/router/tests/ | xargs -I{} rg -c "^\s*describe\(" {}` shows at most one inner `describe` per file (the outer `describe("router")` wrapper plus at most one inner)
- [ ] No file under `packages/router/tests/` matches `features*.test.ts` or `active-crumbs*.test.ts`
- [ ] `packages/router/tests/features.test.ts` no longer exists
- [ ] `packages/router/tests/active-crumbs.test.ts` no longer exists
- [ ] `packages/router/tests/helpers.ts` exports `setupRouterEnv` and `expectLoggedError`
- [ ] Running `rg "resetTestState\(\);\s*container = setupContainer\(\)" packages/router/tests/` returns no matches (the repeated four-line setup is gone)
- [ ] Running `rg "sup\.errors\.some\(\(\[p" packages/router/tests/` returns no matches (the repeated error-assertion lambda is gone)
- [ ] `packages/router/tests/scroll.test.ts`, `navigate-options.test.ts`, `hash-mode.test.ts`, `meta.test.ts`, `inherit-meta.test.ts`, `active.test.ts`, `crumbs.test.ts` all exist
