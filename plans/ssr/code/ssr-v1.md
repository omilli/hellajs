---
depends_on: []
---
# @hellajs/ssr v1 — ssr() export (pure stringifier, zero runtime deps)

## Goal

Ship v1 SSR with minimal surface. `ssr(node)` in a new `@hellajs/ssr` package walks a HellaNode AST and returns an HTML **string**. **ssr has zero runtime imports** from any HellaJS package — only a type-only import of `HellaNode` from `@hellajs/dom`. **resource** guards `run()` with `hasWindow()` (zero new API). **css is NOT part of this plan** — css's server story (platform-dependent return) lives in `plans/css/code/platform-return.md`, ships independently. **core untouched.** v1 client enhances the shipped HTML via `$ref`/`$collection` bindings and `mount(Island, "#empty-slot")` islands — no hydrate mode, no full re-mount.

Single atomic unit: the ssr package + the resource guard. css is a separate concern, composed at the caller level.

## Surface fork: YES (minimal)

- New package `@hellajs/ssr` exports `ssr` — the only new public symbol in the whole change. Returns `string`.
- resource: internal one-line guard in `run()`. No surface change.
- **core: untouched** (`git diff packages/core` empty).
- **css: NOT in this plan.** See `plans/css/code/platform-return.md`.

## Architecture decisions

- **Client enhancement model (v1, no hydrate).** The shipped HTML is the source of truth on the client. Three modes: (1) `$ref(selector)` bind/on/hooks an existing static node into reactivity; (2) `$collection(selector)` for existing + future-matched node lists; (3) `mount(Island, "#empty-slot")` mounts a reactive island into an **empty** placeholder the server template left for it. The full-tree re-mount `mount(app(), "#server-rendered-container")` is a **footgun** — `mountNode` → `container.replaceChildren` (`packages/dom/lib/mount.ts:59`) wipes the server HTML and rebuilds, losing user state in the destroyed subtree. Valid only when the server HTML is intentionally throwaway (SEO-only static content). v1 docs name the enhancement modes as primary and call out the re-mount footgun in `### Important Considerations`. Hydration direction is NOT pre-committed — see `plans/ssr/code/hydration-design.md`.
- **ssr/css independence.** ssr does NOT import `@hellajs/css`. The caller obtains CSS text from css()'s return value (platform-dependent return per `plans/css/code/platform-return.md`). ssr has zero runtime deps — trivially bundler-friendly, testable in isolation, works with or without css installed.

## Files

### New package: `packages/ssr/`

| File | Purpose |
|---|---|
| `packages/ssr/package.json` | `@hellajs/ssr`. peerDependencies: `@hellajs/dom` ONLY (type-only import — version alignment for the HellaNode AST shape). css and resource are NOT peerDeps — ssr never imports them. Exports `.` and `./bundle` — copy the shape from `packages/resource/package.json`. |
| `packages/ssr/tsconfig.json` | `{ "extends": "../../tsconfig.base.json", "include": ["./lib/**/*.ts", "lib/index.ts"] }` — copy `packages/resource/tsconfig.json`. |
| `packages/ssr/lib/index.ts` | Barrel: `export { ssr } from "./ssr";` (no logic, no type export — per `guides/code.md` index.ts rules). |
| `packages/ssr/lib/ssr.ts` | The public stringifier. `ssr(node): string`. Walks the AST → HTML string. No css import. No try/catch (walk failures propagate to the caller). |
| `packages/ssr/lib/internal/walk.ts` | The recursive AST → HTML emitter (per-node + children recursion + fragment handling). |
| `packages/ssr/lib/internal/serialize.ts` | `serializeProp(key, value): string` and `escapeText(s): string` — string emitters mirroring dom's `renderProp` rules (see Strategy). |
| `packages/ssr/tests/ssr.test.ts` | Per scenarios. Import from `@hellajs/ssr/bundle`; reactive primitives from `@hellajs/core`. |
| `packages/ssr/AGENTS.md` | Package instructions (exports table; architecture: walk-only, zero runtime deps; gotchas: Portal=nothing, Lazy=loading, sync discipline, no hydrate in v1, **full re-mount over server HTML wipes it — use `$ref`/`$collection` or empty-slot islands**). |
| `packages/ssr/README.md` | Package readme. |
| `packages/ssr/docs/index.mdx` | Index Doc per `guides/docs.md` §Index Docs. |
| `packages/ssr/docs/api/ssr.mdx` | Function Doc per `guides/docs.md` §Function & Prefix Docs (see Doc updates). |
| `docs/src/pages/reference/ssr/ssr.mdx` | Website wrapper per `guides/docs.md` §Website Wrapper Pages. |
| `docs/astro.config.mjs` | Add `'@ssr/*': '../packages/ssr/docs/*'` to the `alias` block. |

### resource: internal hasWindow guard (no new files, no new exports)

| File | Anchor | Change |
|---|---|---|
| `packages/resource/lib/resource.ts` | `run(force, manual)` — the Guard step (line ~175) | Add `if (!hasWindow()) return;` — server-side, no fetch. |
| `packages/resource/AGENTS.md` | `run()` pipeline + Non-obvious behaviors | Document the guard. |
| `packages/resource/tests/` | new `ssr-mode.test.ts` | Scenario uses the `globalThis.window = undefined` pattern. |

### Website & learn surface

The existing site has a **"Server-side rendering is not currently supported"** alert in `docs/src/pages/learn/index.mdx` — it becomes false the moment v1 lands and MUST be removed.

| File | Change |
|---|---|
| `packages/ssr/docs/concepts/ssr.mdx` | New. Concept Doc: string-renderer model, zero runtime deps, client enhancement model, sync render discipline, Portal/Lazy server-side behavior, re-mount footgun. Cross-reference [`ssr`](/reference/ssr/ssr). |
| `packages/ssr/docs/patterns/ssr.mdx` | New. Pattern Doc recipes: (1) plain HTML Bun.serve; (2) styled SSR (css() returns text on server — see `plans/css/code/platform-return.md`); (3) Express handler; (4) `$ref` enhancement; (5) island mount. |
| `docs/src/pages/learn/concepts/ssr.mdx` | Website wrapper. |
| `docs/src/pages/learn/patterns/ssr.mdx` | Website wrapper. |
| `docs/src/nav.ts` | Register under Concepts, Patterns, reference. |
| `docs/src/pages/learn/index.mdx` | Remove SSR alert; add Package Overview + Concepts + Patterns bullets. |
| `docs/src/pages/learn/patterns/index.mdx` | Add SSR card. |
| `docs/src/pages/reference/index.mdx` | Add `@hellajs/ssr` section. |

## Delta

```ts
// packages/resource/lib/resource.ts (one-line guard, ~line 175)
async function run(force = false, manual = false) {
  if (!hasWindow()) return;                                 // SSR: server-side, no fetch
  if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;
  // ... existing pipeline unchanged
}
```
```ts
// packages/ssr/lib/ssr.ts — zero runtime imports from HellaJS packages
import type { HellaNode } from "@hellajs/dom";              // type-only, erased at compile time
import { walk } from "./internal/walk";

export function ssr(node: HellaNode): string {
  return walk(node);
}
```

Runnable usage — **plain HTML (no css):**
```ts
import { ssr } from "@hellajs/ssr";
import { html } from "@hellajs/dom";

const body = ssr(html`<div><h1>Hello</h1><p>World</p></div>`);
// body: "<div><h1>Hello</h1><p>World</p></div>"
```

Runnable usage — **styled SSR (css platform-dependent return, per `plans/css/code/platform-return.md`):**
```ts
import { ssr } from "@hellajs/ssr";
import { html } from "@hellajs/dom";
import { css } from "@hellajs/css";

const btnCss = css({ color: "red" }, { name: "btn" });  // server: ".btn{color:red}"
const body = ssr(html`<button class="btn">Click</button>`);
const page = `<!DOCTYPE html><html><head><style>${btnCss}</style></head>
<body><div id="app">${body}</div></body></html>`;
```

## Behavioral scenarios (tests)

### File 1: `packages/ssr/tests/ssr.test.ts` (surface: `ssr`)

```ts
import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { html } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
```
`beforeEach(() => { resetTestState(); })`.

- Scenario: static node → exact HTML. → `test("renders static node to exact HTML", () => { expect(ssr(html\`<div>hi</div>\`)).toBe("<div>hi</div>") })`
- Scenario: returns a string. → `test("returns an HTML string", () => { expect(typeof ssr(html\`<div></div>\`)).toBe("string") })`
- Scenario: reactive signal child inlined. → `test("inlines current signal value into the HTML", () => { ... })`
- Scenario: `bind:` renders initial value. → `test("renders bind directive's initial signal value as an attribute", () => { ... })`
- Scenario: fragment concatenates without markers. → `test("concatenates fragment children without fragment markers", () => { ... })`
- Scenario: text escaping. → `test("escapes interpolated text (<, >, &, \")", () => { ... })`
- Scenario: attribute escaping. → `test("escapes attribute values", () => { ... })`
- Scenario: ForEach renders items in order. → `test("renders each ForEach item in array order", () => { ... })`
- Scenario: Transition show=true renders child. → `test("renders Transition child when show is true", () => { ... })`
- Scenario: Transition show=false renders nothing. → `test("renders nothing when Transition show is false", () => { ... })`
- Scenario: Portal renders nothing, no throw. → `test("renders nothing for Portal and does not throw", () => { ... })`
- Scenario: Lazy renders loading fallback, no throw. → `test("renders Lazy loading fallback without awaiting the loader", () => { ... })`
- Scenario: component fn walked. → `test("renders a component function's returned AST", () => { ... })`
- Scenario: walk failure propagates. → `test("propagates walk errors to the caller", () => { ... })`

### File 2: `packages/resource/tests/ssr-mode.test.ts` (surface: `ssr-mode`)

```ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";
```
- Scenario: no fetch when window unset. → `test("does not call the fetcher when window is undefined", () => { ... })`
- Scenario: fetch when window present. → `test("calls the fetcher normally when window is present", () => { ... })`

**Coverage DoD:** ssr's barrel export is `ssr` (returns string); File 1 covers its branches. resource's guard is internal to `run()` — File 2 covers it via the public `resource()` surface.

## Doc updates

| File | Change |
|---|---|
| `packages/ssr/docs/index.mdx` | New. Index Doc: `## @hellajs/ssr`, Installation, Example (plain HTML + styled), API bullet. |
| `packages/ssr/docs/api/ssr.mdx` | New. Function Doc: `# ssr`, `## API` (`function ssr(node: HellaNode): string`), `## Basic Usage` (plain HTML + styled showing css() returning text on server), `## Key Concepts` (`### Zero Runtime Dependencies`, `### Resource Fetching Suppressed`, `### Client Enhancement Model`), `## Important Considerations` (`### Portal renders nothing`, `### Lazy renders the loading fallback`, `### Full re-mount over server HTML wipes it`, `### Synchronous render required`). |
| `docs/src/pages/reference/ssr/ssr.mdx` | New. Website Wrapper. |
| `docs/astro.config.mjs` | Add `'@ssr/*'` alias. |
| `packages/resource/docs/api/resource.mdx` | Extend: `### Server-Side Rendering` under Important Considerations. |
| `packages/ssr/AGENTS.md` | Package instructions: exports table, architecture (walk-only, zero deps), gotchas. |
| `packages/resource/AGENTS.md` | `run()` Guard step documented. |
| Root `AGENTS.md` | Packages table: add the `ssr` row. |

## Strategy

**Minimal surface.** ssr is a pure stringifier — zero runtime imports from any HellaJS package. resource's guard is the fourth use of its existing `hasWindow`/`hasDocument` env-probe idiom. ssr is the only new public symbol.

**ssr/css independence.** ssr does NOT import `@hellajs/css`. css's server story (platform-dependent return — css() returns text on server) lives in a separate plan (`plans/css/code/platform-return.md`) and ships independently. The caller composes them: css() for text, ssr() for HTML, assemble in the handler.

**resource guard is process-static.** On the server, resource never fetches — period. resource is a reactive UI primitive; on the server it's only ever used during SSR renders; background server-side data work should use direct `fetch()`.

**Serialization is reimplemented, not imported.** `renderProp`/`toText`/`resolveValue` are dom-internal (not re-exported). `internal/serialize.ts` mirrors `renderProp`'s rules as string emission. ~15 lines of stable duplication.

**The walk.** `walk(node)` recurses over the HellaNode AST (handle `tag: "$"` as fragment, recurse `children`, resolve placeholder/function children to current values) but emits strings.

## DoD

### New package
- [ ] `packages/ssr/package.json` exists with peerDeps on `@hellajs/dom` ONLY; `.`/`./bundle` exports.
- [ ] `packages/ssr/tsconfig.json` extends `tsconfig.base.json`.
- [ ] `packages/ssr/lib/index.ts` is a pure barrel: `export { ssr } from "./ssr";`.
- [ ] `packages/ssr/lib/ssr.ts` implements the Delta (walk → string, NO css import, NO try/catch).
- [ ] `packages/ssr/lib/internal/{walk,serialize}.ts` exist.
- [ ] **`packages/ssr/lib/` has ZERO runtime imports from `@hellajs/*`** (the `import type` is erased).
- [ ] `packages/ssr/AGENTS.md` + `packages/ssr/README.md` exist.

### resource guard
- [ ] `packages/resource/lib/resource.ts` `run()` has the `if (!hasWindow()) return;` guard.
- [ ] No-fetch-when-window-unset test passes.
- [ ] Normal-fetch-when-window-present test passes (backward compatible).

### Tests
- [ ] `packages/ssr/tests/ssr.test.ts` exists, surface-named, import order correct, `beforeEach(resetTestState())`.
- [ ] All File 1 scenarios pass.
- [ ] `packages/resource/tests/ssr-mode.test.ts` exists, saves/restores `globalThis.window`.
- [ ] `bun coverage ssr` green.
- [ ] `bun coverage resource` green.

### Docs
- [ ] `packages/ssr/docs/index.mdx` exists (Index Doc).
- [ ] `packages/ssr/docs/api/ssr.mdx` exists (Function Doc with plain HTML + styled examples).
- [ ] `docs/src/pages/reference/ssr/ssr.mdx` wrapper exists.
- [ ] `docs/astro.config.mjs` has the `'@ssr/*'` alias.
- [ ] `packages/resource/docs/api/resource.mdx` has `### Server-Side Rendering`.

### Learn surface
- [ ] `packages/ssr/docs/concepts/ssr.mdx` exists (Concept Doc).
- [ ] `packages/ssr/docs/patterns/ssr.mdx` exists (Pattern Doc with recipes).
- [ ] `docs/src/pages/learn/concepts/ssr.mdx` + `patterns/ssr.mdx` wrappers exist.
- [ ] `docs/src/nav.ts` registers SSR under Concepts, Patterns, reference.
- [ ] **The "Server-side rendering is not currently supported" alert is removed.**
- [ ] All enumeration pages updated.

### Agent instructions
- [ ] `packages/ssr/AGENTS.md` + README written.
- [ ] `packages/resource/AGENTS.md` `run()` Guard step updated.
- [ ] Root `AGENTS.md` Packages table has the `ssr` row.

### Boundary guardrails
- [ ] **core untouched** — `git diff packages/core` empty.
- [ ] **ssr has ZERO runtime imports from `@hellajs/*`**.
- [ ] **css is NOT modified by this plan** — css changes live in `plans/css/code/platform-return.md`.

### Verification gates
- [ ] `bun bundle ssr` succeeds.
- [ ] `bun coverage ssr` green.
- [ ] `bun coverage resource` green.
- [ ] No existing resource/dom/core test breaks.
