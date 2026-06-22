## [ ] Add SSR critical-CSS extraction

### Depends On
None

### Objective
`extractCSS()` returns the accumulated CSS rules and CSS variable declarations as a structured `{ css: string, vars: string }` object for embedding in server-rendered HTML, closing the SSR extraction gap identified in `css-comparison.md`.

### Sub-tasks

#### [ ] extractCSS public function (Code)
**Solution:**
Add `extractCSS()` to a new `lib/extract.ts` file. The function reads from the module-private state that already accumulates under SSR (where `hasDocument()` is false but in-memory maps still update):

- `cssRulesMap` in `lib/css.ts` holds per-key CSS text. Export an `@internal` `getCssText(): string` accessor that returns `Array.from(cssRulesMap.values()).join("")`. Refactor the existing `syncTextContent` in `lib/css.ts:26-32` to call `getCssText()` for the text value, leaving only the `hasDocument()` guard and DOM write in `syncTextContent`. This gives `getCssText` two callsites (`syncTextContent` + `extractCSS`) satisfying the no-single-callsite rule in `./guides/code.md`.
- `scopedVarsRulesMap` in `lib/vars.ts` holds per-scope variable maps. Export an `@internal` `getVarsText(): string` accessor extracted from the text-building loop inside `syncTextContent` in `lib/vars.ts:219-243` (lines 220-238 build the text string; extract that into the accessor, leave the `hasDocument()` guard and DOM write in `syncTextContent`). Same two-callsite structure as `getCssText`.
- `lib/extract.ts` imports both accessors and returns `{ css: getCssText(), vars: getVarsText() }`.

Add an `ExtractedCSS` interface to `lib/types.d.ts`:
```typescript
interface ExtractedCSS {
  css: string;
  vars: string;
}
```

Export `extractCSS` and `ExtractedCSS` from `lib/index.ts`.

Key decisions:
- Does NOT clear state — the caller decides when to reset via `cssReset()` / `cssVarsReset()`. This allows multiple extraction calls in a single pass (e.g., per-request isolation handled by the caller via reset between requests).
- Returns a structured object, not a combined string — mirrors the two-element architecture (`hella-css` + `hella-vars`) so the caller can emit two `<style>` tags or combine them as needed.
- Works under both SSR (no document) and client (with document) — useful for debugging and testing.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — no existing export signature changes
- [ ] Audit skill run on `lib/extract.ts`, `lib/css.ts`, `lib/vars.ts`, `lib/types.d.ts`, `lib/index.ts` reports no deviations from `./guides/code.md`

#### [ ] extractCSS tests (Tests)
**Solution:**
Add `tests/extract.test.ts`. Cover:

- `extractCSS()` returns empty `{ css: "", vars: "" }` on a fresh state (after `cssReset()` + `cssVarsReset()`).
- `extractCSS()` returns the expected CSS text after `css({ color: 'red' }, { name: 'btn' })` — `result.css` contains `.btn{color:red}`, `result.vars` is empty.
- `extractCSS()` returns the expected vars text after `cssVars({ theme: { color: 'red' } })` — `result.vars` contains `--theme-color`, `result.css` is empty.
- `extractCSS()` returns both css and vars when both `css()` and `cssVars()` have been called.
- `extractCSS()` works under SSR — capture the original `document` reference in `beforeEach`, reassign `globalThis.document = undefined` (following the pattern in `tests/ssr.test.ts`), call `css()` + `cssVars()`, verify `extractCSS()` returns the expected text, and restore the original in `afterEach`. A trailing restoration after assertions is prohibited per `./guides/tests.md` — save/restore must bracket the test so a failing assertion cannot leak the mock.
- `extractCSS()` reflects updates — call `css()` then `cssRemove()`, verify `result.css` no longer contains the removed rule.

Import from `@hellajs/css/bundle`. Use `resetTestState()` + `cssReset()` + `cssVarsReset()` in `beforeEach`.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines in `lib/extract.ts` and the new accessors in `lib/css.ts` and `lib/vars.ts`
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] extractCSS API documentation (Docs)
**Solution:**
Add `docs/api/extractcss.mdx` following the Function Doc template from `./guides/docs.md`. The file name is `extractcss.mdx` (lowercase the export name with no separator), matching the existing convention (`cssvars.mdx` for `cssVars`, `cssvarsremove.mdx` for `cssVarsRemove`).

Sections:
- `# extractCSS` — title matches export name exactly.
- One-line description: "Returns the accumulated CSS rules and CSS variable declarations as a structured object for server-side rendering."
- `## API` — TypeScript signature: `function extractCSS(): ExtractedCSS` with the `ExtractedCSS` interface shown.
- `## Basic Usage` — self-contained SSR example: call `css()` and `cssVars()` server-side, then `extractCSS()` to get the text, embed in HTML as `<style>` tags.
- `## Key Concepts` — `### SSR Integration` (how to use with server frameworks, per-request isolation via `cssReset()` + `cssVarsReset()`), `### Client-Side Debugging` (useful for inspecting accumulated styles in development).
- `## Important Considerations` — `### No State Clearing` (extraction does not reset; caller controls lifecycle), `### Two-Element Architecture` (structured return mirrors `hella-css` + `hella-vars` separation).

Update `docs/index.mdx` — add `extractCSS` to the API bullet list with link `/reference/css/extractcss` (matching the doc file name).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` was used
- [ ] Package docs (`packages/css/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (`extractcss.mdx` for `extractCSS`, lowercase no separator)
