---
depends_on: []
---
# @hellajs/ssr v1 — ssr() export (zero new css/resource exports)

## Goal

Ship v1 SSR with minimal surface. `ssr(node)` in a new `@hellajs/ssr` package walks a HellaNode AST and returns `{ html, cssText, varsText }`. **resource** guards `run()` with `hasWindow()` (zero new API — `hasWindow` already re-exported). **css** enriches the *existing* `resetCss()`/`resetCssVars()` to return accumulated text before clearing (zero new export — signature `void → string`, backward-compatible, verified no test asserts the return). **ssr** imports the existing resets and calls them after the walk. **core untouched.** v1 client re-mounts (no hydrate mode).

Single atomic unit: ssr is red without the css reset-enrichment (cssText/varsText come back `""`) and the resource guard (the no-fetch scenario fails). One file, one unit.

## Surface fork: YES (minimal)

- New package `@hellajs/ssr` exports `ssr` — the only new public symbol in the whole change.
- css: signature enrichment on TWO EXISTING exports (`resetCss`, `resetCssVars`: `void → string`). Backward-compatible (all existing call sites are statement-form or `not.toThrow()` assertions — verified).
- resource: internal one-line guard in `run()`. No surface change.
- **core: untouched** (`git diff packages/core` empty).

## Architecture decisions (locked in brainstorm, invariants for this plan)

- **Render-context home: NONE.** No ambient slot anywhere — not in core, not in css/resource, not global. resource branches on `hasWindow()` (process-static, matches its existing `hasDocument()`/`hasWindow()` idiom — fourth use of the same pattern). css accumulates in its existing module-level maps and drains via the existing resets. No coordination channel, no begin/drain lifecycle, no hidden cross-package field-name contract.
- **This is option (3) from brainstorm round 2.** Rejected: (1) `beginRender` on both — most surface, overkill for what's a static env check on resource and a read-on-reset on css; closure-captured isolation solves a problem that doesn't exist under single-caller sync renders. (2) dedicated css reader — one unnecessary export when reset-enrichment suffices. (4) ssr-pure, user drains — worst DX, leak footgun.
- **"Function param options" rejected** (user's suggestion, investigated): components are isomorphic; the caller of `css(obj, {ssr:...})` is the component, which can't know render context. A per-call option breaks the single-authoring-surface invariant. An ambient default is `beginRender` renamed.
- **Concurrency/isolation safety** is identical to the rejected `beginRender`: renders are sync and non-yielding (Crux #3), so css's module-level maps can't interleave across renders, and ssr's end-of-render `resetCss`/`resetCssVars` clears state before the next render starts.

## Files

### New package: `packages/ssr/`

| File | Purpose |
|---|---|
| `packages/ssr/package.json` | `@hellajs/ssr`. peerDependencies: `@hellajs/core`, `@hellajs/dom`, `@hellajs/css`, `@hellajs/resource`. Exports `.` and `./bundle` — copy the shape from `packages/resource/package.json`. |
| `packages/ssr/tsconfig.json` | `{ "extends": "../../tsconfig.base.json", "include": ["./lib/**/*.ts", "lib/index.ts"] }` — copy `packages/resource/tsconfig.json`. |
| `packages/ssr/lib/index.ts` | Barrel: `export { ssr } from "./ssr"; export type * from "./types/ssr";` (no logic — per `guides/code.md` index.ts rules). |
| `packages/ssr/lib/ssr.ts` | The public stringifier. Walks the AST → HTML, then calls existing `resetCss()`/`resetCssVars()` from css to drain + clear, returns `{ html, cssText, varsText }`. try/catch ensures reset runs on failure too. |
| `packages/ssr/lib/internal/walk.ts` | The recursive AST → HTML emitter (per-node + children recursion + fragment handling). |
| `packages/ssr/lib/internal/serialize.ts` | `serializeProp(key, value): string` and `escapeText(s): string` — string emitters mirroring dom's `renderProp` rules (see Strategy). |
| `packages/ssr/lib/types/ssr.d.ts` | `SsrResult = { html: string; cssText: string; varsText: string }`. |
| `packages/ssr/tests/ssr.test.ts` | Per scenarios. Import from `@hellajs/ssr/bundle`; reactive primitives from `@hellajs/core`. |
| `packages/ssr/AGENTS.md` | Package instructions (exports table; architecture: walk + drain-via-reset; gotchas: Portal=nothing, Lazy=loading, sync discipline, no hydrate in v1, **server-only — calling client-side resets css state**). |
| `packages/ssr/README.md` | Package readme. |
| `packages/ssr/docs/index.mdx` | Index Doc per `guides/docs.md` §Index Docs: `## @hellajs/ssr`, one-sentence desc, `### Installation`, `### Example` (self-contained, 15–40 lines), `### API` bullet linking ssr. No `#` heading, no frontmatter. |
| `packages/ssr/docs/api/ssr.mdx` | Function Doc per `guides/docs.md` §Function & Prefix Docs: `# ssr`, one-line desc, `## API` (signature + `**Returns**`), `## Basic Usage` (runnable, imports shown), `## Key Concepts` (`### SSR Style Collection`, `### Resource Fetching Suppressed`), `## Important Considerations` (`### Portal renders nothing`, `### Lazy renders the loading fallback`, `### Server-only — calling client-side resets css state`, `### Synchronous render required`). No frontmatter. |
| `docs/src/pages/reference/ssr/ssr.mdx` | Website wrapper per `guides/docs.md` §Website Wrapper Pages: frontmatter (`title`, `description`, `layout: ../../../layouts/MainLayout.astro`), `import SsrContent from '@ssr/api/ssr.mdx'`, `<SsrContent />`. Zero prose. New `ssr/` folder. |
| `docs/astro.config.mjs` | `alias` block (~line 14-21) | Add `'@ssr/*': '../packages/ssr/docs/*'` alongside the existing `@core/*`..`@store/*` entries. Required for the wrapper's import to resolve. |

### css: enrich EXISTING resetCss + resetCssVars (no new files, no new exports)

| File | Anchor | Change |
|---|---|---|
| `packages/css/lib/resetCss.ts` | `resetCss()` body | Build `cssText = Array.from(cssRulesMap.values()).join("")` (the same join `syncTextContent` does) BEFORE clearing any maps; return it. Signature `void → string`. |
| `packages/css/lib/resetCssVars.ts` | `resetCssVars()` body | Build `varsText` from `scopedVarsRulesMap` in the **mirror format** (`:root{--k: v;}` with space after colon and trailing `;` — the format tests assert, distinct from the CSSOM no-space format) BEFORE clearing; return it. Reuse the private `syncVarsTextContent`'s build logic (extract a shared helper if cleaner). Signature `void → string`. |
| `packages/css/AGENTS.md` | `resetCss`/`resetCssVars` rows + Non-obvious behaviors | Note the enriched return; name `ssr` as the consumer. |
| `packages/css/tests/` | extend existing reset coverage (`css.test.ts`, `cssvars.test.ts`) or a new `reset-return.test.ts` | Return-value scenarios. |

### resource: internal hasWindow guard (no new files, no new exports)

| File | Anchor | Change |
|---|---|---|
| `packages/resource/lib/resource.ts` | `run(force, manual)` — the Guard step (line ~175, alongside/before the `isEnabled` guard) | Add `if (!hasWindow()) return;` — server-side, no fetch, no AbortController, no retry loop, no leak. `hasWindow` is already re-exported in `packages/resource/lib/internal/core.ts`. |
| `packages/resource/AGENTS.md` | `run()` pipeline + Non-obvious behaviors | Document the guard: resource does not fetch server-side; use direct `fetch()` for server-side data needs. |
| `packages/resource/tests/` | extend `fetching.test.ts` or a new `ssr-mode.test.ts` | Scenario uses the `globalThis.window = undefined` pattern (precedent: `css/tests/ssr.test.ts` unsets `globalThis.document`). |

### Website & learn surface (the docs site, beyond the package)

The existing site has a prominent **"Server-side rendering is not currently supported"** alert in `docs/src/pages/learn/index.mdx` — it becomes false the moment v1 lands and MUST be removed in the same change. SSR needs the full learn surface (concept + pattern), the reference wrapper (already listed in the package table), nav registration, and every package/page enumeration updated.

| File | Template / anchor | Change |
|---|---|---|
| `packages/ssr/docs/concepts/ssr.mdx` | Concept Doc (§Concept Docs) | New. `# Server-Side Rendering` + one-line. Sections: the string-renderer model (two backends, one AST — [`html`](/reference/dom/html)/babel produce the DOM-free AST; `ssr` walks it); sync render discipline; what's server-only (Portal renders nothing, Lazy renders loading); how css drains via [`resetCss`](/reference/css/resetcss)/[`resetCssVars`](/reference/css/resetcssvars); resource fetch suppression; the v2 hydration roadmap (re-execute/walk-parallel, not in v1). Cross-reference [`ssr`](/reference/ssr/ssr) on first mention. 40–250 lines. No frontmatter. |
| `packages/ssr/docs/patterns/ssr.mdx` | Pattern Doc (§Pattern Docs) | New. `# Server-Side Rendering`. `###` recipes, each self-contained with imports: Bun HTTP server (`Bun.serve` + `ssr` → response HTML with `<style>`); Express handler; assembling the head (`<style>${cssText}${varsText}</style>`); the client re-mount script (`mount(app(), "#app")` loaded after the body). Terse prose, code speaks. 100–300 lines. No frontmatter. |
| `docs/src/pages/learn/concepts/ssr.mdx` | Website wrapper | New. Frontmatter (`title: Server-Side Rendering`, `description: ...`, `layout`), `import SsrConceptContent from '@ssr/concepts/ssr.mdx'`, `<SsrConceptContent />`. Zero prose. |
| `docs/src/pages/learn/patterns/ssr.mdx` | Website wrapper | New. Frontmatter (`title: SSR`, `description: ...`, `layout`), `import SsrPatternsContent from '@ssr/patterns/ssr.mdx'`, `<SsrPatternsContent />`. Zero prose. |
| `docs/src/nav.ts` | `navigation` object | Add `"Server-Side Rendering"` to the Concepts array (after Resources, alphabetically/logically); add `"SSR"` to the Patterns array; add `{ ssr: ["ssr"] }` to the `reference` array (after `resource`). |
| `docs/src/pages/learn/index.mdx` | (a) the `alert-error` block at top (~line 12-16); (b) Package Overview bullets; (c) Concepts list; (d) Patterns list | (a) **Remove the "Server-side rendering is not currently supported" alert** — now false. (b) Add `- **[@hellajs/ssr](/reference/ssr)**: Server-side rendering to HTML strings.` to Package Overview. (c) Add `- [Server-Side Rendering](/learn/concepts/ssr): Render to HTML on the server and re-mount on the client` to Concepts. (d) Add `- [SSR](/learn/patterns/ssr): Bun/Express server setup, head assembly, client re-mount` to Patterns. |
| `docs/src/pages/learn/patterns/index.mdx` | the `By Concept` card grid | Add an SSR card matching the existing card markup (Icon, label, one-line description, link to `/learn/patterns/ssr`). |
| `docs/src/pages/reference/index.mdx` | package sections (after the `@hellajs/resource` block) | Add `import SsrContent from '@ssr/index.mdx';`; add a `# @hellajs/ssr` / `<Badge package="ssr" />` / `<SsrContent />` section + divider, matching the existing per-package blocks. |

## Delta

```ts
// packages/css/lib/resetCss.ts (enriched — backward-compatible)
export function resetCss(): string {
  const text = Array.from(cssRulesMap.values()).join("");   // build BEFORE clearing
  inlineCache.clear();
  refCounts.clear();
  cssRulesMap.clear();
  ruleCounts.clear();
  if (hasDocument()) resetSheet(STYLE_ID);
  return text;
}
```
```ts
// packages/resource/lib/resource.ts (one-line guard, ~line 175)
async function run(force = false, manual = false) {
  if (!hasWindow()) return;                                 // SSR: server-side, no fetch
  if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;
  // ... existing pipeline unchanged
}
```
```ts
// packages/ssr/lib/ssr.ts
import { resetCss, resetCssVars } from "@hellajs/css";
import type { HellaNode } from "@hellajs/dom";
import { walk } from "./internal/walk";
import type { SsrResult } from "./types/ssr";

export function ssr(node: HellaNode): SsrResult {
  try {
    const html = walk(node);
    return { html, cssText: resetCss(), varsText: resetCssVars() };  // drain + clear
  } catch (e) {
    resetCss(); resetCssVars();                                       // clean up on failure
    throw e;
  }
}
```

Runnable usage (seeds the Docs task):

```ts
import { ssr } from "@hellajs/ssr";
import { html } from "@hellajs/dom";
import { css } from "@hellajs/css";
import { signal } from "@hellajs/core";

const count = signal(0);
const cls = css({ color: "red" }, { name: "x" });
const { html: body, cssText, varsText } = ssr(html`<div class="${cls}">${count()}</div>`);
// body:    <div class="x">0</div>
// cssText: .x{color:red;}
// → assemble response: <style>${cssText}${varsText}</style>...<div id="app">${body}</div>
```

## Behavioral scenarios (tests)

Derived per `guides/tests.md` §Scenario → test() derivation: one scenario → one `test()`, present-tense name, no "should", setup → action → assertion flow, `mock()` for call tracking, `beforeEach(resetTestState())` on shared mutable state.

### File 1: `packages/ssr/tests/ssr.test.ts` (surface: `ssr`)

Import order per `guides/tests.md` §Test Framework (bun:test → core → utils → dependency bundles → package-under-test `/bundle` last → `import type`):
```ts
import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { css, cssVars } from "@hellajs/css/bundle";
import { html } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
```
`beforeEach(() => { resetTestState(); })` — touches css maps + dom state.

- Scenario: static node → exact HTML. → `test("renders static node to exact HTML", () => { ... ssr(html\`<div>hi</div>\`).html === "<div>hi</div>" })`
- Scenario: reactive signal child inlined. → `test("inlines current signal value into the HTML", () => { ... drive signal, assert .html contains the value })`
- Scenario: `bind:` renders initial value. → `test("renders bind directive's initial signal value as an attribute", () => { ... })`
- Scenario: fragment concatenates without markers. → `test("concatenates fragment children without fragment markers", () => { ... multi-root html\`\` → joined, no "$" leaks })`
- Scenario: text escaping. → `test("escapes interpolated text (<, >, &, \")", () => { ... signal with special chars → escaped in .html })`
- Scenario: attribute escaping. → `test("escapes attribute values", () => { ... })`
- Scenario: css populates cssText. → `test("collects css() rules into cssText", () => { ... css({color:'red'},{name:'x'}) inside the tree → result.cssText contains ".x{color:red}", result.html carries class="x" })`
- Scenario: cssVars populates varsText (mirror format). → `test("collects cssVars() into varsText in mirror format", () => { ... result.varsText matches ":root{--k: v;}" })`
- Scenario: ForEach renders items in order. → `test("renders each ForEach item in array order", () => { ... no reconciliation server-side })`
- Scenario: Transition show=true renders child. → `test("renders Transition child when show is true", () => { ... })`
- Scenario: Transition show=false renders nothing. → `test("renders nothing when Transition show is false", () => { ... })`
- Scenario: Portal renders nothing, no throw. → `test("renders nothing for Portal and does not throw", () => { ... document the limitation })`
- Scenario: Lazy renders loading fallback, no throw. → `test("renders Lazy loading fallback without awaiting the loader", () => { ... })`
- **Scenario (load-bearing): per-request isolation.** → `test("isolates cssText between sequential renders", () => { ... two ssr calls with different css → second .cssText does not contain first render's rules })`
- Scenario: component fn walked. → `test("renders a component function's returned AST", () => { ... component(...) → AST → HTML })`
- Scenario: failed render cleans up. → `test("clears css state after a render that throws", () => { ... walk throws → catch → next render's .cssText is clean (no leak from failed render) })`

### File 2: extend `packages/css/tests/css.test.ts` + `packages/css/tests/cssvars.test.ts` (resetCss / resetCssVars return value)

Both files already import `resetCss` / `resetCssVars` and exercise them as cleanup. Add return-value tests adjacent to existing reset usage — no new file (avoids a sub-minimum file; the surface is already co-located).

- In `css.test.ts`: `test("resetCss returns accumulated cssText before clearing", () => { ... css({color:'red'},{name:'x'}); const text = resetCss(); expect(text).toContain(".x{color:red}"); expect(resetCss()).toBe("") })`
- In `cssvars.test.ts`: `test("resetCssVars returns accumulated varsText in mirror format before clearing", () => { ... cssVars({theme:{color:'red'}}); const text = resetCssVars(); expect(text).toMatch(/:root\{--theme-color: red;\}/); expect(resetCssVars()).toBe("") })`
- Backward-compat (the existing `not.toThrow()` assertions in `packages/css/tests/ssr.test.ts` stay green after `void → string`).

### File 3: `packages/resource/tests/ssr-mode.test.ts` (NEW — surface: `ssr-mode`, cross-cutting mode like `hash-mode.test.ts`)

The `hasWindow()` guard is env-scoped, so tests unset `globalThis.window` (precedent: `packages/css/tests/ssr.test.ts` unsets `globalThis.document`). Per `guides/tests.md` §Patched browser globals: capture original in `beforeEach`, restore in `afterEach` (a trailing restoration is unacceptable).
```ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";
```
- Scenario: no fetch when window unset. → `test("does not call the fetcher when window is undefined", () => { ... const fetcher = mock(() => delay(mockUser)); resource(fetcher, { refetchOnKeyChange: true }); expect(fetcher).toHaveBeenCalledTimes(0) })` (unset window in beforeEach)
- Scenario: fetch when window present (backward compat). → `test("calls the fetcher normally when window is present", () => { ... same resource with window restored → fetcher called })`

**Coverage DoD reachability** (`guides/tests.md` §Coverage + the barrel rule): the ssr package's only barrel export is `ssr`; File 1's scenarios cover its branches (static/reactive/fragment/escaping/css/vars/ForEach/Transition/Portal/Lazy/isolation/component/error). css's `resetCss`/`resetCssVars` are barrel exports enriched by this change — Files 2 cover the new return-value branch. resource's guard is internal to `run()` (not a barrel export) — File 3 covers it via the public `resource()` surface, which is the only way to reach `run()`.

## Doc updates

Derived per `guides/docs.md`. Package docs (`packages/*/docs/**/*.mdx`) carry **no frontmatter**; website wrappers (`docs/src/pages/**/*.mdx`) carry `title`/`description`/`layout`. New standalone export → new `docs/api/{export}.mdx` Function Doc + new website wrapper (§Extending Existing Content tree). Existing-export delta → extend in place.

| File | Template (§Template Selection) | Change |
|---|---|---|
| `packages/ssr/docs/index.mdx` | Index Doc (§Index Docs) | New. `## @hellajs/ssr` + one-sentence desc; `### Installation` (`npm install @hellajs/ssr`); `### Example` (self-contained 15–40 line ssr demo, `typescript`/`jsx` tags, imports shown); `### API` bullet `**[ssr](/reference/ssr/ssr)**: description`. No `#` heading, no frontmatter. |
| `packages/ssr/docs/api/ssr.mdx` | Function Doc (§Function & Prefix Docs) | New. `# ssr`; one-line desc; `## API` block `function ssr(node: HellaNode): SsrResult` + bullets (`node`, `**Returns**` linking the fields); `## Basic Usage` (runnable example from the Delta, imports from `@hellajs/ssr`/`@hellajs/dom`/`@hellajs/css`/`@hellajs/core`, no test assertions — use `// body: <div ...>` comments per §Comment Style); `## Key Concepts` → `### SSR Style Collection` (drains via resetCss/resetCssVars), `### Resource Fetching Suppressed` (no fetch server-side, client re-mount fetches); `## Important Considerations` → `### Portal renders nothing`, `### Lazy renders the loading fallback`, `### Server-only — calling client-side resets css state`, `### Synchronous render required`. 100–350 lines (§Length Targets). |
| `docs/src/pages/reference/ssr/ssr.mdx` | Website Wrapper (§Website Wrapper Pages) | New + new `ssr/` folder. Frontmatter (`title: ssr`, `description: ...`, `layout: ../../../layouts/MainLayout.astro`), `import SsrContent from '@ssr/api/ssr.mdx'`, `<SsrContent />`. Zero prose between import and tag. |
| `docs/astro.config.mjs` | Config | Add `'@ssr/*': '../packages/ssr/docs/*'` to the `alias` block (~line 20) so the wrapper import resolves. |
| `packages/css/docs/api/resetcss.mdx` | Extend Function Doc in place (§Extending Existing Content) | `## API`: change `function resetCss(): void` → `function resetCss(): string` and `**Returns**: \`void\`` → `**Returns**: the accumulated cssText before clearing`. Add `### SSR Style Collection` under `## Key Concepts`: "Returns the accumulated rules before clearing — `@hellajs/ssr`'s [`ssr`](/reference/ssr/ssr) calls this to drain styles per request." Cross-reference on first mention, backtick-wrapped. |
| `packages/css/docs/api/resetcssvars.mdx` | Extend Function Doc in place | Same enrichment: `void → string`, **Returns** the accumulated varsText (mirror format) before clearing; add `### SSR Style Collection` cross-referencing `ssr`. |
| `packages/resource/docs/api/resource.mdx` | Extend in place (gotcha) | Add `### Server-Side Rendering` under `## Important Considerations`: "resource does not fetch when no `window` is present — the fetcher is not called during SSR. Use direct `fetch()` for server-side data needs; the client re-mount fetches normally." Cross-reference `ssr`. |
| `packages/ssr/AGENTS.md` | (agent instructions, not docs.md) | Package instructions per `brain-author`: exports table, architecture (walk + drain-via-reset + resource auto-suppress), gotchas, testing approach. |
| `packages/css/AGENTS.md` | (agent instructions) | `resetCss`/`resetCssVars` rows: note enriched return. Non-obvious behaviors: add a bullet. |
| `packages/resource/AGENTS.md` | (agent instructions) | `run()` pipeline Guard step: document the `hasWindow()` early-return. |
| Root `AGENTS.md` | (agent instructions) | Packages table: add the `ssr` row. |

Per §Cross-References: all inter-doc links use `` [`name`] `` + `/reference/{package}/{export}` full-path format; link on first mention only; section headings contain no links. Per §Comment Style: zero test-framework assertions in doc code blocks (use `// → <div ...>` comments). Per §Splitting & Duplicate Rules: the SSR-behavior summary lives once in `ssr.mdx` §Key Concepts and is cross-referenced from the css/resource pages (no duplication).

## Strategy

**Minimal surface by reuse.** No new css/resource exports, no ambient slot, no begin/drain lifecycle. resource's guard is the fourth use of its existing `hasWindow`/`hasDocument` env-probe idiom. css's enrichment returns text it was already computing (or could compute in one join) before discarding — the drain is nearly free. ssr is the only new public symbol in the entire change.

**resource guard is process-static, not render-scoped.** On the server, resource never fetches — not "during renders," but period. This is cleaner than a render-scoped suppress flag: resource is a reactive UI primitive; on the server it's only ever used during SSR renders; background server-side data work should use direct `fetch()`. Documented as a behavior, not a limitation.

**css reset-enrichment reuses existing machinery.** `resetCss` already cleared `cssRulesMap`; returning `Array.from(cssRulesMap.values()).join("")` before clearing is the same join `syncTextContent` does. `resetCssVars` must produce the **mirror format** (`:root{--k: v;}` with spaces), matching what `syncVarsTextContent` would have written — distinct from the CSSOM no-space format. The private build logic can be extracted into a shared helper to avoid duplication. The within-render dedup still works: `inlineCache` dedups during the walk; reset clears it between renders (correct for isolation; minor server-side perf cost of re-injecting rules each request, acceptable on a server process).

**ssr is server-only.** Calling it client-side would invoke `resetCss()`/`resetCssVars()`, wiping the running app's styles. v1's flow is: server `ssr` → client `mount()` (re-mount). The client never calls `ssr`. Document as a gotcha; no runtime guard (a `hasDocument()` guard would break the HappyDOM test suite, which legitimately resets state between tests).

**Serialization is reimplemented, not imported.** `renderProp`/`toText`/`resolveValue` live in `packages/dom/lib/internal/utils.ts` and are NOT re-exported by dom's barrel (verified — internal). ssr cannot import dom internals. So `internal/serialize.ts` mirrors `renderProp`'s rules as string emission: `DIRECT_PROPS` (`value`/`checked`/`selected`/`innerHTML`) map to attribute strings; falsy (`false`/`null`/`undefined`) → omit; `true` → empty-string attribute; arrays → space-joined class lists; else `key="escaped-value"`. `isFalsy(0)` stays false (signal `0` renders `"0"`). Emit attributes in the same order `renderProp` applies them — this is the contract v2 hydrate-mode walk-parallel depends on for matching. ~15 lines of stable duplication; alternative (promoting dom internals to public) rejected as a larger Surface change to dom for no other gain.

**The walk.** `walk(node)` recurses over the HellaNode AST the same way `mountNode` does (handle `tag: "$"` as fragment, recurse `children`, resolve placeholder/function children to current values) but emits strings.

**Trade-offs rejected:** (a) `beginRender` on css/resource — most surface, overkill; (b) dedicated css reader — one unnecessary export; (c) core render-context slot — boundary inversion + hidden field-name contract (brainstorm round 1); (d) AsyncLocalStorage — premature, sync renders don't yield; (e) passing a context through the component tree — breaks the authoring surface; (f) ssr-pure/user-drains — leak footgun.

## DoD

### New package
- [ ] `packages/ssr/package.json` exists with peerDeps on core/dom/css/resource and `.`/`./bundle` exports matching the resource template.
- [ ] `packages/ssr/tsconfig.json` extends `tsconfig.base.json`.
- [ ] `packages/ssr/lib/index.ts` is a pure barrel re-exporting `ssr` + the result type.
- [ ] `packages/ssr/lib/ssr.ts` implements the Delta (walk, drain via `resetCss()`/`resetCssVars()` in a try/catch).
- [ ] `packages/ssr/lib/internal/{walk,serialize}.ts` exist with the AST→HTML emitter and string serializers.
- [ ] `packages/ssr/lib/types/ssr.d.ts` exports `SsrResult`.
- [ ] `packages/ssr/AGENTS.md` + `packages/ssr/README.md` exist.

### css reset enrichment (no new export)
- [ ] `packages/css/lib/resetCss.ts` returns the accumulated cssText before clearing; signature `void → string`.
- [ ] `packages/css/lib/resetCssVars.ts` returns the accumulated varsText (mirror format) before clearing; signature `void → string`.
- [ ] Scenario 16 passes (resetCss returns text / "" when empty).
- [ ] Scenario 17 passes (resetCssVars returns mirror-format text).
- [ ] Scenario 18 passes (existing call sites unchanged — backward compatibility).

### resource guard (no new export)
- [ ] `packages/resource/lib/resource.ts` `run()` has the `if (!hasWindow()) return;` guard at the top.
- [ ] Scenario 19 passes (no fetch when `globalThis.window` unset).
- [ ] Scenario 20 passes (normal fetch when window present — backward compatible).

### ssr suite
- [ ] Scenarios 1–15 pass (`packages/ssr/tests/ssr.test.ts`).
- [ ] Escaping scenarios (5, 6) cover `<`, `>`, `&`, `"`.
- [ ] Scenario 13 passes (per-request isolation — load-bearing).
- [ ] Scenario 15 passes (failed-render cleanup — no leak).

### Tests (per `guides/tests.md`)
- [ ] `packages/ssr/tests/ssr.test.ts` exists, surface-named, import order correct (bun:test → core → utils → css/bundle → dom/bundle → ssr/bundle → `import type`), `beforeEach(resetTestState())`.
- [ ] Every scenario in File 1 → one `test()` with a present-tense name, no "should", no two behaviors per test.
- [ ] `mock()` used for any call tracking; no boolean flags / integer counters.
- [ ] `packages/css/tests/css.test.ts` has the resetCss return-value test (non-empty + `""` after clear).
- [ ] `packages/css/tests/cssvars.test.ts` has the resetCssVars return-value test (mirror format + `""` after clear).
- [ ] `packages/resource/tests/ssr-mode.test.ts` exists (surface `ssr-mode`), saves `globalThis.window` in `beforeEach`, restores in `afterEach`, uses `mock()` for the fetcher.
- [ ] `bun coverage ssr/css/resource` shows 100% on changed source lines; overall not lower than baseline.

### Docs (per `guides/docs.md`)
- [ ] `packages/ssr/docs/index.mdx` exists (Index Doc: `##` heading, no frontmatter, Installation/Example/API).
- [ ] `packages/ssr/docs/api/ssr.mdx` exists (Function Doc: `# ssr`, `## API` with signature + **Returns**, `## Basic Usage` runnable no-test-assertions, `## Key Concepts`, `## Important Considerations`).
- [ ] `docs/src/pages/reference/ssr/ssr.mdx` wrapper exists with frontmatter + `@ssr/` import + `<Component />`, zero prose.
- [ ] `docs/astro.config.mjs` has the `'@ssr/*'` alias.
- [ ] `packages/css/docs/api/resetcss.mdx` `## API` shows `: string` return; `### SSR Style Collection` added under Key Concepts cross-referencing `ssr`.
- [ ] `packages/css/docs/api/resetcssvars.mdx` same enrichment.
- [ ] `packages/resource/docs/api/resource.mdx` has `### Server-Side Rendering` under Important Considerations.
- [ ] All cross-references use `` [`name`] `` + `/reference/{package}/{export}` full-path; no test-framework assertions in any doc code block; no single-letter variable names.

### Learn surface & site enumerations
- [ ] `packages/ssr/docs/concepts/ssr.mdx` exists (Concept Doc, 40–250 lines, cross-references ssr/resetCss/resetCssVars).
- [ ] `packages/ssr/docs/patterns/ssr.mdx` exists (Pattern Doc, Bun + Express recipes, each `###` self-contained with imports).
- [ ] `docs/src/pages/learn/concepts/ssr.mdx` + `docs/src/pages/learn/patterns/ssr.mdx` wrappers exist (frontmatter + `@ssr/` import + `<Component />`, zero prose).
- [ ] `docs/src/nav.ts` registers `Server-Side Rendering` under Concepts, `SSR` under Patterns, and `{ ssr: ["ssr"] }` under reference.
- [ ] **The "Server-side rendering is not currently supported" alert in `docs/src/pages/learn/index.mdx` is removed** (it's now false — leaving it is a correctness bug).
- [ ] `docs/src/pages/learn/index.mdx` Package Overview has the `@hellajs/ssr` bullet; Concepts list has the SSR link; Patterns list has the SSR link.
- [ ] `docs/src/pages/learn/patterns/index.mdx` has the SSR card.
- [ ] `docs/src/pages/reference/index.mdx` imports `@ssr/index.mdx` and renders the `@hellajs/ssr` `<Badge>` + content section.
- [ ] No broken cross-reference links — `/reference/ssr/ssr`, `/learn/concepts/ssr`, `/learn/patterns/ssr` all resolve to real files; every `@ssr/*` wrapper import has a matching source doc.

### Agent instructions (AGENTS.md — not user docs)
- [ ] `packages/ssr/AGENTS.md` + README written.
- [ ] `packages/css/AGENTS.md` reset rows + Non-obvious behaviors updated.
- [ ] `packages/resource/AGENTS.md` `run()` Guard step + Non-obvious behaviors updated.
- [ ] Root `AGENTS.md` Packages table has the `ssr` row.

### Boundary guardrails (the load-bearing invariants of this revision)
- [ ] **core untouched** — `git diff packages/core` empty.
- [ ] **css and resource have ZERO new public exports** — only signature enrichment on existing exports (css) and an internal guard (resource). Diff their `lib/index.ts` barrels: no new export lines.

### Verification gates (the single gate per package per AGENTS.md — never standalone `bun test`/`bun lint`)
- [ ] `bun bundle ssr` succeeds (new package builds into `dist/`).
- [ ] `bun coverage ssr` green.
- [ ] `bun coverage css` green.
- [ ] `bun coverage resource` green.
- [ ] No existing css/resource test breaks.
