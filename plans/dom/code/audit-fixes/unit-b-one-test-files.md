# [ ] Unit B: Fix one-test files

## Type tag

Tests.

## Surface fork

No. Internal test files only.

## Files

### `packages/dom/tests/mount-validation.test.ts`
- Has 1 test (`"throws for selector that does not match any element"`).
- Add ≥1 more test covering a different aspect of mount validation. Candidates: null target, undefined target, non-string non-Element target (type-based validation from source).

### `packages/dom/tests/mount-binding.test.ts`
- Has 1 test (`"value set via direct property with falsy fallback"`).
- Add ≥1 more test covering a different bind:value behavior. Candidates: signal `0` renders `"0"`, boolean attribute binding, checked binding, multiple `bind:` attributes on one element.

### `packages/dom/tests/mount-targets.test.ts`
- Has 1 test that covers 3 independent behaviors (selector mount, Element mount, default `#app` target) separated by `resetTestState()` calls.
- Split into 3 tests, one per target type.
- Blast radius: the file will have 3+ tests after the split.

## Definitions of Done

- [ ] `mount-validation.test.ts` has ≥2 tests
- [ ] `mount-binding.test.ts` has ≥2 tests
- [ ] `mount-targets.test.ts` tests are split into one behavior per test
- [ ] `mount-targets.test.ts` has ≥2 tests
- [ ] All new tests use `mock()` where applicable, no boolean flags or integer counters
- [ ] `bun coverage dom` is still green; coverage is not lower than baseline

## Strategy

Each file gets a small, focused addition. For `mount-validation`: the source throws `[dom] mount: target ... not found in document` for missing targets — also test that a non-existent selector throws but a valid selector works. For `mount-binding`: add a test verifying `bind:checked` on an input, or `bind:class` with a signal. For `mount-targets`: mechanically split the single test into three — the first test stays as-is, the second and third each become their own `test()` with their own local `resetTestState()` (the original already calls it inline). All three files already follow the import-order convention and need no import changes.
