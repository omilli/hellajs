---
depends_on: []
---
# @hellajs/ssr — hydration design stress-test

## Goal

Stress-test surgical hydration as a candidate v2 capability. Produces a fully-specified design (all forks resolved) to inform the build/don't-build call. **Not a build commitment.** Not executable until v1's enhancement model has real usage data and the smallest de-risking experiment passes.

## What HellaJS hydration IS

**Re-execute the component tree on the client; attach effects/handlers/state to existing server-rendered DOM; never `replaceChildren`.** Solid-style, not React-style:

- Component bodies re-run — they're closures creating signals/effects, can't be skipped or serialized without Qwik-level machinery.
- `mountNode`'s `createElement` step becomes "use the existing element at this position."
- Bindings/handlers/effects attach to the existing element instead of a fresh one.
- DOM is never wiped — server HTML survives, only enhanced.
- CPU cost ≈ mount (re-executes the component tree); DOM-thrash cost ≈ 0 (no `createElement`, no GC of server DOM).

**Not resumability.** HellaJS's signal system has no serialized form. Re-execution is the only option. (If resumability ever becomes a goal, that's a separate design — Qwik's territory, far larger surface.)

## The serialization contract (load-bearing precondition)

For hydration to work, `ssr()` output must match what `mountNode` would produce. The moment hydration ships, this contract is frozen — drift turns into mismatch errors.

| Element | Contract | Source |
|---|---|---|
| Tag names | Exact | trivial |
| Attribute names + values | Exact | `renderProp` rules — already mirrored in `internal/serialize.ts` per `plans/ssr/code/ssr-v1.md:222` |
| Attribute order | Stable, matches `renderProp` application order | locked in v1 plan line 222 |
| Static text content | Exact | trivial |
| Structure (child count + types) | Exact | walker asserts via count-mismatch detection |
| Text anchors (`createTextNode("")`) | Server emits NOTHING; client inserts during hydrate | see ForEach adoption |

**Notably absent: ForEach item keys.** The resolved contract (Option C below) derives keys at hydrate-time from the same `each()` + `use()` calls the server made — keys never enter the HTML. The serializer doesn't know about keys at all.

## `hydrateNode` vs `mountNode` — the diff

`mountNode(node, boundaryElement?)` (`packages/dom/lib/internal/render.ts:71`) order, per `packages/dom/AGENTS.md`:

1. `createElement(node.tag)` (or fragment for `tag: "$"`)
2. Copy `__scope` → state, `error` → state, set `currentBoundary`
3. Register hooks
4. Run `beforeMount`
5. Apply `props` via `renderProp`
6. Register `on:` / `e:` / `bind:`
7. `appendToParent(element, children, currentBoundary)`

`hydrateNode(node, existingElement, boundaryElement?)` would do:

1. ~~`createElement`~~ → assert `existingElement.tagName === node.tag.toUpperCase()`, else mismatch (see Mismatch handling)
2. Copy `__scope` → state, `error` → state, set `currentBoundary` (same)
3. Register hooks (same)
4. Run `beforeMount` (same — no DOM change)
5. ~~Apply props~~ → **SKIP** (server already applied; re-applying is wasteful and risks drift)
6. Register `on:` / `e:` / `bind:` (same — attaches to existing element)
7. `hydrateChildren(existingElement, children, currentBoundary)` — walk AST children in parallel with existing childNodes, tracking a DOM cursor

Same structural shape. Diff concentrated in step 1 (use vs create) and step 7 (parallel-walk vs append-fresh).

## ForEach adoption — RESOLVED: Option C (re-run-and-match, no markers)

`packages/dom/lib/ForEach.ts:31` creates a fresh anchor on mount; first render builds items into a fragment and `insertBefore(fragment, anchor)` (per `packages/dom/AGENTS.md` "First render"). On hydrate, items already exist. The walker must populate `keyToNode` / `keyToItem` / `currentKeys` from existing DOM and insert the anchor.

### Why Option C wins (source-grounded)

Three load-bearing facts from `packages/dom/lib/ForEach.ts`:

1. **Key resolution is deterministic and self-contained** (lines 48–50, 75–90): `element.props?.key` → `item.id` → `index`. All three sources are available without DOM participation — the key comes from the AST or the data, never from the DOM.
2. **`each` is sync** (line 38): `resolveValue(each) as T[]`. No Promise path. The items array is available at hydrate time by calling the same function the server called.
3. **The component tree re-executes on hydrate anyway.** `each()` and `use(item, index)` are ALREADY called during hydrate — Option C's "re-run-and-match" cost is zero on top of baseline.

### The walker algorithm

The hydrate walker maintains a DOM cursor as it walks the AST. For each AST child, it consumes the appropriate number of DOM nodes:

- Static element/text → 1 node
- ForEach → calls `each()`, consumes `items.length` nodes
- Signal-driven child → calls the signal, consumes nodes matching the resolved value's extent

For ForEach specifically:

1. Walker is at DOM cursor position `i` when it encounters the ForEach AST node
2. Calls `each()` → gets items array
3. **Count-mismatch check:** if the DOM has fewer remaining nodes than `items.length` at cursor position, fall back to `mountNode(ForEach, parent)` for this subtree (warn + subtree-replace per Mismatch handling)
4. For each item at index `j`: call `use(item, j)` → get HellaNode; compute key (same logic as `ForEach.ts:48–50` / `75–90`); match item[j] to DOM node at `cursor + j`; recurse `hydrateNode(hellaNode, existingDomNode)`
5. Build `keyToNode.set(key, existingDomNode)`, `keyToItem.set(key, item)`, `currentKeys.push(key)`
6. Insert anchor at `cursor + items.length`
7. Advance DOM cursor past the items + anchor

### Why C beats markers (A/B) for HellaJS

| | A (`data-hella-key`) / B (comments) | C (re-run-and-match) |
|---|---|---|
| Server HTML pollution | One attribute/comment per item | **Zero** |
| Serializer enrichment | Required (emit keys) | **None — v1 serializer is already hydration-ready** |
| Decouples serializer from hydration contract | No — serializer must know key format | **Yes — serializer doesn't know about keys** |
| Works for index-keyed ForEach (no explicit key) | Needs fallback to C anyway | **Works uniformly** |
| CPU cost on hydrate | Saves the `each()` call | No saving — but `each()` runs anyway |
| Robustness against non-deterministic `each()` | Robust | Count-mismatch → subtree-replace |
| Debuggability | Keys visible in DevTools | Keys invisible in DOM (available in `keyToNode` at runtime) |

The clincher: **C requires zero serializer changes.** v1's `internal/serialize.ts` already produces hydration-compatible output. The serialization contract stays minimal — ForEach keys never enter the HTML.

### Edge cases (all handled by the re-run approach)

- **Empty list:** `each()` returns `[]`, no items to adopt, insert anchor at cursor. ✓
- **Count mismatch (list changed server→client):** detectable, fall back to subtree-replace. ✓
- **Key collision:** same Map-last-wins semantics `ForEach` already uses (`packages/dom/AGENTS.md` "duplicate keys (last-wins)"). ✓
- **Nested ForEach:** outer items matched, then `hydrateNode` recurses into each item's children, which includes the inner ForEach — matched recursively. ✓
- **Non-element items (text/primitive):** walker matches text nodes. ✓
- **Conditional children inside items:** walker re-evaluates the condition to determine extent (same as any signal-driven child). ✓

## Anchor placement — RESOLVED (collapses into ForEach approach)

Reactive children, ForEach, Portal, Lazy, Transition all use `createTextNode("")` anchors (`ForEach.ts:31`, etc.). Server HTML has no anchors — just rendered content. The hydrate walker inserts them using the **same re-run-to-determine-extent approach** as ForEach:

- For Each AST child, the walker knows how many DOM nodes it consumed (1 for static, `items.length` for ForEach, resolved-value-extent for signal-driven children).
- After consuming those nodes, it inserts the anchor at the current cursor position.
- The DOM cursor advances past the anchor before the next AST child.

No boundary markers needed anywhere. The "where does this reactive region end?" question is answered by re-running the reactive source — the same approach that powers ForEach adoption.

## Reactive-child effect (drift analysis)

Server rendered `count()` at server-eval-time → "0". Client creates signal `count` at initial value 0 → interpolation produces "0". Match — no drift, because hydration re-executes the component tree from scratch with fresh signals at initial values.

**Drift only happens if the client signal initializes to a different value than the server.** That's a footgun regardless of hydration. Hydration doesn't introduce drift; it inherits the contract that initial values must match server output.

## Mismatch handling — RESOLVED: warn + subtree-replace

When `existingElement.tagName !== node.tag.toUpperCase()` (or a ForEach count-mismatch triggers):

- ~~Hard throw~~ — React-style. Inconsistent with HellaJS's error philosophy (see below).
- **Warn + subtree-replace** — `console.warn("[dom] hydrate mismatch..."); cleanupSubtree(existingParent); mountNode(node)` for that subtree.
- ~~Silent overwrite~~ — Vue-style. Actively hides bugs.

**Why warn + subtree-replace is correct (not just default):** HellaJS's existing error philosophy (`packages/dom/AGENTS.md`) is catch → route through error boundaries → render fallback UI. `dispatchError` never hard-throws; error boundaries render replacement UI; `onError` logs + degrades. Every error site has a "fallback rendering" path, never "crash." Hard-throw on hydrate mismatch would be the *only* place in HellaJS that crashes the page — inconsistent, not honest. A hydrate mismatch is just another error triggering the same degradation: catch, warn, re-mount the subtree from scratch. User sees working UI; dev sees the warning.

## CSS state on hydrate — RESOLVED: no problem (separate style elements)

Under the css platform-dependent return model (`plans/css/code/platform-return.md`), the server and client use **separate style elements** that don't interact:

- **Server:** css() returns text (no `hasDocument()`). The caller places it in a **caller-controlled `<style>`** (no specific ID) in the page head. No runtime state on the server.
- **Client hydrate:** the component tree re-executes. css() runs on the client (`hasDocument()` = true), auto-injects into the runtime `<style id="hella-css">` via `injectedMap` + `upsertRule`. This is a **different element** from the server's `<style>`.

No wipe problem. No shared state. No clearing needed. The two `<style>` elements coexist — both carry the same rules (same component tree), so last-wins is visually correct. The server's `<style>` is dead weight once the client injects, but harmless.

```ts
// Server ships CSS in a caller-controlled <style>:
const btnCss = css({ color: "red" }, { name: "btn" });  // ".btn{color:red}" (server return)
const body = ssr(html`<button class="btn">Click</button>`);
const page = `<style>${btnCss}</style><div id="app">${body}</div>`;
// Note: no id="hella-css" — this is a static <style>, separate from the runtime one

// Client hydrates — css() re-executes, injects into <style id="hella-css"> (separate element)
const handle = hydrate(html`<${App} />`, "#app");
handle.flush();  // run pending effects (cssVars reactive) before first paint
```

- **No duplication concern** — identical rules in two elements; last-wins is visually correct.
- **Optional:** caller can strip the server `<style>` before hydrate to avoid dead-weight rules. Not required.
- **vars reactive effects** flush via `MountHandle.flush()` (same pattern as `mount`).
- **`hydrate()` has zero runtime imports from `@hellajs/*`** — same decoupled architecture as `ssr()`.

## What's tractable vs genuinely hard

**Tractable** (parallel to mount, swap create-for-existing):
- `hydrateNode` shape (steps 1–7 above)
- Static elements, static text
- Props (skip re-apply)
- `on:` / `e:` / `bind:` registration
- Component scope, error configs
- Reactive-child effects (drift-free given matching initial values)
- **ForEach adoption** (Option C — re-run-and-match, resolved)
- **Anchor placement** (collapses into the ForEach approach)

**Tractable:**
- Mismatch handling (warn + subtree-replace, consistent with error boundaries)

**Tractable (no action needed):**
- CSS state on hydrate (server styles and client runtime styles are in separate `<style>` elements — no wipe, no clearing; see CSS section above)

**Frozen-on-commit (serialization contract):**
- Attribute order (already locked v1)
- (ForEach keys NOT in the contract — C derives them at hydrate-time)

All forks resolved. **Hydration is tractable throughout** — no genuinely-hard problems remain, only implementation work (the parallel walker + the hydrate entry point). The design is fully specified.

## Smallest de-risking experiment

If you commit to a build exploration, the smallest meaningful first step (~100–150 lines, scratch file, no package surface change):

> Single ForEach with 3 keyed items (one signal-driven bind inside each item). Server `ssr()`s it → HTML with 3 `<li>`s. Client `hydrate()`s by walking the AST against the existing DOM: assert tag match on the `<ul>`, call `each()` → get 3 items, count-match the 3 existing `<li>`s, recurse `hydrateNode` into each (attaching the bind effect), insert anchor at position 3, build `keyToNode`/`keyToItem`/`currentKeys`. Verify: DOM unchanged post-hydrate; pushing a 4th item to the signal appends a new `<li>` via ForEach's normal reconciliation; removing item 2 cleans up + re-LIS-moves the survivors.

This exercises the walker, the C key contract, anchor placement, AND reactive binding in one go. If it works, hydration is viable end-to-end. If it doesn't, no amount of single-node success matters.

(An earlier draft suggested "single static node + one bind" — that's too small. It would pass trivially and prove nothing about the actually-hard parts.)

## Open forks

None. All forks resolved:

- ForEach key contract → Option C (re-run-and-match, no markers)
- Anchor placement → re-run-to-determine-extent (collapses into C)
- Mismatch strategy → warn + subtree-replace (consistent with error-boundary philosophy)
- CSS state on hydrate → no problem (server styles and client runtime styles are in separate `<style>` elements)

## Build/don't-build rubric

Don't commit to build until ALL of:
- v1 enhancement model shipped and in users' hands for ≥1 release cycle
- ≥1 user explicitly asks for "reactive list adoption of server-rendered items" (the unique hydration value)
- Smallest de-risking experiment passes

Don't commit to NEVER build until:
- v1 shipped and the gap hasn't shown up in real usage for ≥2 release cycles

Until one of those triggers, this doc informs the decision — it isn't the decision.

## Surface fork (if built)

A built hydration mode adds:
- `hydrate(node, target)` in `@hellajs/ssr` — the only new public symbol. Returns a `MountHandle` (same shape as `mount`). Zero runtime imports from `@hellajs/*` packages — same decoupled architecture as `ssr()`.
- An internal `hydrateNode` walker in `packages/dom/lib/internal/` (alongside `render.ts`) — NOT a public export, dom-internal
- No serializer enrichment needed (Option C)
- No `SsrResult` type (ssr returns string; hydrate returns MountHandle)

css/resource/core untouched (same invariants as v1). Server styles live in a caller-controlled `<style>` (css() returns text on server); client runtime styles live in `<style id="hella-css">` (css() auto-injects on client). Separate elements — no wipe, no clearing needed.

## Decisions log

| Decision | Resolution | Rationale |
|---|---|---|
| Hydration model | Re-execute + attach-to-existing (Solid-style) | Signals have no serialized form; resumability is out of scope |
| ForEach key contract | Option C (re-run-and-match, no markers) | Zero HTML pollution; zero serializer changes; v1 output already hydration-ready; count-mismatch is detectable + recoverable |
| Anchor placement | Re-run-to-determine-extent (collapses into C) | Same approach as ForEach; unifies the walker |
| Mismatch strategy | RESOLVED — warn + subtree-replace | Consistent with HellaJS error-boundary philosophy (catch → log → render fallback); hard-throw would be the only crash-on-error site in the system |
| CSS state on hydrate | RESOLVED — no problem (separate style elements) | Server ships CSS in caller-controlled `<style>` (css() returns text); client hydrate auto-injects into `<style id="hella-css">` (css() returns name + injects). Separate elements, no wipe, no clearing. See `plans/css/code/platform-return.md`. |
| Serializer enrichment | None required | C derives keys at hydrate-time; v1 serializer is sufficient |
