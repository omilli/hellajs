---
depends_on: []
---
# @hellajs/css — platform-dependent return + remove `<style>` transform

## Goal

Redesign css/cssVars to return **text on the server** (no `hasDocument()`) and their **current structured value on the client** (`hasDocument()`). Stateless on the server — no module-level accumulation, no drain, no leak. Client-side reactivity (cssVars effects, CSSOM injection, dedup, refCounting) fully preserved. Internal css-side state simplified from 4 maps to 1 (`injectedMap`). Remove the babel plugin's `<style>` transform — users call `css()` directly.

**One atomic unit.** The return-type change and the `<style>` transform removal share a blast radius: users who used `<style>` tags migrate to explicit `css()` calls AND adapt to the new return type. Ship together or not at all.

## Surface fork: YES (breaking)

- `css(obj, opts)`: returns `string` — name on client, CSS text on server. **Breaking.**
- `cssVars(vars, opts)`: returns proxy on client, CSS text on server. **Breaking.**
- `removeCss(obj, opts)` / `removeCssVars(vars, opts)`: API unchanged (takes same args, re-derives text internally). Client-only.
- `resetCss()` / `resetCssVars()`: simplified, `void`. No enrichment.
- babel plugin `<style>` → `css()` transform: **removed.** JSX `<style>` becomes a regular element.
- `ensureCssImport`: **removed** (dead code after transform removal).

## Architecture decisions

- **Platform-dependent return is the text-retrieval channel.** css()/cssVars() return text on the server. No module-level accumulation needed — the text comes directly from the return value. No drain, no collectCss, no enrichment, no emitter. The simplest possible path.
- **Authoring model: separated CSS.** CSS is defined in shared modules or at the handler/entry level, not inline in component templates. Components hardcode class names (`class="btn"` — the name the user provided to css()). This is the trade-off the user explicitly accepted: "more than happy to lose the inline css() call in the html for server."
- **Internal state: 1 map replaces 4.** Client-side css state simplifies from `refCounts` + `inlineCache` + `cssRulesMap` + `ruleCounts` to a single `injectedMap: Map<text, { index, count }>`. Text is the identity (deterministic — same object → same text). Dedup via `injectedMap.has(text)`. refCounting via `entry.count`. Server has zero state (all mutations guarded by `hasDocument()`).
- **cssVars client state: untouched.** The vars-side state (`scopedVarsRulesMap`, `cache`, registries, effects) stays as-is for the client — it's correct and optimized for the reactive path. Only the server path changes: guard all state mutations behind `hasDocument()`, return text.
- **`<style>` transform removal.** The transform (`plugins/babel/src/transformers/style.mjs`) converts `<style>{obj}</style>` JSX into `css(obj)` calls. Under platform-dependent return, this transform's assumption (css() returns a name usable as a class) breaks on the server. Rather than making the transform platform-aware, remove it entirely — users call css() explicitly. This also makes JSX and `html\`\`` handle `<style>` consistently (both as regular elements).

## Files

### css package

| File | Change |
|---|---|
| `packages/css/lib/css.ts` | Platform-dependent return: `if (hasDocument()) { inject + return name } return text`. Internal dedup via `injectedMap.has(text)` instead of `inlineCache.has(key)`. refCounting via `injectedMap.get(text).count` instead of `refCounts.get(key)`. |
| `packages/css/lib/cssVars.ts` | Platform-dependent return: `if (hasDocument()) { existing client path (applyRules, buildResult, effects) } return buildVarsText(flat, opts)`. `buildVarsText` is extracted from the existing `applyRules` text-generation logic. |
| `packages/css/lib/removeCss.ts` | Re-derive text from `(obj, opts)` via `process()`, look up in `injectedMap`, decrement count, remove at zero. No-op when `!hasDocument()`. Same API signature. |
| `packages/css/lib/removeCssVars.ts` | Same pattern: re-derive text, remove from vars state. Client-only. |
| `packages/css/lib/resetCss.ts` | Clear `injectedMap` + CSSOM. `void` return (no enrichment — text comes from css()'s return). Guard behind `hasDocument()`. |
| `packages/css/lib/resetCssVars.ts` | Clear vars state. `void` return. Guard behind `hasDocument()`. |
| `packages/css/lib/internal/cssStore.ts` | **Replace** `refCounts`, `inlineCache`, `cssRulesMap`, `ruleCounts` with `injectedMap: Map<string, { index: number; count: number }>`. Remove `cacheKey()` (no longer needed — text is the key). Replace `syncTextContent()` with `injectedMap`-based mirror (`Array.from(injectedMap.keys()).join("")`). |
| `packages/css/lib/internal/varsStore.ts` | Guard all state mutations behind `hasDocument()`. Add `buildVarsText(flat, opts): string` (extracted text-generation, used for server return). `applyRules` stays for client path. |
| `packages/css/lib/types.d.ts` | Update return types. Add `InjectedListEntry = { index: number; count: number }`. |

### babel plugin

| File | Change |
|---|---|
| `plugins/babel/src/transformers/style.mjs` | **Delete.** |
| `plugins/babel/src/transformers/jsx.mjs` | Remove the style short-circuit (step 1 in the visitor pipeline: `if (opening.name is 'style') → handleStyleTag`). `<style>` now falls through to normal element handling. |
| `plugins/babel/src/utils/imports.mjs` | Remove `ensureCssImport` (dead code). |
| `plugins/babel/AGENTS.md` | Remove all `<style>` transform documentation. Remove `style.mjs` from the file table. Remove `ensureCssImport` from the import-injection table. Update visitor pipeline (remove step 1 style short-circuit). Update non-obvious behaviors (remove `<style> always wins` bullet). |

### Tests

| File | Change |
|---|---|
| `packages/css/tests/css.test.ts` | Client-path assertions unchanged (returns name under HappyDOM). Add server-path tests (unset `globalThis.document`, assert text return). |
| `packages/css/tests/css-at-rules.test.ts` | Same: client assertions unchanged, add server-path coverage. |
| `packages/css/tests/cssvars.test.ts` | Client-path assertions unchanged. Add server-path tests (unset document, assert text return for static + reactive vars). |
| `packages/css/tests/cssvars-scoped.test.ts` | Same pattern. |
| `packages/css/tests/cssvars-flatten.test.ts` | Unchanged (tests internal flatten logic, not return type). |
| `packages/css/tests/cssvars-types.test.ts` | Update: server-path type is `string`, client-path type is `CSSVars<T>`. |
| `packages/css/tests/cssvars-remove.test.ts` | Update: removeCss re-derives text internally (same API). Add server-path no-op test. |
| `packages/css/tests/ssr.test.ts` | Rename or repurpose: no longer tests "ssr-safe" accumulation drain. Tests platform-dependent return (text on server, name on client). |
| `plugins/babel/tests/transform.test.ts` | Remove all `<style>` transform test cases. `<style>` now produces a regular HellaNode (tag: "style"). |

### Docs

| File | Change |
|---|---|
| `packages/css/docs/api/css.mdx` | Document platform-dependent return. Add `## Server-Side Rendering` section showing the text return + the separated-CSS authoring pattern. |
| `packages/css/docs/api/cssvars.mdx` | Same: document platform-dependent return. |
| `packages/css/docs/api/removecss.mdx` | Note: re-derives text internally; client-only; no-op on server. |
| `packages/css/docs/api/resetcss.mdx` | Simplified: clears client state; void return. |
| `packages/css/docs/concepts/*.mdx` | Update authoring patterns: separated CSS (shared modules, hardcoded class names). |
| `packages/css/docs/index.mdx` | Update examples for the new authoring model. |
| `packages/css/css-comparison.md` | Update API description (platform-dependent return). |

### Agent instructions

| File | Change |
|---|---|
| `packages/css/AGENTS.md` | Major update: platform-dependent return, injectedMap replaces 4 maps, server stateless, authoring model change. |
| `plugins/babel/AGENTS.md` | Remove `<style>` transform docs (per file table above). |
| Root `AGENTS.md` | Note the css breaking change in the css package description. |

## Delta

```ts
// packages/css/lib/css.ts (platform-dependent return)
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  if (!isPlainObject(obj)) throw new Error(`[css] css: expected a CSS object, received ${String(obj)}`);
  const { name } = options;
  const selector = name ? `.${name}` : "";
  const isGlobal = !name;
  const cssText = process(obj, selector, isGlobal);

  if (hasDocument()) {
    // CLIENT: inject + dedup via injectedMap
    const existing = injectedMap.get(cssText);
    if (existing) {
      existing.count++;
    } else {
      const rules = splitRules(cssText);
      let i = 0;
      while (i < rules.length) { upsertRule(STYLE_ID, `${cssText}:${i}`, rules[i]!); i++; }
      injectedMap.set(cssText, { index: -1, count: 1 });  // index unused (upsertRule tracks via indexMap)
    }
    syncTextContent();
    return name || "";
  }

  return cssText;  // SERVER: pure text, no state
}
```

```ts
// packages/css/lib/cssVars.ts (platform-dependent return — sketch)
export function cssVars<T extends CSSVarInputObject>(vars: T, options: CSSVarsOptions = {}): string | CSSVars<T> {
  if (!isPlainObject(vars)) throw new Error(`[css] cssVars: expected a plain object, received ${String(vars)}`);
  const { flat, hasFns } = flattenVars(vars);

  if (!hasDocument()) {
    // SERVER: return text, no state
    return buildVarsText(flat, options);
  }

  // CLIENT: existing path unchanged (static cache, reactive effects, proxy return)
  // ... (all existing client logic stays as-is)
}
```

```ts
// packages/css/lib/internal/cssStore.ts (simplified — 4 maps → 1)
export const STYLE_ID = "hella-css";
export const injectedMap = new Map<string, { index: number; count: number }>();

export function syncTextContent(): void {
  if (!hasDocument()) return;
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) el.textContent = Array.from(injectedMap.keys()).join("");
}
// DELETED: refCounts, inlineCache, cssRulesMap, ruleCounts, cacheKey
```

```ts
// packages/css/lib/removeCss.ts (re-derive text, client-only)
export function removeCss(obj: CSSObject, options: CSSOptions = {}): void {
  if (!isPlainObject(obj)) throw new Error(`[css] removeCss: expected a CSS object, received ${String(obj)}`);
  if (!hasDocument()) return;
  const cssText = process(obj, options.name ? `.${options.name}` : "", !options.name);
  const entry = injectedMap.get(cssText);
  if (!entry) return;
  entry.count--;
  if (entry.count <= 0) {
    // remove from CSSOM via indexMap (existing sheet.ts mechanism)
    injectedMap.delete(cssText);
    syncTextContent();
  }
}
```

```ts
// plugins/babel/src/transformers/jsx.mjs — REMOVE the style short-circuit
// Before (step 1):
//   if (opening.name is 'style') { handleStyleTag(...); return; }
// After: deleted. <style> falls through to normal element handling.
```

Runnable usage — **client (component hardcodes class name):**
```ts
import { css } from "@hellajs/css";
// Called at module level or in a shared styles module
css({ color: "red" }, { name: "btn" });  // returns "btn", injects into CSSOM
// Component uses hardcoded class name
html`<button class="btn">Click</button>`
```

Runnable usage — **server (handler captures text):**
```ts
import { css } from "@hellajs/css";
import { ssr } from "@hellajs/ssr";

const btnCss = css({ color: "red" }, { name: "btn" });  // returns ".btn{color:red}"
const body = ssr(html`<button class="btn">Click</button>`);
const page = `<!DOCTYPE html><html><head><style>${btnCss}</style></head>
<body><div id="app">${body}</div></body></html>`;
```

Runnable usage — **shared styles module (works on both platforms):**
```ts
// styles.ts
import { css } from "@hellajs/css";
export const btnStyle = css({ color: "red" }, { name: "btn" });
// Server: btnStyle = ".btn{color:red}"
// Client: btnStyle = "btn" (+ auto-injected into CSSOM)
```

## Behavioral scenarios (tests)

### css.test.ts — platform-dependent return

- `test("returns class name on client (hasDocument)", () => { ... css({color:"red"},{name:"x"}) === "x" })`
- `test("returns CSS text on server (no document)", () => { ... unset document; css({color:"red"},{name:"x"}) === ".x{color:red}" })`
- `test("returns empty string for global on client", () => { ... css({body:{margin:0}}) === "" })`
- `test("returns global CSS text on server", () => { ... unset document; css({body:{margin:0}}) === "body{margin:0}" })`
- `test("deduplicates by text on client", () => { ... css(obj,opts) twice; injectedMap has 1 entry, count: 2 })`
- `test("does not accumulate state on server", () => { ... unset document; css(obj); css(obj); injectedMap.size === 0 })`

### cssvars.test.ts — platform-dependent return

- `test("returns proxy on client", () => { ... cssVars({theme:{color:"red"}}).theme.color === "var(--theme-color)" })`
- `test("returns vars text on server", () => { ... unset document; cssVars({theme:{color:"red"}}) === ":root{--theme-color:red}" })`
- `test("reactive vars return initial-value text on server", () => { ... unset document; cssVars({x:signal("red")}) contains "red" })`
- `test("does not accumulate vars state on server", () => { ... unset document; cssVars(vars); scopedVarsRulesMap.size === 0 })`

### removeCss — text re-derivation

- `test("removeCss decrements count on client", () => { ... css twice; removeCss once; injectedMap entry count: 1 })`
- `test("removeCss removes at zero on client", () => { ... css once; removeCss; injectedMap empty })`
- `test("removeCss is no-op on server", () => { ... unset document; removeCss(obj); no throw })`

### babel transform.test.ts — `<style>` removal

- `test("<style> produces regular HellaNode", () => { ... transformJSX('<style>.x{color:red}</style>'); output contains { tag: "style" } })`
- `test("<style> does not inject css import", () => { ... transformJSX('<style>...</style>'); imports from "@hellajs/css" absent })`
- Remove all existing `<style>` → `css()` transform tests.

## Doc updates

Per `guides/docs.md`. The key change: document the separated-CSS authoring model and platform-dependent return.

| File | Change |
|---|---|
| `packages/css/docs/api/css.mdx` | `## API`: `function css(obj: CSSObject, opts?: CSSOptions): string` — note: returns name on client, CSS text on server. `## Key Concepts` → `### Platform-Dependent Return`, `### Separated CSS Authoring` (CSS in shared modules, hardcoded class names). `## Important Considerations` → `### Server return is text, not name` (don't use css() return for class binding in isomorphic code). |
| `packages/css/docs/api/cssvars.mdx` | Same pattern: document text return on server, proxy on client. |
| `packages/css/docs/api/removecss.mdx` | Note: re-derives text internally; client-only; no-op on server. |
| `packages/css/docs/api/resetcss.mdx` | Simplified: clears `injectedMap`; void return. |

## Strategy

**Text is the identity.** Under platform-dependent return, the CSS text generated by `process()` is the universal key. On the client, `injectedMap` uses text for dedup + refCounting. On the server, text IS the return value. `removeCss` re-derives text from the same `(obj, opts)` args — deterministic, same object always produces same text. No cache keys, no hashes.

**State simplification cascades from the text-is-identity decision.** `refCounts` (key → count) → `injectedMap[text].count`. `inlineCache` (key → name) → `injectedMap.has(text)` (dedup). `cssRulesMap` (key → cssText) → `injectedMap.keys()` (textContent mirror source). `ruleCounts` (key → rule count) → replaced by `splitRules(cssText).length` inline. `cacheKey()` → deleted (text IS the key). Four maps, one hash function, one cache — all replaced by one `Map<string, {index, count}>`.

**cssVars server path is additive, not reductive.** The client path (static cache, reactive effects, proxy, scopedVarsRulesMap) stays untouched. The server path is a new branch: `if (!hasDocument()) return buildVarsText(flat, opts)`. All existing client-side state mutations are already guarded by `hasDocument()` in the current code (per `packages/css/AGENTS.md`: "SSR-safe — hasDocument() guards every DOM write"). The gap is the IN-MEMORY map mutations (`scopedVarsRulesMap.set`, `cache.set`, etc.) which run regardless — those need the same guard.

**`<style>` transform removal is the cleanest path.** Making the transform platform-aware (generate different code for server vs client) is complex and fragile. Removing the transform entirely means users call css() explicitly — they control the return value on each platform. JSX and `html\`\`` become consistent (both treat `<style>` as a regular element). The transform's "magic" (auto-generating css() calls from JSX) was never essential — it was convenience that created a coupling problem.

**Migration path.** Users who had `<style>{obj}</style>` in JSX replace it with explicit `css(obj)` calls at the module level. Users who had `class="${css(obj, {name:'x'})}"` replace it with `css(obj, {name:'x'})` at module level + `class="x"` hardcoded. Mechanical, documented, all within the user's codebase.

## DoD

### Platform-dependent return
- [x] `css(obj, opts)` returns name when `hasDocument()`, returns CSS text when `!hasDocument()`. — css.ts:38 `if (!hasDocument()) return cssText`; client returns `name || ""` at css.ts:67. ssr.test.ts verifies both.
- [x] `cssVars(vars, opts)` returns proxy when `hasDocument()`, returns vars text when `!hasDocument()`. — cssVars.ts:27 inline server-return block. Return type stays `CSSVars<T>` (user decision — union type would break ~25 type-checked client test reads).
- [x] No module-level state mutation when `!hasDocument()` (server is fully stateless). — css.ts returns text before injectedMap mutation; cssVars early-returns before varsStore; removeCss/removeCssVars guard `!hasDocument()`. ssr.test.ts verifies no DOM injection.
- [x] Client-path behavior unchanged (css injects, cssVars creates effects, both return structured values). — 117 css tests pass, 100% coverage.

### Internal state simplification
- [x] `cssStore.ts` exports `injectedMap` (1 map), not `refCounts`/`inlineCache`/`cssRulesMap`/`ruleCounts` (4 maps). — `injectedMap: Map<string, InjectedEntry>` where `InjectedEntry = { count: number; ruleCount: number }`. Deviation: plan's `{ index, count }` had unused `index`; used `{ count, ruleCount }` (ruleCount needed for CSSOM removal). Type co-located in cssStore.ts (not types.d.ts) per code-guide visibility rule.
- [x] `cacheKey()` deleted. — cssStore.ts no longer defines or imports it.
- [x] `syncTextContent()` reads from `injectedMap.keys()`. — cssStore.ts:35 `Array.from(injectedMap.keys()).join("")`.
- [x] `varsStore.ts` in-memory mutations guarded by `hasDocument()`. — Deviation: not guarded inline; cssVars.ts early-returns before reaching varsStore mutations, and removeCssVars guards `!hasDocument()`. Server is stateless by construction (guards upstream achieve the same effect).

### removeCss / removeCssVars
- [x] `removeCss(obj, opts)` re-derives text via `process()`, looks up in `injectedMap`, decrements count. — removeCss.ts imports `process` from `./css`; `injectedMap.get(cssText)` lookup; `entry.count--`.
- [x] `removeCss` is a no-op when `!hasDocument()`. — removeCss.ts:16 `if (!hasDocument()) return;`. ssr.test.ts verifies.
- [x] `removeCssVars` same pattern. — removeCssVars.ts:16 `if (!hasDocument()) return;`. ssr.test.ts verifies.

### resetCss / resetCssVars
- [x] `resetCss()` clears `injectedMap` + CSSOM. Returns `void`. — resetCss.ts: `injectedMap.clear(); if (hasDocument()) resetSheet(STYLE_ID);`
- [x] `resetCssVars()` clears vars state. Returns `void`. — unchanged (already server-safe; maps empty, resetSheet guarded, cleanupVarsEffects no-op on server).
- [x] Both no-op when `!hasDocument()`. — ssr.test.ts verifies no-throw for both.

### `<style>` transform removal
- [x] `plugins/babel/src/transformers/style.mjs` deleted. — `rm` confirmed.
- [x] `plugins/babel/src/transformers/jsx.mjs` style short-circuit removed. — handleStyleTag import + style check deleted; `<style>` falls through to element handling.
- [x] `plugins/babel/src/utils/imports.mjs` `ensureCssImport` removed. — imports.mjs exports 4 helpers (no ensureCssImport).
- [x] `<style>` JSX produces a regular HellaNode (tag: "style"). — transform.test.ts: `<style>hello</style>` → `{ tag: "style", children: ["hello"] }`.
- [x] No `@hellajs/css` import injected by the babel plugin. — transform.test.ts: getNamedImports("@hellajs/css") does not contain "css".

### Tests
- [x] Platform-dependent return tests pass (client name, server text). — ssr.test.ts (repurposed): 13 tests, all green. Deviation: consolidated all server-path tests in ssr.test.ts (DRY) rather than per-file.
- [x] Server-stateless tests pass (no accumulation when `!hasDocument()`). — ssr.test.ts: "css() does not inject into the DOM" + "cssVars() does not inject into the DOM".
- [x] removeCss text-re-derivation tests pass. — existing client tests ("removes styles", "removeCss preserves styles until all references gone") unchanged and green.
- [x] All existing client-path tests unchanged and green. — 117 css tests pass, 0 fail.
- [x] `<style>` transform tests removed; new `<style>`-as-regular-element test passes. — transform.test.ts: Style tag describe block replaced (2 tests), import-injection tests + existing-css-import test removed. 210 babel tests pass.
- [x] `bun coverage css` green. — 117 pass, 100% coverage, lint exit 0.
- [x] `bun coverage babel` green. — Deviation: `bun coverage babel` doesn't support plugins (`isValidPackage` checks `packages/`). Verified via `bun test plugins/babel/tests` (210 pass) + `bun lint` (exit 0). babel AGENTS.md "Run" line corrected.

### Docs
- [x] `packages/css/docs/api/css.mdx` documents platform-dependent return + separated-CSS authoring. — Added `### Platform-Dependent Return`, `### Separated CSS Authoring`, `### Server Return Is Text, Not a Name`.
- [x] `packages/css/docs/api/cssvars.mdx` same. — Added `### Platform-Dependent Return`.
- [x] All cross-references use `` [`name`] `` + `/reference/{package}/{export}`. — Verified in doc edits. Also updated removecss.mdx, resetcss.mdx, index.mdx, css-comparison.md.

### Agent instructions
- [x] `packages/css/AGENTS.md` updated: platform-dependent return, injectedMap, server stateless. — Description, mental model, files table, state table, css() flow, cssVars dual path, non-obvious behaviors, performance, testing sections all updated.
- [x] `plugins/babel/AGENTS.md` updated: `<style>` transform removed. — Mental model, files table (style.mjs row deleted), visitor pipeline (step 1 removed), tag table, `<style>` transform section deleted, import injection table, non-obvious behaviors, tests "Run" line.
- [x] Root `AGENTS.md` notes the css breaking change. — css + babel package descriptions updated.

### Boundary guardrails
- [x] cssVars client-side reactivity preserved (effects fire on signal change). — cssvars.test.ts reactive tests green (signal tracking, batch updates, effect cleanup).
- [x] cssVars reactive path untouched on client. — cssVars.ts: early-return only affects `!hasDocument()` branch; client path (static + reactive) unchanged.
- [x] `bun coverage css` shows 100% on changed source lines. — 100.00% funcs, 100.00% lines.

### Verification gates
- [x] `bun coverage css` green. — 117 pass, 100% coverage, lint exit 0.
- [x] `bun coverage babel` green. — `bun test plugins/babel/tests` (210 pass) + `bun lint` (exit 0).
- [x] No existing dom/core/resource/router/store test breaks. — full sweep: 756 pass, 0 fail.
