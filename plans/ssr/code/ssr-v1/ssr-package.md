---
depends_on: [dom-ssr-meta]
---
# [x] Unit 2 — @hellajs/ssr package + resource hasWindow guard

## Scope

- **Gap:** no SSR story — the site states "Server-side rendering is not currently supported." Target state: `ssr(node): string` in a new `@hellajs/ssr` package walks a HellaNode AST to an HTML string with **zero runtime imports** from `@hellajs/*`; `resource.run()` no-ops on the server.
- **Surface: yes** — new public symbol `ssr` (the only new export in the whole set); new package `@hellajs/ssr`; new learn/reference/concepts/patterns docs; root AGENTS Packages table gains a row.
- **Type:** Code + Tests + Docs (atomic — Surface:yes).
- **Depends on:** [`dom-ssr-meta.md`](./dom-ssr-meta.md) — scenarios 8–13 read `ssr`; ssr tests import the rebuilt `@hellajs/dom/bundle`. `bun coverage ssr` is red without it.

## Architecture

- **Pure stringifier.** `ssr(node)` is the recursive walker → string (consolidated to one file post-audit; see amendment). Zero runtime imports from `@hellajs/*`; only `import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom"` (erased). No try/catch — walk failures propagate to the caller (scenario 14).
- **Serialization reimplemented, not imported.** `renderProp`/`toText`/`resolveValue` are dom-internal (not re-exported). `internal/serialize.ts` mirrors `renderProp`'s rules as string emission (~15 lines). `resolveValue` is a local one-liner (`isFunction(v) ? v() : v`). `walk.ts` keeps a `VOID` set (input/img/br/…) → emit `<tag ...>` with no closing tag, matching the DOM (which has no child nodes for void elements) and keeping output hydration-correct. **Errors propagate, not swallow:** unlike `component()` (which catches render-body errors → empty fragment), `walk` has no try/catch, and child/bind/`use` getters run directly — so a throwing getter surfaces to the caller (scenario 14).
- **Client enhancement model (v1, no hydrate).** Shipped HTML is the source of truth on the client: `$ref`/`$collection` bind existing nodes; `mount(Island, "#empty-slot")` mounts into an empty placeholder. Full-tree `mount(app(), "#server-rendered")` is a **footgun** — `mountNode`→`container.replaceChildren` (`packages/dom/lib/mount.ts:59`) wipes server HTML. Named in `### Important Considerations`. Hydration direction not pre-committed (`../hydration-design.md`).
- **ssr/css independence.** ssr does NOT import `@hellajs/css`. The caller composes: `css()` for text (per `plans/css/code/platform-return.md`), `ssr()` for HTML, assembled in the handler.
- **resource guard is process-static.** On the server, resource never fetches. resource is a reactive UI primitive; background server-side data work uses direct `fetch()`.

## [x] Code

### New package: `packages/ssr/`

| File | Purpose |
|---|---|
| `packages/ssr/package.json` | `@hellajs/ssr`. `peerDependencies`: `@hellajs/dom` ONLY (the `SsrMeta`/`HellaNode` imports are type-only, but dom owns the AST + descriptor shape, so version alignment is declared). css/resource/core are NOT peerDeps — ssr never imports them. Exports `.` and `./bundle` — copy the `exports`/`files`/`repository`/`publishConfig` shape from `packages/resource/package.json`. |
| `packages/ssr/tsconfig.json` | `{ "extends": "../../tsconfig.base.json", "include": ["./lib/**/*.ts", "lib/index.ts"] }` — copy `packages/resource/tsconfig.json`. |
| `packages/ssr/lib/index.ts` | Pure barrel: `export { ssr } from "./ssr";` (no logic, no type export — per `guides/code.md` index.ts rules). |
| `packages/ssr/lib/ssr.ts` | **The whole package** (post-audit consolidation — see amendment). `ssr(node)` is the recursive node walker (the only export) + co-located helpers: `walkChild` (child dispatcher; inlined isDynamic `ssr` switch + interpolation-escape), `walkChildren`, `serializeProp`/`escapeText` (mirror `renderProp`), `resolveValue`. No css import. No try/catch. No `internal/`. |

### resource: internal `hasWindow` guard (no new files, no new exports)

| File | Anchor | Change |
|---|---|---|
| `packages/resource/lib/resource.ts` | line 1 import; `run(force, manual)` first line (~line 175) | Add `hasWindow` to the `./internal/core` import. Add `if (!hasWindow()) return;` as the **first** statement of `run()` (before the existing `enabled` guard). |

### Delta

```ts
// packages/resource/lib/resource.ts
import { signal, computed, effect, untracked, isFunction, hasWindow } from "./internal/core";
// ...
async function run(force = false, manual = false) {
  if (!hasWindow()) return;                                 // SSR: server-side, no fetch
  if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;
  // ... existing pipeline unchanged
}
```

```ts
// packages/ssr/lib/internal/walk.ts — zero runtime imports from @hellajs/*
import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom";
import { serializeProp, escapeText } from "./serialize";

const resolveValue = (v: unknown): unknown => typeof v === "function" ? (v as () => unknown)() : v;

// HTML void elements — emitted as `<tag ...>` with no closing tag (mirrors the DOM,
// which has no child nodes for these). Required for hydration-correct output.
const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);

/** Normalizes a resolved value for text — mirrors dom's `toText` (false/null/undefined → ""). */
const toText = (value: unknown): string =>
  value === false || value === null || value === undefined ? "" : `${value}`;

/** Renders an already-resolved interpolation value: HellaNodes walked, all else escaped via toText. */
function walkInterpolated(value: unknown): string {
  if (value !== null && typeof value === "object" && (value as HellaNode).tag !== undefined) return walk(value as HellaNode);
  return escapeText(toText(value));
}

function walkChild(child: HellaChild): string {
  if (child === null || child === undefined || child === false) return "";
  if (typeof child === "string") return child;                       // static template text — raw
  if (typeof child === "number") return escapeText(`${child}`);
  if (typeof child === "function") {
    if ((child as DynamicFn).isDynamic) return walkDynamic(child as DynamicFn);
    return walkInterpolated(resolveValue(child));                    // reactive text — resolve + escape
  }
  if (typeof child === "object" && (child as HellaNode).tag !== undefined) return walk(child as HellaNode);
  return "";                                                          // true / DOM Node / unknown — nothing in v1
}

function walkDynamic(fn: DynamicFn): string {
  const meta = fn.ssr;
  if (!meta) return "";                                               // user-authored isDynamic fn — nothing
  const p = meta.props as Record<string, unknown>;               // SsrMeta.props is `object`; cast to index
  switch (meta.kind) {
    case "forEach": {
      const arr = (resolveValue(p.each) as unknown[]) ?? [];
      const use = p.use as (item: unknown, index: number) => HellaChild;
      let out = ""; let i = 0;
      while (i < arr.length) { out += walkChild(use(arr[i]!, i)); i++; }
      return out;
    }
    case "transition":
      return resolveValue(p.show) ? walkChild(p.children as HellaChild) : "";
    case "portal":
      return "";
    case "lazy":
      return p.loading !== undefined ? walkChild(p.loading as HellaChild) : "";
  }
}

export function walk(node: HellaNode): string {
  if (node === null || node === undefined) return "";
  const tag = (node as HellaNode).tag;
  if (tag === "$") {                                                  // fragment — concatenate, no markers
    let out = ""; if (node.children) for (const c of node.children) out += walkChild(c);
    return out;
  }
  let open = `<${tag}`;
  if (node.props) for (const key in node.props) open += serializeProp(key, (node.props as Record<string, unknown>)[key]);
  if (node.bind) for (const key in node.bind) open += serializeProp(key, resolveValue((node.bind as Record<string, unknown>)[key]));  // bind: initial value
  // on:/e:/hooks/error: are DOM/runtime-only — not emitted
  if (VOID.has(tag as string)) return open + ">";              // void element — no body, no closing tag
  open += ">";
  let body = "";
  if (node.children) for (const c of node.children) body += walkChild(c);
  return open + body + `</${tag}>`;
}
```

(`DynamicFn` is a local structural interface `{ isDynamic?: true; ssr?: SsrMeta }` — avoids importing the runtime `RenderFn`; `walkDynamic` dispatches on `meta.kind` with an exhaustive switch, no trailing return.)

```ts
// packages/ssr/lib/internal/serialize.ts — mirrors dom renderProp's ATTRIBUTE-EMISSION
// rules as string output. NOTE: renderProp's DIRECT_PROPS (value/checked/selected/
// innerHTML) special-case sets the DOM IDL property (`.checked = ""` coerces to false);
// it is intentionally NOT mirrored here — emitting `checked=""` would mean CHECKED in
// HTML. The generic rules below produce correct HTML for every case (falsy → omit).
export function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function serializeProp(key: string, value: unknown): string {
  const isFalsy = value === false || value === null || value === undefined;
  if (isFalsy) return "";                          // omit (renderProp removeAttribute equivalent)
  if (value === true) return ` ${key}`;            // boolean attribute (renderProp setAttribute(key,"") equivalent)
  if (Array.isArray(value)) {                      // class lists — renderProp joins filtering falsy
    const joined = value.filter(Boolean).join(" ");
    return joined ? ` ${key}="${escapeText(joined)}"` : "";
  }
  return ` ${key}="${escapeText(`${value}`)}"`;    // generic value (covers value/innerHTML strings)
}
```

**Runnable usage — plain HTML (no css):**
```ts
import { ssr } from "@hellajs/ssr";
import { html } from "@hellajs/dom";
const body = ssr(html`<div><h1>Hello</h1><p>World</p></div>`);
// body: "<div><h1>Hello</h1><p>World</p></div>"
```
**Runnable usage — styled SSR (css platform-dependent return, per `plans/css/code/platform-return.md`):**
```ts
import { ssr } from "@hellajs/ssr";
import { html } from "@hellajs/dom";
import { css } from "@hellajs/css";
const btnCss = css({ color: "red" }, { name: "btn" });  // server: ".btn{color:red}"
const body = ssr(html`<button class="btn">Click</button>`);
const page = `<!DOCTYPE html><html><head><style>${btnCss}</style></head><body><div id="app">${body}</div></body></html>`;
```

**DoD:**

- [x] `packages/ssr/package.json` exists with peerDeps on `@hellajs/dom` ONLY; `.`/`./bundle` exports matching `packages/resource/package.json` shape.
- [x] `packages/ssr/tsconfig.json` extends `tsconfig.base.json`.
- [x] `packages/ssr/lib/index.ts` is a pure barrel: `export { ssr } from "./ssr";`.
- [x] `packages/ssr/lib/ssr.ts` is the recursive walker (`ssr` → string, NO css import, NO try/catch) — no `walk` indirection.
- [x] ~~`packages/ssr/lib/internal/{walk,serialize}.ts`~~ — **superseded by the audit amendment**: consolidated into `lib/ssr.ts` (one file, no `internal/`). `serializeProp`/`escapeText` mirror `renderProp`.
- [x] **`packages/ssr/lib/` has ZERO runtime imports from `@hellajs/*`** — both `@hellajs/dom` imports are `import type` (erased); `dist/bundle.js` grep confirms none.
- [x] `packages/resource/lib/resource.ts`: `hasWindow` imported from `./internal/core`; `run()` has `if (!hasWindow()) return;` as its first statement.

## [x] Tests

**File 1: `packages/ssr/tests/ssr.test.ts`** (surface: `ssr`)

```ts
import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
```
No `beforeEach(resetTestState())` — `ssr` walks pure data and touches no shared mutable state (guide: skip for such files). `describe("ssr")`. One `test()` per scenario:

1. static node → exact HTML → `test("renders static node to exact HTML", () => { expect(ssr(html\`<div>hi</div>\`)).toBe("<div>hi</div>"); })`
2. returns a string → `test("returns an HTML string", () => { expect(typeof ssr(html\`<div></div>\`)).toBe("string"); })`
3. reactive signal child inlined → `test("inlines current signal value into the HTML", () => { const c = signal(5); expect(ssr(html\`<p>${c}</p>\`)).toBe("<p>5</p>"); })`
4. `bind:` renders initial value → `test("renders bind directive's initial signal value as an attribute", () => { const v = signal("x"); expect(ssr(html\`<input bind:value=${v} />\`)).toBe('<input value="x">'); })`
5. fragment concatenates without markers → `test("concatenates fragment children without fragment markers", () => { expect(ssr(html\`<a/><b/>\`)).toBe("<a></a><b></b>"); })`
6. text escaping → `test("escapes interpolated text (<, >, &, \")", () => { const c = signal('<b>&"x'); expect(ssr(html\`<p>${c}</p>\`)).toBe("<p>&lt;b&gt;&amp;&quot;x</p>"); })`
7. attribute escaping → `test("escapes attribute values", () => { expect(ssr(html\`<div title=${'a"&<b'} />\` as HellaNode)).toBe('<div title="a&quot;&amp;&lt;b"></div>'); })` *(static value — a signal in a static prop wouldn't resolve; mirrors renderProp; reactive attrs use `bind:`)*
8. ForEach renders items in order → `test("renders each ForEach item in array order", () => { const node = html\`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html\`<li>${n}</li>\`} /></ul>\` as HellaNode; expect(ssr(node)).toBe("<ul><li>1</li><li>2</li><li>3</li></ul>"); })`
9. Transition show=true renders child → `test("renders Transition child when show is true", () => { const node = html\`<div><${Transition} show=${true}>${html\`<p>on</p>\`}</${Transition}></div>\` as HellaNode; expect(ssr(node)).toBe("<div><p>on</p></div>"); })`
10. Transition show=false renders nothing → `test("renders nothing when Transition show is false", () => { ... show=${false} ... expect ... "<div></div>" })`
11. Portal renders nothing, no throw → `test("renders nothing for Portal and does not throw", () => { const node = html\`<div><${Portal} to="#x">${html\`<p>p</p>\`}</${Portal}></div>\` as HellaNode; expect(ssr(node)).toBe("<div></div>"); })`
12. Lazy renders loading fallback, no throw → `test("renders Lazy loading fallback without awaiting the loader", () => { const loader = mock(async () => html\`<div/>\`); const node = html\`<div><${Lazy} loader=${loader} loading=${html\`<span>…</span>\`} /></div>\` as HellaNode; expect(ssr(node)).toBe("<div><span>…</span></div>"); expect(loader).not.toHaveBeenCalled(); })`
13. component fn walked → `test("renders a component function's returned AST", () => { const Card = (props: { title: string }) => html\`<section><h1>${props.title}</h1></section>\` as HellaNode; expect(ssr(html\`<div><${Card} title="Hi"/></div>\` as HellaNode)).toBe("<div><section><h1>Hi</h1></section></div>"); })`  *(component() expands at template time → plain HellaNode recursion; no `ssr` involved.)*
14. walk failure propagates → `test("propagates walk errors to the caller", () => { const bad = () => { throw new Error("boom"); }; expect(() => ssr(html\`<p>${bad}</p>\` as HellaNode)).toThrow(); })` *(no try/catch in ssr; a throwing child getter surfaces. NOTE: a throwing **component** does NOT propagate — `component()` (`packages/dom/lib/component.ts`) catches render errors and returns an empty fragment; so the failure must come from a child getter / bind getter / `use` fn, which walk calls directly.)*
15. void element has no closing tag → `test("renders void elements without a closing tag", () => { expect(ssr(html\`<img src=${"a.jpg"} />\` as HellaNode)).toBe('<img src="a.jpg">'); })`
16. boolean true → bare attribute → `test("renders boolean true as a bare attribute", () => { expect(ssr(html\`<input disabled=${true} />\` as HellaNode)).toBe("<input disabled>"); })`
17. array attribute → space-joined → `test("joins array attribute values with spaces", () => { expect(ssr(html\`<div class=${["a", "b"]} />\` as HellaNode)).toBe('<div class="a b"></div>'); })`
18. falsy attribute → omitted → `test("omits falsy attributes", () => { expect(ssr(html\`<div class=${false} id=${undefined} />\` as HellaNode)).toBe("<div></div>"); })`
19. Lazy without loading → nothing → `test("renders nothing when Lazy has no loading fallback", () => { const node = html\`<div><${Lazy} loader=${mock(async () => html\`<div/>\`)} /></div>\` as HellaNode; expect(ssr(node)).toBe("<div></div>"); })`
20. untagged isDynamic fn → nothing → `test("renders nothing for an isDynamic function without ssr", () => { const fn = (() => {}) as unknown as { isDynamic?: true }; fn.isDynamic = true; expect(ssr(html\`<div>${fn}</div>\` as HellaNode)).toBe("<div></div>"); })` *(documents the contract: a hand-rolled isDynamic fn with no `ssr` renders as nothing rather than throwing.)*
21. reactive child returns a HellaNode → `test("renders a HellaNode returned by a reactive child", () => { const subtree = signal(html\`<p>on</p>\` as HellaNode); expect(ssr(html\`<div>${subtree}</div>\` as HellaNode)).toBe("<div><p>on</p></div>"); })` *(covers `walkInterpolated`'s HellaNode branch — a reactive conditional subtree.)*
22. reactive child returns a non-HellaNode value → `test("stringifies a reactive child's non-HellaNode value via toText", () => { const obj = signal({ notag: true } as unknown as HellaNode); expect(ssr(html\`<div>${obj}</div>\` as HellaNode)).toBe("<div>[object Object]</div>"); })` *(mirrors dom's `toText` — a non-HellaNode object stringifies rather than rendering nothing.)*
23. static boolean true child → nothing → `test("renders nothing for a static boolean true child", () => { expect(ssr(html\`<div>${true}</div>\` as HellaNode)).toBe("<div></div>"); })` *(covers `walkChild`'s final fallthrough — dom appends nothing for a static `true` child.)*

*Note: the exact JSX-in-template syntax for embedding `ForEach`/`Transition`/etc. follows `packages/dom/tests/foreach.test.ts` (`<${n} each=${...} use=${...} />`). Worker confirms the working syntax against the dom test suite and adjusts the test bodies if the parser shape differs; the asserted OUTPUT strings are the contract.*

**File 2: `packages/resource/tests/ssr-mode.test.ts`** (surface: `ssr-mode`)

```ts
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";
```
Saves/restores `globalThis.window`. Scenario 1 patches inline with try/finally (the patched-global rule in `guides/tests.md`); window is present (HappyDOM) by default for scenario 2, so no patching there.

1. no fetch when window unset → `test("does not call the fetcher when window is undefined", () => { const saved = globalThis.window; globalThis.window = undefined as unknown as typeof window; try { const fetcher = mock(async () => 1); const r = resource(fetcher); r.fetch(); expect(fetcher).not.toHaveBeenCalled(); } finally { globalThis.window = saved; } })`
2. fetch when window present → `test("calls the fetcher normally when window is present", async () => { const fetcher = mock(async () => 1); const r = resource(fetcher); r.fetch(); await delay(); expect(fetcher).toHaveBeenCalled(); })` *(window is present under HappyDOM — the default; no patching.)*

**DoD:**

- [x] `packages/ssr/tests/ssr.test.ts` exists, surface-named, import order correct (incl. `ForEach`/`Transition`/`Portal`/`Lazy` from `@hellajs/dom/bundle`); NO `beforeEach(resetTestState())` — `ssr` walks pure data, zero shared mutable state (guide: skip).
- [x] All File-1 scenarios pass (1–23; +3 coverage scenarios for `walkInterpolated`/`walkChild` branches; scenario 7 uses a static string — a signal in a static prop wouldn't resolve, mirrors `renderProp`). — `bun coverage ssr`: 23 pass / 0 fail.
- [x] `packages/resource/tests/ssr-mode.test.ts` exists; scenario 1 patches `globalThis.window` inline with try/finally. — 2 pass / 0 fail.
- [x] `bun coverage ssr` green — EXIT 0; 100/100 coverage.
- [x] `bun coverage resource` green — EXIT 0; 190 pass (188 + 2), coverage at baseline.

## [x] Docs

| File | Change |
|---|---|
| `packages/ssr/docs/index.mdx` | New. Index Doc per `guides/docs.md` §Index Docs: `## @hellajs/ssr`, Installation, Example (plain HTML + styled), API bullet linking `[/reference/ssr/ssr]`. |
| `packages/ssr/docs/api/ssr.mdx` | New. Function Doc per `guides/docs.md` §Function & Prefix Docs: `# ssr`; `## API` (`function ssr(node: HellaNode): string`); `## Basic Usage` (plain HTML + styled showing `css()` returning text on server); `## Key Concepts` (`### Zero Runtime Dependencies`, `### Resource Fetching Suppressed`, `### Client Enhancement Model`); `## Important Considerations` (`### Portal renders nothing`, `### Lazy renders the loading fallback`, `### Full re-mount over server HTML wipes it` (cite `packages/dom/lib/mount.ts:59`), `### Synchronous render required`). |
| `packages/ssr/docs/concepts/ssr.mdx` | New. Concept Doc: string-renderer model, zero runtime deps, client enhancement model, sync render discipline, Portal/Lazy server-side behavior, re-mount footgun. Cross-reference [`ssr`](/reference/ssr/ssr). |
| `packages/ssr/docs/patterns/ssr.mdx` | New. Pattern Doc recipes: (1) plain HTML Bun.serve; (2) styled SSR (`css()` returns text on server — see `plans/css/code/platform-return.md`); (3) Express handler; (4) `$ref` enhancement; (5) island `mount(Island, "#empty-slot")`. |
| `docs/src/pages/reference/ssr/ssr.mdx` | New. Website Wrapper per `guides/docs.md` §Website Wrapper Pages. |
| `docs/src/pages/learn/concepts/ssr.mdx` | New. Website Wrapper. |
| `docs/src/pages/learn/patterns/ssr.mdx` | New. Website Wrapper. |
| `docs/astro.config.mjs` | Add `'@ssr/*': '../packages/ssr/docs/*'` to the `alias` block. |
| `docs/src/nav.ts` | Register SSR under Concepts, Patterns, reference. |
| `docs/src/pages/learn/index.mdx` | **Remove the "Server-side rendering is not currently supported" alert** (now false); add Package Overview + Concepts + Patterns bullets. |
| `docs/src/pages/learn/patterns/index.mdx` | Add SSR card. |
| `docs/src/pages/reference/index.mdx` | Add `@hellajs/ssr` section. |
| `packages/resource/docs/api/resource.mdx` | Extend `## Important Considerations` with `### Server-Side Rendering` (resource no-ops on the server via `hasWindow`; use direct `fetch()` for server-side data). |
| `packages/ssr/AGENTS.md` | Package instructions: exports table; architecture (walk-only, zero runtime deps, `ssr` dispatch from Unit 1); gotchas (Portal=nothing, Lazy=loading, sync discipline, no hydrate in v1, **full re-mount over server HTML wipes it** — use `$ref`/`$collection` or empty-slot islands). |
| `packages/ssr/README.md` | Package readme. |
| `packages/resource/AGENTS.md` | `run()` pipeline: insert the `hasWindow()` Guard as step 0 (before the `enabled` Guard); note server-side no-op. |
| Root `AGENTS.md` | Packages table: add the `ssr` row (Reactive HTML stringifier — walks HellaNode → string, zero runtime deps). |

**DoD:**

- [x] `packages/ssr/docs/index.mdx` exists (Index Doc).
- [x] `packages/ssr/docs/api/ssr.mdx` exists (Function Doc with plain HTML + styled examples; all four Important Considerations present).
- [x] `packages/ssr/docs/concepts/ssr.mdx` + `packages/ssr/docs/patterns/ssr.mdx` exist.
- [x] `docs/src/pages/reference/ssr/ssr.mdx` + `learn/concepts/ssr.mdx` + `learn/patterns/ssr.mdx` wrappers exist.
- [x] `docs/astro.config.mjs` has the `'@ssr/*'` alias.
- [x] `docs/src/nav.ts` registers SSR under Concepts, Patterns, reference.
- [x] **The "Server-side rendering is not currently supported" alert is removed** from `docs/src/pages/learn/index.mdx`.
- [x] `docs/src/pages/learn/patterns/index.mdx` + `docs/src/pages/reference/index.mdx` enumerate SSR.
- [x] `packages/resource/docs/api/resource.mdx` has `### Server-Side Rendering`.
- [x] `packages/ssr/AGENTS.md` + `packages/ssr/README.md` written.
- [x] `packages/resource/AGENTS.md` `run()` Guard step updated (now step 1, pipeline renumbered 1–6).
- [x] Root `AGENTS.md` Packages table has the `ssr` row.

## Boundary guardrails (unit-level)

- [x] **core untouched** — `git diff --stat packages/core` empty.
- [x] **css untouched** — `git diff --stat packages/css` empty.
- [x] **dom modifications are confined to Unit 1** — `git diff --stat packages/dom` = ForEach/Lazy/Portal/Transition + types/nodes.d.ts + AGENTS.md only (Unit 1).
- [x] **ssr has ZERO runtime imports from `@hellajs/*`** — `rg "^import \{.*\} from \"@hellajs" packages/ssr/lib` = none; only `import type` (erased).

## Verification gates

- [x] `bun bundle ssr` succeeds. — 1.3KB (0.68KB gzipped); `dist/bundle.js` clean.
- [x] `bun coverage ssr` green. — EXIT 0; 100/100 coverage.
- [x] `bun coverage resource` green. — EXIT 0; coverage at baseline.
- [x] No existing core/dom/resource/css/router/store test breaks. — full `bun coverage`: 1112 pass / 0 fail / EXIT 0.

## Audit amendment (post-execution `brain-audit`)

A `brain-audit` against `guides/code.md` found the originally-planned structure violated several rules; all resolved by consolidating `internal/{walk,serialize}.ts` into `lib/ssr.ts`:

- **Thin wrapper** — `ssr(node) { return walk(node); }` violated "Never create wrapper functions that only call through." `ssr` is now the recursive walker itself.
- **`for…of` / `for…in`** in the walker (children ×2, `props`, `bind`) violated "Cached `while` loops only." Now cached `while` + `Object.keys()`.
- **Single-callsite sub-30-line extractions** (`walkDynamic`, `walkInterpolated`, `toText`) violated "Never extract a function called from exactly one callsite unless it exceeds 30 lines." Inlined into `walkChild`.
- **`internal/` placement** — `walk.ts`/`serialize.ts` are pure, non-state, single-caller-module helpers; none of the four placement criteria (shared / reusable-concept / state-owner / cross-package) are met. Co-located in `lib/ssr.ts`.
- **Top-level `const` arrow** (`resolveValue`) violated "function declarations for top-level named functions." Now a `function`.
- **Missing `@internal`** on `walk`/`escapeText`/`serializeProp` (exported but not re-exported) — moot: they are now module-local in `ssr.ts`.

Re-verified: `bun coverage ssr` 100/100; full `bun coverage` 1112 pass / 0 fail. The Delta code blocks above are the pre-audit sketch; `packages/ssr/lib/ssr.ts` is the source of truth.
