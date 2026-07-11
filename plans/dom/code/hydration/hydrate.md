---
depends_on: []
---

# [x] Add `hydrate()` to @hellajs/dom — surgical hydration of server-rendered HTML

## Scope

- **Gap:** `@hellajs/ssr` ships HTML via [`ssr()`](../../ssr/code/ssr-v1/ssr-package.md), but the only client options are [`$ref`](../../ssr/code/hydration-design.md)/`$collection` (bind individual existing nodes) or `mount(Island, "#slot")` (islands into empty placeholders). There is no way to re-execute the full component tree against the **existing** server DOM — `mount()` wipes it (`packages/dom/lib/mount.ts`, `attach()` → `container.replaceChildren`). A `hydrate()` that attaches effects/handlers/state to the existing server DOM without ever replacing it closes this gap.
- **Surface: yes** — new public export `hydrate` in `@hellajs/dom` (`lib/index.ts`); new internal `HydrateCtx` type threaded into the four isDynamic components. Atomic: Code + Tests + Docs land together.
- **Type:** Code + Tests + Docs.
- **Design reference:** `plans/ssr/code/hydration-design.md` (read as reference only — its "Option C is zero-cost" premise is **false** per source; this plan corrects it below). **Source is truth** for all behavior: `packages/dom/lib/{mount,internal/render,ForEach,Transition,Portal,Lazy}.ts`, `lib/types/nodes.d.ts`, `lib/registry.ts`, `lib/internal/{utils,events,dispatch,cleanup}.ts`.

## Source-grounded correction to the design doc

The design doc's ForEach adoption rests on *"the component tree re-executes on hydrate anyway — Option C's cost is zero."* Reading the components, this is wrong: `ForEach`/`Transition`/`Portal`/`Lazy` each return a closure `fn(parent)` that **hard-codes fresh DOM creation** — `parent.appendChild(anchor)` then first-render `insertBefore(fragment, anchor)` (`ForEach.ts` first-render branch; `Transition.ts`/`Portal.ts`/`Lazy.ts` create their own anchor + build fresh). Calling `fn(parent)` against server-populated DOM **duplicates** the server nodes. The closures cannot be reused as-is.

**Resolution (chosen here, from source):** add a **hydrate-mode** branch to the adoption-relevant components. The hydrate walker pre-computes a region's existing DOM nodes + extent, pushes a `HydrateCtx` onto a module-level stack in `render.ts`, and calls `fn(parent)`; the component's first-render reads the ctx via `peekHydrateContext()` and **adopts** the existing nodes into its own `keyToNode`/`keyToItem`/`currentKeys` (ForEach) or `current` (Transition) instead of building fresh. The **update path is unchanged** — it already operates on those collections, now seeded from adopted nodes. This keeps ONE source of truth for key resolution + LIS (rejected: re-implementing ForEach's ~100-line update path in the walker — guaranteed drift; rejected: never adopting lists — defeats the feature's purpose).

Other design-doc claims, re-verified against source and retained: warn + subtree-replace on mismatch (consistent with `dispatch.ts` never hard-throwing); CSS needs no hydrate handling (server `<style>` vs client `<style id="hella-css">` are separate elements); no serializer enrichment required for **element-bounded structure** (see the coalescing caveat below).

## Scope — Option A (text-coalescing fork, resolved during execution)

Empirically confirmed against the bundles: `ssr()` **coalesces** adjacent text (static + resolved-reactive) into one string (`packages/ssr/lib/ssr.ts` `walkChildren` concatenates `walkChild` results with no separator), while `mount()` appends a **separate** `createTextNode` per child plus a persistent `createTextNode("")` anchor per reactive child (`packages/dom/lib/internal/render.ts` `appendToParent`). Measured: `ssr(html\`<div>a${sig}b</div>\`)` → one `TEXT("axb")` node after parse; `mount` → four nodes (`TEXT("a"),TEXT("x"),TEXT(""),TEXT("b")`). So the serialization contract is **violated for reactive text adjacent to static text** (no element boundary between them). Element-bounded structure, signal-alone-in-element, and **ForEach-of-elements** (the headline value) are unaffected — elements don't coalesce.

**Resolution (Option A — approved):** hydrate **adopts** static element subtrees, ForEach-element items, and element-resolving/element-bounded signals (reliable; server DOM preserved); it **rebuilds** coalesced text runs (reactive-text adjacent to static text) by removing the one merged server text node and re-mounting that local run fresh with proper anchors (correct output; cosmetic recreation of leaf text). No `ssr`/`mount` contract change; no breaking change to shipped v1.

## [x] Code

### 1. `packages/dom/lib/hydrate.ts` (NEW) — public entry

**Anchor:** new file alongside `mount.ts`; one public export `hydrate` (filename = export, per `guides/code.md`).

**Delta:**
```typescript
function hydrate(
  hellaNode: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  target?: string | Element
): MountHandle
```
- `hellaNode`: the **same** node passed to `ssr()` on the server (the component tree to re-execute).
- `target`: CSS selector or `Element`; defaults to `"#app"`. Its existing childNodes are the server output.
- **Returns:** `MountHandle` (`{ container, flush, unmount }`) — identical shape to `mount`.
- **Throws:** `[dom] hydrate: target "<target>" not found in document` (public-input validation per `guides/code.md` Error Handling).
- Runnable usage (seeds the Docs example):
  ```typescript
  // Server
  const body = ssr(html`<${App} />`);
  // page: <div id="app">${body}</div>
  // Client — re-execute App against the existing DOM, never replacing it
  const handle = hydrate(html`<${App} />`, "#app");
  handle.flush(); // fire deferred afterMount hooks before first paint
  ```

**Behavior:** mirror `mount.ts`'s resolve + sync/async shape (`resolveValue`; if thenable, defer `attach` via `.then`, route rejection through `dispatchError(err, { phase: "mount" })`). `attach` differs from mount in exactly one way: **no `container.replaceChildren`** — instead hydrate the resolved node against `container`'s existing childNodes. Resolved fragment (`tag: "$"`) or multiple children → `hydrateChildren(container, node.children)`; single element → `hydrateNode(node, container.firstChild)`. Then `registerContainer(container)` (starts the shared scoped observer for cleanup), set `getState(root).isMounted = true`, return the MountHandle (same `flush`/`unmount` as `mount`).

**Strategy:** clone the `mount.ts` control-flow skeleton (resolve → async-detect → attach → return handle) rather than abstracting a shared `mountOrHydrate` — hydrate is cold, `mount` is the hot entry, and entangling them risks the hot path (`guides/code.md` Decision Precedence: Performance). The only divergence is the attach step; keep them structurally parallel, not coupled.

- [x] `hydrate` exported from `lib/hydrate.ts` + `lib/index.ts` — `rg 'hydrate' packages/dom/lib/index.ts` shows `export { hydrate } from "./hydrate"`.
- [x] Sync `attach` against `container`'s existing children (no `replaceChildren`) — `lib/hydrate.ts` `attach()`; "preserves server DOM across hydrate" test passes (childNodes unchanged).
- [x] Async component (thenable) → defers `attach` via `.then`, routes rejection through `dispatchError({ phase: "mount" })` — "attaches an async component" + "routes an async component rejection through onError" tests pass.
- [x] Throws `[dom] hydrate: target "<target>" not found in document` — "throws on a missing target selector" test passes.
- [x] Defaults `target` to `"#app"`; `MountHandle.flush()` fires `afterMount`, `unmount()` cleans up — "returns a MountHandle…" test passes.
- [x] Calls `registerContainer(container)` + sets root `isMounted = true` — `lib/hydrate.ts` `attach()`; lifecycle parity verified by the flush test.

### 2. `packages/dom/lib/internal/hydrate.ts` (NEW) + `render.ts` (export 2 helpers) — the walker

**Anchor:** new internal functions `hydrateNode` + `hydrateChildren` + the `HydrateCtx` stack, added alongside `mountNode`/`appendToParent`/`resolveNode` (not a refactor of them). Also add `peekHydrateContext`/`pushHydrateContext`/`popHydrateContext`.

**Delta — `hydrateNode(node, existingEl, boundaryElement?)`:** mirrors `mountNode`'s step order (`render.ts` `mountNode`), diverging at create vs. use and at props:
1. `__static` fast-path → assert `existingEl.tagName === node.tag.toUpperCase()`, return (nothing to attach — `__static` nodes carry no `on`/`e`/`bind`/`hooks`, per `packages/dom/AGENTS.md`; advance is the caller's job).
2. Assert `existingEl.tagName === node.tag.toUpperCase()`; on mismatch → `console.warn("[dom] hydrate mismatch: …")` and return `mountNode(node, boundaryElement)` (subtree-replace — the node is brand-new, siblings already advanced by caller).
3. Copy `__scope` → `state.componentScope`, `error` → `state.errorConfig` + `state.originalNode`; set `currentBoundary = error ? existingEl : boundaryElement` (same as `mountNode`).
4. Register hooks; run `beforeMount` (errors caught, `phase: "mount"`, no fallback — same as `mountNode`).
5. **SKIP `props`** (server already applied via `ssr()`'s `serializeProp`; re-applying is wasteful and `DIRECT_PROPS` IDL writes could diverge from the attribute form).
6. Register `on:` (`setNodeHandler`), `e:` (`setDirectHandler`), `bind:` (`registry.addEffect`, errors `phase: "update"`) against `existingEl` — identical registration to `mountNode`, just targeted at the existing element.
7. `hydrateChildren(existingEl, node.children, currentBoundary)`.

**Delta — `hydrateChildren(parent, children, boundaryElement)`:** parallel-walk `children` against `parent.childNodes` via a DOM **cursor** (index into existing childNodes). Per AST child:
- **string / primitive** → consume the matching text at the cursor (advance 1; for a single-string-only parent the server used `textContent`, so the whole text is one node — match it).
- **HellaNode** → `hydrateNode(child, parent.childNodes[cursor], boundaryElement)`; advance 1.
- **non-dynamic function/signal child** → **resolve it** to classify. If it resolves to an `isHellaNode` element (tag !== `"$"`), the server rendered a separate element node → **adopt** it (insert anchor after the element, register the effect seeded with the existing element as first render, advance the pointer past element + anchor). Otherwise it resolves to **text/fragment** → it coalesces with adjacent static text into one server text node → the walker groups it with its surrounding static-text siblings into a **text run** bounded by elements/fragments/isDynamic; the whole run = one server text node. If the run contains any reactive child → **rebuild** it (remove the one merged server text node, re-mount the run's static text + reactive children fresh via the standard anchor+effect setup, mirroring `appendToParent`); if the run is all-static → just consume the one text node (it is already correct).
- **isDynamic child** (`ForEach`/`Transition`/`Portal`/`Lazy`) → dispatch per kind (see below), then advance the cursor by the region's adopted/re-mounted extent.

**isDynamic dispatch (extent seeded by re-running the same values the server used):**
- **ForEach** → `resolveValue(each)` → `items`; extent = `items.length`. Count-mismatch (fewer remaining DOM nodes than `items.length`) → warn + re-mount: remove the available nodes, `pop`/no-ctx, call `fn(parent)`. Else push a `HydrateCtx` carrying the `items.length` existing nodes at the cursor + a `hydrateNode` recursion ref, call `fn(parent)`, pop. (ForEach's first-render reads the ctx and adopts.)
- **Transition** → `resolveValue(show)` → visible? extent = visible ? (child node count) : 0. If visible, push ctx carrying the existing child node(s); call `fn(parent)` (Transition adopts as `current`). If hidden, just insert the anchor (call `fn(parent)` with empty extent).
- **Portal** → server rendered nothing in-place (`ssr.ts` portal → `""`); extent = 0. Call `fn(parent)` unchanged — it re-mounts content into the remote target (server left the target empty, so no duplication).
- **Lazy** → server rendered `loading` if present (`ssr.ts` lazy); extent = `props.loading ? 1 : 0`. Remove the server loading node if present, then call `fn(parent)` (re-runs the loader; adoption of the transient loading node is cosmetic and skipped).

**Strategy:** keep `hydrateNode`/`hydrateChildren` structurally parallel to `mountNode`/`appendToParent` but **separate** — do not parameterize `mountNode` with a hydrate flag (the mount path is hot and branch-free today; a flag re-introduces per-node checks). Reuse the shared helpers (`getState`, `registry.addEffect`, `setNodeHandler`/`setDirectHandler`, `dispatchError`, `cleanupSubtree`) verbatim. The pointer/text-run walk is the only genuinely new logic. Use a DOM node **pointer** (`current`), not a numeric cursor, so anchor insertions don't shift indices. Coalesced-text runs are rebuilt (Option A above) rather than splitting a merged text node. Fragment children (tag `"$"`) hydrate inline against the same parent's DOM stream — recurse `hydrateChildren`, continuing the pointer.

- [x] `hydrateNode(node, existing, boundary?)` in `lib/internal/hydrate.ts`; asserts tag match (case-insensitive), copies scope/error, registers hooks, runs `beforeMount`, skips `props`, registers `on:`/`e:`/`bind:` against `existing`, recurses via `hydrateSequence` — verified by bind/on/e/hook tests.
- [x] `__static` fast-path returns after asserting tag; falls through to re-mount when the static element is missing — "hydrates a static subtree" + "warns and re-mounts when a server element is missing" tests.
- [x] Tag mismatch → `console.warn("[dom] hydrate mismatch…")` + `replaceMismatch` (`mountNode` subtree-replace) — "warns and subtree-replaces on a tag mismatch" test.
- [x] `hydrateSequence` (the cursor/pointer walk) advances the pointer for string/primitive/HellaNode/signal/isDynamic children — covered by the fragment, nested-structure, signal-text, conditional, and coalesced-text tests.
- [x] Reactive child → element: rebuilt in place; reactive child → text: coalesced run removed + re-mounted fresh; all-static runs consume the one text node; siblings preserved — "element-bounded signal text child", "conditional signal child", "rebuilds a coalesced text run", "renders a reactive fragment toggled from null" tests.
- [x] ForEach dispatch: extent = `resolveValue(each).length`; count-mismatch → warn + re-mount; else adopts via pushed `HydrateCtx` — "adopts keyed items…" + "falls back to re-mount on a ForEach count-mismatch" tests.
- [x] Transition dispatch: extent from `resolveValue(show)`; visible → adopt existing child via ctx — "adopts a Transition child when show is true" + "applies the appear class on hydrate" tests.
- [x] Portal dispatch: extent 0; `fn(parent)` re-mounts into target — "re-mounts a Portal into its target on hydrate" test.
- [x] Lazy dispatch: extent = `loading ? 1 : 0`; removes server loading node, `fn(parent)` re-runs loader — "re-runs a Lazy loader and drops the server loading node" test.
- [x] `peekHydrateContext`/`push`/`pop` (module-level stack) + `resetHydrateState` (wired into `resetDom`) — reentrancy verified by "adopts nested ForEach regions" test.
- [x] No change to `mountNode`/`appendToParent`/`resolveNode` behavior — `bun coverage dom` 301 pass / 0 fail; existing foreach/transition/mount tests unchanged.

### 3. `packages/dom/lib/ForEach.ts` (EXTEND) — hydrate-mode first-render

**Anchor:** the closure body's first-render branch (`if (currentKeys.length === 0)`), before the `fragment`/`resolveNode`/`insertBefore` build.

**Delta:** at the top of the first-render branch, `const hctx = peekHydrateContext()`. If `hctx`: for each item, **adopt** `hctx.existingNodes[index]` instead of `resolveNode(use(item, index))` — compute the key (identical logic to the existing first-render key block), `keyToNode.set(key, existingNode)`, `keyToItem.set(key, item)`, `currentKeys.push(key)`, and recurse `hctx.hydrateNode(use(item, index), existingNode)`. Skip the `fragment`/`insertBefore`. The anchor is inserted at the cursor position (the walker pre-positioned it, or append after the last adopted node — coordinate with the walker's cursor advance). If no ctx: existing fresh-build path unchanged.

**Strategy:** the adoption branch reuses the **existing key-resolution lines verbatim** (the `element.props?.key ?? item.id ?? index` logic) — do not duplicate it. The LIS update path (every non-first-render branch) is untouched: it reads `keyToNode`, now seeded from adopted nodes, so subsequent signal pushes/removals reconcile against the adopted DOM exactly as against freshly-built DOM. This is the single riskiest change (ForEach is performance-critical); existing `foreach.test.ts` guards the mount path stays green.

- [x] First-render branch reads `peekHydrateContext()`; when present, adopts `existingNodes[index]` into `keyToNode`/`keyToItem`/`currentKeys` and recurses `hydrateNode` into each (no `fragment`/`resolveNode`) — `lib/ForEach.ts` adoption branch; "adopts keyed items…" + "adopts index-keyed items by position" + "adopts nested ForEach regions" tests.
- [x] Key resolution in the adoption branch is the **same** logic as mount first-render (same `props.key ?? item.id ?? index` line) — verified in `lib/ForEach.ts`.
- [x] No ctx (mount path) → byte-identical behavior — existing `foreach.test.ts` (15 tests) passes unchanged.
- [x] Subsequent updates reconcile against adopted nodes via the unchanged LIS path — "pushing a 4th item" + "removing item 2" assertions in the keyed-adoption test.

### 4. `packages/dom/lib/Transition.ts` (EXTEND) — hydrate-mode

**Anchor:** the effect's enter branch (`if (isVisible) { … if (current) return; current = resolveNode(children, parent); … }`).

**Delta:** in the enter branch, if `peekHydrateContext()` is present and supplies an existing child node, set `current = hctx.existingNode` (recurse `hydrateNode(children, existingNode)`) **without** re-resolving/re-inserting, then apply the `enter`/`appear` class per the existing `isFirstRender`/`appear` logic (hydrate's first render == mount's first render for class purposes). Leave/`leaveTimer` paths unchanged.

**Strategy:** Transition's child is a single `HellaChild`; adoption is the single-node case of ForEach's adoption. Keep the change minimal — only the enter branch's initial `current =` assignment diverges.

- [x] Enter branch, when ctx supplies an existing node, adopts it as `current` (recurse `hydrateNode`) instead of `resolveNode` + `insertBefore` — `lib/Transition.ts` hydrate branch; "adopts a Transition child…" test.
- [x] `enter`/`appear` class application honors existing `isFirstRender`/`appear` semantics on hydrate — "applies the appear class on hydrate when show is true" test.
- [x] No ctx (mount path) → byte-identical behavior — existing `transition.test.ts` passes unchanged.

### 5. `packages/dom/lib/internal/hydrate.ts` — `HydrateCtx` type (internal)

**Anchor:** near `RenderFn`/`SsrMeta`.

**Delta:** add the `HydrateCtx` interface. **Visibility decision:** it is threaded through `peekHydrateContext()` (module-level stack in `render.ts`), so `RenderFn`'s public signature stays `((element: HellaElement) => void) & { isDynamic: true; ssr?: SsrMeta }` — **unchanged** (no new param leaks into the public type). Therefore `HydrateCtx` is an **internal** type: co-locate it in `render.ts` (the owner) with `@internal` JSDoc, imported type-only by `ForEach.ts`/`Transition.ts`. Do **not** place it in `nodes.d.ts` — `export type *` would promote it to the public surface, and `@internal` inside a wholesale-exported `.d.ts` is decorative/contradictory per `guides/code.md` Types.

**Strategy:** the stack-indirection (not an explicit `RenderFn` param) is chosen specifically to avoid widening the public surface — `RenderFn` is `JSX.Element`'s intersection member and is read by users. The stack is cold-path (hydration only) and reentrancy-safe via push/pop. Documented fallback if the stack proves awkward in implementation: an explicit optional `ctx?` param on `RenderFn` (then `HydrateCtx` must be promoted to `nodes.d.ts` as a public type — acceptable but noisier).

- [x] `HydrateCtx` interface defined in `lib/internal/hydrate.ts` (internal JSDoc); imported type-only by `ForEach.ts`/`Transition.ts`/`Portal.ts`/`Lazy.ts`. `render.ts` exports `getBoundaryConfig` + `clearRenderedNodes` (`@internal`) for the walker — `rg 'export function (getBoundaryConfig|clearRenderedNodes)' packages/dom/lib/internal/render.ts`.
- [x] `RenderFn` signature in `nodes.d.ts` is **unchanged** — `rg 'RenderFn' packages/dom/lib/types/nodes.d.ts` (no new param; ctx threaded via the stack).
- [x] `bun visibility` passes — "✔️ No @internal types found in wholesale-exported type files".

### 6. `packages/dom/lib/index.ts` (EXTEND) — export

**Anchor:** the value re-export block near `export { mount } from "./mount"`.

**Delta:** add `export { hydrate } from "./hydrate";`.

- [x] `hydrate` re-exported from `lib/index.ts` — `export { hydrate } from "./hydrate";` (positioned after `mount`).

## [x] Tests

**Files:** `packages/dom/tests/hydrate.test.ts` (core: entry + walker + static/reactive/signal/mismatch/lifecycle), `packages/dom/tests/hydrate-foreach.test.ts` (ForEach + Transition adoption + nested). Follow `guides/tests.md`: import from `@hellajs/dom/bundle`, reactive primitives from `@hellajs/core`, helpers from `@utils/test-helpers.js`; `mock()` for tracking; `resetTestState()` in `beforeEach`; one inner `describe` per file; present-tense names. Build server HTML by calling `ssr()` from `@hellajs/ssr/bundle` into a container, then `hydrate()` against it.

**Behavioral scenarios** (one `test()` each):

Core (`hydrate.test.ts`):
- attaches a `bind:` effect to an existing server element (signal update reflects; the element node identity is **preserved**, not replaced).
- registers an `on:` delegated handler on an existing element (click fires).
- registers an `e:` direct handler on an existing element.
- skips re-applying static props (server attributes survive hydrate; a `bind:` updates the attribute reactively).
- adopts nested static structure (parent > child > grandchild identities preserved).
- hydrates a signal/function text child (anchor inserted; update reflects; siblings preserved).
- hydrates a conditional signal child (show/hide swaps content through the anchor).
- rebuilds a coalesced text run (`a${signal}b`) — the merged server text node is removed and the run re-mounted with proper anchors; a signal update reflects (siblings preserved).
- hydrates a fragment root (multiple top-level children adopted).
- hydrates a `__static` subtree (structure adopted; no spurious effects).
- throws `[dom] hydrate: target "…" not found in document` on a missing selector.
- warns + subtree-replaces on a tag mismatch (`suppressConsole`; subtree re-mounted, DOM correct).
- returns a `MountHandle` whose `flush()` fires `afterMount` and `unmount()` cleans up.
- attaches an async component (deferred via `.then`; rejection routes through `onError`).
- preserves server DOM across hydrate (container childNodes unchanged by the hydrate call itself — the core invariant vs. `mount`'s `replaceChildren`).
- transfers `hook:` lifecycle (`beforeMount` sync, `afterMount` via `flush`) and component scope on hydrate.

Adoption (`hydrate-foreach.test.ts`):
- adopts 3 keyed server-rendered items (identities preserved, `keyToNode` seeded); pushing a 4th item appends via ForEach reconciliation; removing item 2 cleans up + re-LIS-moves survivors.
- adopts index-keyed items (no explicit key) when item references match.
- adopts nested ForEach (outer items + inner ForEach both adopted).
- falls back to warn + re-mount on ForEach count-mismatch (`suppressConsole`; sublist re-built).
- adopts a Transition child when `show` is true on hydrate; toggling `show` runs leave/enter.
- hydrates a Transition with `show` false (nothing in DOM; toggling enters).
- re-mounts a Portal into its target on hydrate (server rendered nothing in-place).
- re-runs a Lazy loader on hydrate (loading node handled; success renders at anchor).

- [x] Every core scenario is one `test()` in `hydrate.test.ts` (present tense, no "should") — 21 tests across entry/walker/static/reactive/mismatch/lifecycle.
- [x] Every adoption scenario is one `test()` in `hydrate-foreach.test.ts` — 8 tests (keyed/index/nested/mismatch ForEach, Transition ×2 incl. appear, Portal, Lazy-loading).
- [x] Tests build server HTML via a `serverContainer` helper (mount → serialize `innerHTML`, reproduces `ssr()` coalescing) or manual `innerHTML`; `@hellajs/ssr/bundle` not imported (ssr not linked; no lockfile/dep change).
- [x] `mock()` used for all call/identity tracking (no boolean flags or bare counters) — e.g. handler/loader/beforeMount mocks.
- [x] `resetTestState()` in `beforeEach`; one inner `describe` per file.
- [x] `bun coverage dom` green (301 pass / 0 fail); coverage ≥99.4% on new hydrate code (residual uncovered = defensive error-catch blocks + edge paths); existing foreach/transition/mount tests unchanged; `bun coverage ssr` green (23 pass); `bun visibility` clean.

## [x] Docs

**Files:**
- **NEW** `packages/dom/docs/api/hydrate.mdx` — Function doc (`guides/docs.md`): `# hydrate`, one-line desc, `## API` (signature + `MountHandle` cross-ref), `## Basic Usage` (server `ssr()` + client `hydrate()` end-to-end, `js` for html templates / `jsx` for JSX as needed), `## Key Concepts` (`### Adopt, don't re-render`, `### Mismatch handling`, `### mount vs hydrate`), `## Important Considerations` (`### The server HTML must match`, `### Reactive state must initialize to server values`).
- **NEW** `packages/dom/docs/concepts/hydration.mdx` — Concept doc: the re-execute-and-attach model, the serialization contract (server `ssr()` output must match `mountNode`), ForEach adoption (re-run-and-match, no HTML markers), when to choose `hydrate` vs `$ref`/`$collection` islands vs `mount(Island)`. Cross-reference [`ssr`](/reference/ssr/ssr), [`mount`](/reference/dom/mount), [`$ref`](/reference/dom/ref).
- **UPDATE** `packages/dom/docs/index.mdx` — add `**[hydrate](/reference/dom/hydrate)**` to `### API` → Functions; add `**[Hydration](/learn/concepts/hydration)**` to `### Concepts`.
- **UPDATE** `packages/ssr/docs/concepts/ssr.mdx` — `## Client Enhancement`: remove the now-false "v1 has no hydration mode" sentence; add a `hydrate` paragraph cross-referencing [`hydrate`](/reference/dom/hydrate) + [Hydration](/learn/concepts/hydration); keep the `$ref`/`$collection`/island guidance as the alternatives.
- **UPDATE** `packages/ssr/docs/patterns/ssr.mdx` — add a `### Hydrate server-rendered HTML` recipe (server `ssr()` → client `hydrate()`).
- **NEW** `docs/src/pages/reference/dom/hydrate.mdx` — website wrapper (frontmatter `title`/`description`/`layout`, imports `HydrateContent` from `@dom/api/hydrate.mdx`, zero prose).
- **NEW** `docs/src/pages/learn/concepts/hydration.mdx` — website wrapper (imports `HydrationContent` from `@dom/concepts/hydration.mdx`).
- **UPDATE** `docs/src/nav.ts` — add `"Hydration"` to the `Concepts` array; add `"hydrate"` to the `reference.dom` array (keep the existing sorted/cased convention).
- **UPDATE** `docs/src/pages/learn/index.mdx` — add a Hydration concept line to the enumeration; `docs/src/pages/reference/index.mdx` needs no edit (dom section auto-imports `@dom/index.mdx`, already updated above).

**AGENTS.md blast radius (source of truth; `bun sync` regenerates mirrors via hook — do NOT run manually):**
- **UPDATE** `packages/dom/AGENTS.md` — add `hydrate` to the Public exports table; add a `## Hydration` section (`hydrate`/`hydrateNode`/`hydrateChildren`, the `HydrateCtx` stack, ForEach/Transition hydrate-mode, mismatch = warn + subtree-replace, the "never `replaceChildren`" invariant).
- **UPDATE** `packages/ssr/AGENTS.md` — update the "No hydrate mode in v1" gotcha → hydration now lives in `@hellajs/dom` (`hydrate()`); cross-reference.
- **UPDATE** root `AGENTS.md` — extend the `dom` row of the Packages table to mention hydration (e.g. "…surgical hydration of server-rendered HTML via `hydrate()`"). The `ssr` row is unchanged.

**Strategy:** the `hydrate` API doc's `## Basic Usage` example is the Code delta's runnable call (server `ssr()` + client `hydrate()` + `flush()`). Keep the concept doc focused on the model + the adoption contract; push per-export detail to the API doc and cross-reference. The SSR concept/pattern updates are mandatory (they currently assert "no hydration mode" — a falsified claim once this ships) — `guides/docs.md` Accuracy: no claim contradicts the implementation.

- [x] `packages/dom/docs/api/hydrate.mdx` exists, Function-doc template, signature matches `lib/index.ts`, runnable example = server `ssr(<App/>)` + client `hydrate(<App/>, "#app")`.
- [x] `packages/dom/docs/concepts/hydration.mdx` exists, Concept-doc template, cross-references `ssr`/`mount`/`$ref`/`ForEach`.
- [x] `packages/dom/docs/index.mdx` lists `hydrate` (Functions) + Hydration (Concepts).
- [x] `packages/ssr/docs/concepts/ssr.mdx` no longer claims "no hydration mode"; cross-references `hydrate` + Hydration; keeps `$ref`/`$collection`/island alternatives.
- [x] `packages/ssr/docs/patterns/ssr.mdx` has a `### Hydrate server-rendered HTML` recipe.
- [x] `docs/src/pages/reference/dom/hydrate.mdx` + `docs/src/pages/learn/concepts/hydration.mdx` wrappers exist with `title`/`description`/`layout` frontmatter + `@dom/…` imports + zero prose.
- [x] `docs/src/nav.ts` registers `Hydration` (Concepts) + `hydrate` (reference.dom).
- [x] `docs/src/pages/learn/index.mdx` enumerates the Hydration concept.
- [x] `packages/dom/AGENTS.md` (exports table + `## hydrate` section), `packages/ssr/AGENTS.md` ("Hydration lives in @hellajs/dom" gotcha), root `AGENTS.md` (dom row mentions `hydrate()`) — all updated.

## Cross-task consistency & blast radius

- **Public delta:** `hydrate` (new export) + `HydrateCtx` (internal, no public-surface widening). Cross-module callers of `RenderFn`: none pass a second arg today; the stack-indirection means no caller changes. Verified via `rg 'isDynamic'` call sites in `appendToParent` (`render.ts`) — the single mount-side caller passes one arg and is unaffected.
- **Serializer contract:** `ssr()` output is hydration-compatible for **element-bounded structure** (tag names, attribute names/values/order, element nesting all match); reactive text adjacent to static text coalesces (see §Scope — Option A) and hydrate rebuilds those runs locally. `serializeProp` mirrors `renderProp`'s generic rules; `DIRECT_PROPS` is intentionally unmirrored (server emits `value="…"` as an attribute → correct initial IDL state; hydrate skips props → no divergence). **No `@hellajs/ssr` code change** — only its docs/AGENTS.
- **Core/css/resource/router/store:** untouched (hydrate reuses `@hellajs/core` reactivity through the existing `registry.addEffect`/`effect` path; no new runtime dep).
- **Verification gate:** `bun coverage dom` (Code + Tests). Docs verified against `guides/docs.md` checklist (brain-audit). AGENTS.md edits regenerated to mirrors by the post-commit `bun sync` hook + CI — never run `bun sync` manually.
- **Test files named after surface** (`hydrate` / `hydrate-foreach`) per `guides/tests.md` §File-naming.

## Self-check

- Every Code branch has a matching Tests scenario (props-skip, on/e/bind, signal child, conditional, fragment, `__static`, mismatch, async, ForEach adopt/mismatch/nested/index-keyed, Transition adopt/show-false, Portal, Lazy, lifecycle, identity-preservation).
- The Docs usage example is the Code delta's runnable call; every falsified "no hydration" claim is fixed in the same unit.
- `HydrateCtx` stays internal (stack-indirection) — `RenderFn` public signature unchanged; `bun visibility` clean.
- `mountNode`/`appendToParent` hot path untouched; `bun coverage dom` baseline preserved.
- Single independently-shippable unit: hydration without list adoption is not usefully shippable (lists are the headline value, per `memory/entries/007.md`), so the walker + ForEach/Transition hydrate-mode + tests + docs land atomically.
