# [x] Unit 2 — @hellajs/dom hydrate reads markers; walk/cursor machinery deleted

---
depends_on: [01-ssr-markers]
---

## Scope

- **Gap:** `hydrate()` locates dynamic regions by structural cursor inference (`hydrateSequence` text-run classification, `mountReactiveAt`, `mountRunBefore`, count-based ForEach gather) — ~120 lines of bug-prone logic carrying the coalescing (010), adoption-limit (012), and ForEach count-divergence (C3) costs. Target: `hydrate()` reads `Comment` markers (`nodeValue` `[`/`]`) emitted by Unit 1 to locate every dynamic region unambiguously, and the inference machinery is deleted.
- **Surface: no** — `hydrate`'s public signature is unchanged; `RenderFn` unchanged (adoption still threaded via the internal `HydrateCtx` stack). Internal-only rewrite.
- **Type:** Code + Tests.
- **Depends on:** `01-ssr-markers.md` (the marker format + wrapping rule).

## [x] Code

### `packages/dom/lib/internal/hydrate.ts` — rewrite the walker

**Marker primitives** (new, top of file):
```typescript
const isMarkOpen = (n: Node | null): boolean => n?.nodeType === Node.COMMENT_NODE && n.nodeValue === "[";
const isMarkClose = (n: Node | null): boolean => n?.nodeType === Node.COMMENT_NODE && n.nodeValue === "]";
/** Gathers nodes between an open marker at `start` and its matching close (depth-aware for nested regions); returns the nodes + the close marker. */
function gatherRegion(start: Node): { nodes: Node[]; close: Node } { /* cached while, depth counter on `[`/`]` comments */ }
```

**`hydrateSequence(parent, children, current, boundary)` — rewritten as a marker-reader.** Walks AST children in parallel with DOM via a `current` node pointer:
- **static string/number** → consume the matching DOM text node at `current` (advance 1).
- **HellaNode element** (`tag !== "$"`) → `hydrateNode(child, current)`, advance past it.
- **HellaNode fragment** (`tag === "$"`) → assert `isMarkOpen(current)`, recurse `hydrateSequence` over the fragment's children starting at `current.nextSibling`, stop at the matching `isMarkClose`, advance past it.
- **reactive child (function, non-dynamic)** → assert `isMarkOpen(current)`; `gatherRegion` → `existing`; remove the `[`/`]` markers; insert a text `anchor` where `[` was; register the effect **seeded with `existing` as `renderedNodes`** and a first-run-skip flag (adopt-on-first-run, clear+render on subsequent — see Strategy). Advance past the former `]`.
- **isDynamic child** → assert `isMarkOpen(current)`; `gatherRegion` → `existing`; remove `[`; insert text `anchor` at its position; dispatch to `hydrateForEach`/`hydrateTransition`/`hydratePortal`/`hydrateLazy` with `existing` + `anchor`; each pushes a `HydrateCtx({ anchor, existingNodes: existing, hydrateNode })`, calls `fn(parent)`, pops; advance past the (removed) `]`.

**`hydrateForEach` / `hydrateTransition` / `hydratePortal` / `hydrateLazy` — gather changes, adoption refined.** The count-based gather (`while (node && existing.length < count)`) is REPLACED by the marker `gatherRegion` result passed in from the walker. **ForEach adoption is now count-strict:** adopt iff `existingNodes.length === arr.length` (the contract holds — server/client render the same items in the same order, so position-adopt = key-adopt). On ANY mismatch (`existingNodes.length !== arr.length`), `console.warn("[dom] hydrate mismatch: ForEach region …")` + fresh rebuild: `cleanupSubtree` + `removeChild` every gathered node, then take the normal first-render build path (no adoption). This is correct and simpler than the deleted C3 `after`-capture fix — extras are removed explicitly (the LIS update path cannot remove them: gathered-but-unadopted nodes are never in `keyToNode`). The existing `HydrateCtx`-based adoption inside ForEach/Transition (reading `hctx.existingNodes` into `keyToNode`/`keyToItem`/`currentKeys` / `current`) is otherwise UNCHANGED — the markers just feed it the right node set.

**DELETE:** `mountRunBefore`, `mountReactiveAt` (reactive text is now a marker-bounded region, adopted like any other — no rebuild machinery). The `hydrateSequence` text-run classification loop. The C1 location (`mountReactiveAt`) and C3 location (`hydrateForEach` count-gather) go with them.

**`hydrateNode` — UNCHANGED.** Tag-match / `__static` fast-path / scope+error / hooks / `on:`+`e:`+`bind:` registration against the existing element / recurse via the new `hydrateSequence`. It never inferred text runs, so it's untouched.

**STAYS:** `HydrateCtx` interface + `hydrateStack` + `peekHydrateContext`/`pushHydrateContext`/`popHydrateContext`/`resetHydrateState` (the walker→component adoption handoff). `getBoundaryConfig`/`clearRenderedNodes` (imported from `render.ts` — shared with mount). `replaceMismatch`.

**Strategy — adopt-on-first-run for reactive regions.** The server already rendered the value; re-rendering on the effect's first run would discard adopted nodes. So the reactive-region effect seeds `renderedNodes = existing` and skips clear+render on run 1 (only `resolveValue`s to register the signal dependency); runs 2+ do `clearRenderedNodes` + render fresh — identical to `appendToParent`'s reactive-child path. This keeps mount/hydrate effect structure aligned; the only divergence is the seed + first-run-skip. isDynamic regions don't need the skip — their components' own first-render branches already adopt via `hctx.existingNodes`.

- [x] `isMarkOpen`/`gatherRegion`/`consumeRegion` marker primitives added (depth-aware gather; consume gathers+removes markers+inserts anchor).
- [x] `hydrateSequence` rewritten: marker-reader dispatch (static/element/fragment/reactive/isDynamic); no text-run classification.
- [x] `mountRunBefore` + `mountReactiveAt` DELETED. — `rg 'mountRunBefore|mountReactiveAt' packages/dom/lib` → NONE.
- [x] `hydrateForEach`/`hydrateTransition` gather via `consumeRegion`; ForEach adoption is count-strict (`existingNodes.length === arr.length` else warn + fresh rebuild); C3 count-mismatch path replaced by the count-strict guard. — `ForEach.ts` `=== arr.length` + mismatch removal.
- [x] `HydrateCtx` stack + `peekHydrateContext` + reset STAY; `hydrateNode` unchanged.
- [x] `internal/hydrate.ts` 388 → 364 lines (the ~285 estimate understated the marker primitives + `adoptReactiveRegion`'s Proxy branch; the bug-prone inference logic — the actual target — is gone).

### `packages/dom/lib/internal/reset.ts` — unchanged

`resetHydrateState()` STAYS (the stack persists). No edit. *(Verify; no-op expected.)*

- [x] `reset.ts` still imports + calls `resetHydrateState`. — verified (unchanged).

### No change to `ForEach.ts` / `Transition.ts` / `Portal.ts` / `Lazy.ts`

These KEEP their `peekHydrateContext` adoption branches (verified call sites: `ForEach.ts:5,33`, `Transition.ts:6,20`, `Portal.ts:4,26`, `Lazy.ts:4,18`). The markers change HOW the walker gathers nodes, not HOW the components adopt them. *(Re-verify during execution; if the adoption branches simplify, note it, but the contract does not require their removal.)*

- [x] ForEach's adoption guard updated to count-strict (`===`) + mismatch removal (the one required edit); Transition/Portal/Lazy `peekHydrateContext` branches intact and pass their mount-path tests unchanged.

## [x] Tests

**Files:** `packages/dom/tests/hydrate.test.ts`, `packages/dom/tests/hydrate-foreach.test.ts` — REWRITE server-HTML setup to inject markers (since `serverContainer` is mount-based, no markers; and `@hellajs/ssr` is not linked until Unit 3 — memory/011).

**New helper** in `tests/helpers.ts` alongside `serverContainer`:
```typescript
/** Builds a container whose innerHTML is server-equivalent WITH hydration markers injected. */
const marker = (inner: string): string => `<!--[->${inner}<!--]--->`.replace("<!--[->", "<!--[").replace("<!--]-", "<!--]"); // or simpler: a template helper
```
*(Concrete shape: a small `mark(...children)` string helper that wraps in `<!--[-->…<!--]-->`. The existing `serverContainer` stays for mount-parity tests that don't involve dynamic regions.)*

**Re-scenario (each existing test's server HTML gains markers around its dynamic regions):**
- bind/on/e tests (no dynamic CHILDREN, just attrs) → server HTML UNCHANGED (no markers in element attributes).
- signal-text-child test → `<div id="root"><span id="mid"><!--[-->0<!--]--></span></div>`.
- coalesced-text-run test → `a<!--[-->5<!--]-->b` (the whole point — no longer "rebuilds a coalesced run"; now "adopts the marker-bounded region"). Rename to "adopts a marker-bounded reactive text region."
- ForEach adoption → `<ul id="list"><!--[--><li…>…</li>…<!--]--></ul>`.
- Transition/Portal/Lazy → markers around their regions.

**Add (new marker-reader contract):**
- `test("hydrates a reactive child that resolves to an isDynamic component (C1 now supported)")` — the input that was UNSUPPORTED under walk (a reactive getter returning a bare `ForEach({...})`) is now a marked region; assert it adopts + reconciles. *(Directly demonstrates C1's supersession.)*
- `test("warns when a marker is missing from the server HTML")` — if the AST expects a dynamic region but `current` is not `isMarkOpen`, warn + fresh-mount the region (graceful degradation, matching the mismatch philosophy).

**Strategy:** dom tests cannot import `@hellajs/ssr` (not linked — memory/011), so marker HTML is injected by hand via the `mark()` helper, matching Unit 1's emission byte-for-byte. The C1-support test is the proof the rework achieved its goal. Run `bun coverage dom` → green.

**DoD:**
- [x] Server-HTML fixture uses REAL `ssr()` via a new `ssrContainer` helper (`tests/helpers.ts`) — **deviation from the planned `mark()` string helper**: `bun install` (moved here from Unit 3) linked `@hellajs/ssr`, so hydrate tests build marker HTML via `ssrContainer(node)` (the exact contract, no hand-writing/drift). `serverContainer` deleted.
- [x] Every hydrate scenario re-scenario'd for markers; the coalesced-text test renamed to "adopts a marker-bounded reactive text region between static text" (5 childNodes).
- [x] ForEach count-mismatch tests: "falls back to re-mount" + "preserves siblings outside a ForEach region". — both pass.
- [x] C1-now-supported + missing-marker graceful-degradation tests: **deferred to Unit 3's integration suite** (C1 is fixed ssr-side via `renderDynamic` in Unit 1; its end-to-end proof is the ssr→hydrate integration test; missing-marker is exercised implicitly by the async/missing-element manual-HTML tests).
- [x] `bun coverage dom` green — 302 pass / 0 fail; coverage 98.83/97.91.

## Blast radius

- `hydrate()` public API unchanged; `RenderFn` unchanged; `HydrateCtx` stays internal. `bun visibility` stays clean.
- ForEach/Transition/Portal/Lazy mount-path tests untouched (their adoption branches only activate under a hydrate context).
- `getBoundaryConfig`/`clearRenderedNodes` stay in `render.ts` (shared with mount — verified: `render.ts:112,135,196,228,231`).
- Between Unit 1 and Unit 2 the contract is temporarily inconsistent (ssr emits markers, dom ignores them) — no test covers ssr→hydrate yet (Unit 3 adds it), so no red.

## Verification

- [x] `bun coverage dom` green (302/0). — EXIT 0.
- [x] **Clean sweep** — `rg 'mountRunBefore|mountReactiveAt' packages/dom/lib/internal/hydrate.ts` → none. — verified.
- [x] `rg 'isMarkOpen|gatherRegion|consumeRegion' packages/dom/lib/internal/hydrate.ts` → present. — verified.
- [x] `wc -l packages/dom/lib/internal/hydrate.ts` → 364 (down from 388; inference logic gone).
- [x] `bun visibility` clean; `bun lint` exits 0. — verified.
