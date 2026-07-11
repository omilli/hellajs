# [x] Unit 1 — extract `suppressWarn` + make it leak-safe

## Scope

- **Gap (A1):** `suppressWarn()` is defined verbatim in two test files — `packages/dom/tests/hydrate.test.ts:7` and `packages/dom/tests/hydrate-foreach.test.ts:7`. `guides/tests.md` Anti-Patterns: "Never repeat a helper across files — extract."
- **Gap (A2):** Both copies patch `console.warn` and are used as `const c = suppressWarn(); …; c.restore();` with no `try/finally`. `guides/tests.md` §Patched browser globals: a failing assertion before `restore()` leaks the stub into later files ("A trailing restoration assignment is unacceptable").
- **Surface: no** — test-only helper; no public export changes.
- **Type:** Tests.

## [x] Code

**Files:** `packages/dom/tests/helpers.ts` (add), `packages/dom/tests/hydrate.test.ts` (delete local + re-import), `packages/dom/tests/hydrate-foreach.test.ts` (delete local + re-import).

**Delta — `helpers.ts`** (new export alongside existing `serverContainer`/`fallbackHandler`):

```typescript
/**
 * Suppresses `console.warn` for the duration of `fn`, restoring it afterward —
 * even if `fn` throws. Captured warnings are returned for assertion. Use this
 * instead of a bare save/restore pair so a failing assertion cannot leak the stub.
 */
export const suppressWarn = <T>(fn: (): T): { result: T; warnings: unknown[][] } => {
  const orig = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    const result = fn();
    return { result, warnings };
  } finally {
    console.warn = orig;
  }
};
```

The callback shape (`suppressWarn(() => { … })`) makes leak-safety structural — the `finally` always runs. Existing call sites change from:

```typescript
const captured = suppressWarn();
hydrate(html`<${App} />`, container);
captured.restore();
expect(captured.warnings.length).toBeGreaterThan(0);
```

to:

```typescript
const { warnings } = suppressWarn(() => {
  hydrate(html`<${App} />`, container);
});
expect(warnings.length).toBeGreaterThan(0);
```

**Strategy:** the callback form is chosen over save/restore-in-`beforeEach`+`afterEach` because the suppression is scoped to one assertion block, not the whole test — `beforeEach`/`afterEach` would suppress across unrelated tests. The existing `helpers.ts` already co-locates cross-file helpers (`serverContainer`, `fallbackHandler`), so this matches the established pattern.

**DoD:**

- [x] `suppressWarn` exported from `packages/dom/tests/helpers.ts` with the leak-safe callback shape (try/finally restore). — `helpers.ts:16` `export const suppressWarn = <T>(fn: () => T): { result: T; warnings: unknown[][] } =>` with `try { … } finally { console.warn = orig; }`.
- [x] Both local `function suppressWarn()` definitions deleted (`hydrate.test.ts:7`, `hydrate-foreach.test.ts:7`). — `rg 'function suppressWarn' packages/dom/tests` → NONE.
- [x] Both files import `suppressWarn` from `./helpers` in the existing local-helpers import line (order unchanged: after `@hellajs/dom/bundle`). — `hydrate.test.ts:5`, `hydrate-foreach.test.ts:5`.
- [x] All 3 current call sites converted to the callback form (`hydrate.test.ts` ×2, `hydrate-foreach.test.ts` ×1). — `hydrate.test.ts:199` (no-destructure), `:223` (`const { warnings }`), `hydrate-foreach.test.ts:70`.

## [x] Tests

No new tests — this IS the test-hygiene change. The 3 converted call sites are the verification: each must still capture warnings and assert on them after the refactor.

**DoD:**

- [x] "warns and subtree-replaces on a tag mismatch" still asserts `warnings.length > 0` after the call-site refactor. — `hydrate.test.ts:226` `expect(warnings.length).toBeGreaterThan(0)`.
- [x] "warns and re-mounts when a server element is missing" still passes. — `bun coverage dom` 301/0.
- [x] "falls back to re-mount on a ForEach count-mismatch" still passes. — `bun coverage dom` 301/0.

## Blast radius

- `helpers.ts` is imported by hydrate test files only (verify with `rg 'from "./helpers"' packages/dom/tests`); adding an export is additive, no existing call site changes.
- No source `lib/` change; no public surface change; no AGENTS.md change.

## Verification

- [x] `bun coverage dom` green — 301 pass / 0 fail (baseline preserved). — EXIT 0; 99.42/99.41% (== baseline).
- [x] `rg 'function suppressWarn' packages/dom/tests` returns nothing (no local copies remain). — verified.
