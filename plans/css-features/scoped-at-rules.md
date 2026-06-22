## [ ] Compose scope into conditional at-rules under named css()

### Depends On
None

### Objective
When `css()` is called with a `name` option and contains conditional at-rules (`@media`, `@container`, `@supports`, `@starting-style`), the at-rule content inherits the parent scope — direct properties wrap in `.{name}{}` and nested selectors compose as descendants — instead of the current behavior where content is processed with an empty selector producing broken CSS.

### Sub-tasks

#### [ ] Fix process() at-rule composition (Code)
**Solution:**
Modify the at-rule branch in `process()` in `lib/css.ts` (currently lines 159-161). The current code unconditionally processes ALL at-rule content with `selector=""` and `isGlobal=true`:

```typescript
if (key.startsWith("@")) {
  const nestedCss = process(value as CSSObject, "", true);
  rules.push(`${key}{${nestedCss}}`);
}
```

Split into two paths based on whether the at-rule is conditional or definitional:

- **Conditional at-rules** (`@media`, `@container`, `@supports`, `@starting-style`) — these wrap style declarations that should inherit the parent scope. When a scope is active (`!isGlobal`), process content with the parent `selector` and `isGlobal` flag instead of empty string. When global (no `name`), behavior is unchanged (empty selector, global).
- **Definitional at-rules** (`@keyframes`, `@font-face`, `@layer`, `@import`, `@namespace`, etc.) — these define top-level constructs that should never inherit a class scope. Keep the current behavior (empty selector, global).

Define a `CONDITIONAL_AT_RULES` set of prefixes (UPPER_SNAKE_CASE constant per `./guides/code.md`). Check `key.startsWith(prefix)` for each. Place the set at module scope near the existing `AMP_REGEX` and `CAMEL_REGEX` constants.

After the fix, the expected output for:
```typescript
css({
  color: 'red',
  '@media (max-width: 768px)': {
    fontSize: '12px',
    '.child': { color: 'blue' }
  }
}, { name: 'btn' });
```
Is:
```
.btn{color:red}@media (max-width: 768px){.btn{font-size:12px}.btn .child{color:blue}}
```

Not the current broken output:
```
.btn{color:red}@media (max-width: 768px){{font-size:12px}.child{color:blue}}
```

This is a backward-compatible fix: the current output for scoped conditional at-rules is malformed CSS that browsers ignore. The fix makes the styles actually apply. Ship as a patch changeset.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible (the previous output was broken CSS; this fix makes it work), OR a changeset exists at `.changeset/*.md` describing the change
- [ ] Audit skill run on `lib/css.ts` reports no deviations from `./guides/code.md`

#### [ ] Scoped at-rule composition tests (Tests)
**Solution:**
Update `tests/css.test.ts` and add new test cases:

- Update the existing `"complex nested styles with name"` test (line 24) — add assertions verifying that `@media` content IS scoped under `.btn`: `expect(content).toContain('.btn{font-size:12px}')`. The existing `toContain` assertions still pass with the new output.
- Add test: `"scoped @media wraps direct properties under class selector"` — `css({ '@media (...)': { fontSize: '12px' } }, { name: 'btn' })` produces content containing `.btn{font-size:12px}` inside the `@media` block, and does NOT contain `{{font-size`.
- Add test: `"scoped @media composes descendant selectors"` — `css({ '@media (...)': { '.child': { color: 'blue' } } }, { name: 'btn' })` produces content containing `.btn .child{color:blue}` inside the `@media` block.
- Add test: `"scoped @media composes & selector"` — `css({ '@media (...)': { '&:hover': { color: 'red' } } }, { name: 'btn' })` produces content containing `.btn:hover{color:red}` inside the `@media` block.
- Add test: `"scoped @container inherits scope"` — same pattern with `@container`.
- Add test: `"scoped @supports inherits scope"` — same pattern with `@supports`.
- Add test: `"@keyframes stays global even with name option"` — `css({ '@keyframes spin': { from: { transform: 'rotate(0deg)' } } }, { name: 'btn' })` produces `@keyframes spin{from{transform:rotate(0deg)}}` without `.btn` wrapping.
- Add test: `"@font-face stays global even with name option"` — same pattern with `@font-face`.
- Add test: `"@layer stays global even with name option"` — same pattern with `@layer`.
- Add test: `"global @media (no name) is unaffected"` — `css({ '@media (...)': { fontSize: '12px' }, '.card': { padding: '1rem' } })` produces `@media (...){{...}}` with `.card` as a global selector inside the media block (current behavior preserved for global calls).

Follow existing test conventions: `resetTestState()` + `cssReset()` + `cssVarsReset()` in `beforeEach`, import from `@hellajs/css/bundle`, assert via `document.getElementById('hella-css')?.textContent`.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines in `lib/css.ts` (the new conditional at-rule branch and the `CONDITIONAL_AT_RULES` constant)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Document scoped conditional at-rules in css.mdx (Docs)
**Solution:**
The fix changes observable output: scoped conditional at-rules (`@media`, `@container`, `@supports`, `@starting-style`) now inherit the parent `.{name}` scope instead of producing broken CSS. `docs/api/css.mdx` must reflect this.

Audit `docs/api/css.mdx` for any existing `@media`/`@container`/`@supports` examples:
- If an example shows a scoped call with a conditional at-rule and either omits the output or shows the old broken form, update it to show the corrected output.
- If no such example exists, add one under `## Key Concepts` as `### Conditional at-rules inherit scope` — a self-contained `css(..., { name: 'btn' })` call with an `@media` block containing a direct property and a nested selector, with a comment showing the expected scoped output.

Add a brief note under `## Important Considerations` as `### Definitional at-rules stay global` — `@keyframes`, `@font-face`, `@layer`, `@import` do NOT inherit the scope even when `name` is provided; they define top-level constructs.

Follow `./guides/docs.md`: 5-30 line code blocks, `typescript` language tag for pure API code, comments explain output expectations (`// .btn{font-size:12px} inside @media`), no test assertions.

**Definition of Done:**
- [ ] Every code example in the changed file compiles against the current source signatures and reflects actual output
- [ ] The Function Doc template from `./guides/docs.md` was followed (no new top-level sections invented — additions are `###` sub-headings under existing `##` sections)
- [ ] Package docs (`packages/css/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed doc contradicts the implementation — cross-checked against `lib/css.ts` and the new tests
- [ ] File name unchanged (`css.mdx` for the `css` export)
