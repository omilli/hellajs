# [ ] ssr-extraction

## Contract

### Surface change
yes — adds `extractCSS()` and the `ExtractedCSS` type, both re-exported from `packages/css/lib/index.ts` (`extractCSS` as a value; `ExtractedCSS` flows out via the existing `export type * from "./types"`). Per `code.md` §`index.ts` Rules and §Package File Structure, a new re-exported symbol is a surface change.

### Package
css

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions, §Types, §JSDoc
- Public API delta ← `code.md` §`index.ts` Rules, §Types
- Behavioral scenarios ← `tests.md` §Files, §File-naming for tests, §Test Structure, §Scenario → test() derivation, §Shared State and Cleanup › `beforeEach` with `resetTestState()`
- Doc placement ← `docs.md` §File Locations & Naming, §Template Selection, §Function & Prefix Docs

### Files
- `packages/css/lib/extract.ts` — create — `extractCSS()` returning `{ css: getCssText(), vars: getVarsText() }`; imports both `@internal` accessors
- `packages/css/lib/css.ts` — modify — add `@internal getCssText(): string` over `cssRulesMap` (`Array.from(cssRulesMap.values()).join("")`); refactor the existing `syncTextContent` (`lib/css.ts:26-32`) to call `getCssText()` for the text value, leaving only the `hasDocument()` guard and DOM write in `syncTextContent` (gives `getCssText` two callsites — satisfies the no-single-callsite rule in `code.md` §Functions & Modules)
- `packages/css/lib/vars.ts` — modify — add `@internal getVarsText(): string` extracted from the text-building loop inside `syncTextContent` (`lib/vars.ts:219-243`; lines 220-238 build the text string); leave the `hasDocument()` guard and DOM write in `syncTextContent` (same two-callsite structure as `getCssText`)
- `packages/css/lib/types.d.ts` — modify — add `ExtractedCSS` interface `{ css: string; vars: string }`
- `packages/css/lib/index.ts` — modify — add `export { extractCSS } from "./extract"` (the `ExtractedCSS` type is carried by the existing `export type * from "./types"`)
- `packages/css/tests/extract.test.ts` — create — new test file (surface-named)
- `packages/css/docs/api/extractcss.mdx` — create — Function template
- `packages/css/docs/index.mdx` — modify — add `extractCSS` to the API bullet list
- `packages/css/AGENTS.md` — modify — exports table: add `extractCSS` (+ the `ExtractedCSS` type carried by `export type *`); regenerated `CLAUDE.md` + `.github/instructions/*` via `bun sync`

### Public API delta
```ts
// packages/css/lib/types.d.ts — addition
interface ExtractedCSS {
  css: string;
  vars: string;
}

// packages/css/lib/index.ts — addition (ExtractedCSS flows out via `export type * from "./types"`)
export { extractCSS } from "./extract";
```

```ts
import { css, cssVars, extractCSS } from "@hellajs/css";

css({ color: 'red' }, { name: 'btn' });
cssVars({ theme: { color: 'red' } });

const { css: cssText, vars } = extractCSS();
// cssText contains '.btn{color:red}'; vars contains '--theme-color'
// emit two <style> tags server-side, or combine as needed
```

### Behavioral scenarios
- `extractCSS()` on fresh state (after `cssReset()` + `cssVarsReset()`) returns `{ css: "", vars: "" }`
- after `css({ color: 'red' }, { name: 'btn' })`, `extractCSS().css` contains `.btn{color:red}` and `.vars` is empty
- after `cssVars({ theme: { color: 'red' } })`, `extractCSS().vars` contains `--theme-color` and `.css` is empty
- after both `css()` and `cssVars()`, `extractCSS()` returns both css and vars text
- under SSR (`globalThis.document = undefined`), `css()` + `cssVars()` still accumulate and `extractCSS()` returns the expected text
- after `css()` then `cssRemove()`, `extractCSS().css` no longer contains the removed rule

### Doc placement
- `packages/css/docs/api/extractcss.mdx` — Function template — `# extractCSS` + `## API` (`function extractCSS(): ExtractedCSS` with the interface) + `## Basic Usage` (self-contained SSR example) + `## Key Concepts` (`### SSR Integration`, `### Client-Side Debugging`) + `## Important Considerations` (`### No State Clearing`, `### Two-Element Architecture`)
- `packages/css/docs/index.mdx` — Index — API bullet list — add `extractCSS` linking `/reference/css/extractcss`

### Tests view
New `packages/css/tests/extract.test.ts`, one `test()` per the six Behavioral scenarios above, per `tests.md` §Files (surface-named: `extract.test.ts` matches `extract.ts`/`extractCSS`) and §Shared State and Cleanup (`beforeEach` runs `resetTestState()` + `cssReset()` + `cssVarsReset()` — the css module-level maps aren't cleared by `resetTestState` alone). The SSR scenario brackets `globalThis.document = undefined` (save in `beforeEach`, restore in `afterEach`) following the `ssr.test.ts` pattern and `tests.md` §Patched browser globals — no trailing restoration after assertions. Import from `@hellajs/css/bundle`.

### Docs view
Create `packages/css/docs/api/extractcss.mdx` (Function template) and add `extractCSS` to `packages/css/docs/index.mdx` API list, per Doc placement above, per `docs.md` §File Locations & Naming (`extractcss.mdx` = lowercase export, no separator) and §Function & Prefix Docs. This trio owns the full blast radius: the standalone page + the `packages/css/AGENTS.md` exports-table add (`extractCSS`), then `bun sync` to regenerate mirrors. No standalone website-wrapper page is in scope for this trio; no meta coordination plan is cited.

---

## [ ] Implement extractCSS (Code)
**Type:** Code
**Depends on:** None

### Strategy
`extractCSS()` reads the module-private state that already accumulates under SSR (where `hasDocument()` is false but the in-memory maps still update). Add two `@internal` accessors so the text-building logic has two callsites each: `getCssText()` in `lib/css.ts` returning `Array.from(cssRulesMap.values()).join("")` — refactor the existing `syncTextContent` (`lib/css.ts:26-32`) to call it, leaving only the `hasDocument()` guard and DOM write; and `getVarsText()` in `lib/vars.ts` extracted from the text-building loop inside `syncTextContent` (`lib/vars.ts:219-243`), same two-callsite structure. New `lib/extract.ts` imports both and returns `{ css: getCssText(), vars: getVarsText() }`. Key decisions: does NOT clear state (the caller resets via `cssReset()`/`cssVarsReset()`, allowing multiple extractions in a single pass); returns a structured object mirroring the two-element `hella-css`/`hella-vars` architecture so the caller emits two `<style>` tags or combines them; works under both SSR and client (useful for debugging/testing). Trade-off considered and rejected: a combined single-string return — would lose the two-element separation callers need.

### Definition of Done
- [ ] `bun coverage css` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified — `lib/extract.ts` created; `lib/css.ts`, `lib/vars.ts`, `lib/types.d.ts`, `lib/index.ts` modified
- [ ] Public API delta in Contract implemented verbatim — `lib/index.ts` re-exports `extractCSS`; `ExtractedCSS` present in `lib/types.d.ts`
- [ ] Every new/changed exported symbol has JSDoc (`@internal` on `getCssText`/`getVarsText` since they are not re-exported; `extractCSS` + `ExtractedCSS` documented as public)
- [ ] No new runtime dependency
- [ ] Backward compatible — no existing export signature changes
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `lib/extract.ts`, `lib/css.ts`, `lib/vars.ts`, `lib/types.d.ts`, `lib/index.ts` reports no deviations from `./guides/code.md`

## [ ] Test extractCSS (Tests)
**Type:** Tests
**Depends on:** Implement extractCSS

### Strategy
New `tests/extract.test.ts`, one `test()` per Behavioral scenario, imported from `@hellajs/css/bundle`. `beforeEach` runs `resetTestState()` + `cssReset()` + `cssVarsReset()`. The SSR scenario captures the original `document` in `beforeEach`, reassigns `globalThis.document = undefined`, restores in `afterEach` — never a trailing restoration after assertions (per `tests.md` §Patched browser globals). Assert `result.css`/`result.vars` substrings: the css-side mirror is no-space format (`.btn{color:red}`), the vars-side mirror is space format (`--k: v;`). The removal scenario calls `css()` then `cssRemove()` and asserts the rule is gone from `result.css`.

### Definition of Done
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`lib/extract.ts` + the new accessors in `lib/css.ts` and `lib/vars.ts`)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (six)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against the implementation

## [ ] Document extractCSS (Docs)
**Type:** Docs
**Depends on:** Implement extractCSS

### Strategy
Create `docs/api/extractcss.mdx` (Function template) — file name lowercase, no separator, matching `cssvars.mdx`/`cssvarsremove.mdx`. Title `# extractCSS`; one-line description ("Returns the accumulated CSS rules and CSS variable declarations as a structured object for server-side rendering."); `## API` shows `function extractCSS(): ExtractedCSS` with the interface; `## Basic Usage` carries the self-contained SSR example seeded by Contract.Public API delta (call `css()`/`cssVars()` server-side, `extractCSS()`, emit two `<style>` tags); `## Key Concepts` covers `### SSR Integration` (per-request isolation via `cssReset()` + `cssVarsReset()`) and `### Client-Side Debugging`; `## Important Considerations` covers `### No State Clearing` and `### Two-Element Architecture`. Add `extractCSS` to `docs/index.mdx` API list linking `/reference/css/extractcss`.

### Definition of Done
- [ ] Every code example in the changed `.mdx` files compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` was used
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in the doc; the usage example from Contract appears under `## Basic Usage`
- [ ] Package docs (`packages/css/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (`extractcss.mdx` for `extractCSS`, lowercase no separator)
