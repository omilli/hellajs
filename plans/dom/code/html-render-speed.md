# [x] html-render-speed

## Contract

### Surface change
no — all changes are internal to `packages/dom/lib/`. No exported symbol, signature, or public type changes. `__static` is already typed (`packages/dom/lib/types/nodes.d.ts:77`); `resetDom` is already exported and only has its *internal* reset list extended. A new regression test for clone-independence and an `AGENTS.md` Performance-section update are included because A1 introduces a new internal invariant and `AGENTS.md` documents these internals in detail — not because the surface changed.

### Package
dom

### Guide governance
- Files ← `code.md` §Package File Structure, §Files, §Naming Conventions, §Loops, §Performance (`while` + cached `length`; no `for…of`/`for…in` on hot paths; never allocate new collections when `.clear()`/reference-swap works)
- Static-subtree cache ← `code.md` §Memory (lazy allocation), §Performance (cached loops, minimal allocations); AGENTS.md §`html\`\`` parsing & caching + §Performance (existing `__static` reference-sharing)
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → `test()` derivation, §Mock Patterns, §Shared State and Cleanup
- AGENTS.md update ← root `AGENTS.md` §Source of truth & sync (never edit `CLAUDE.md` / `.github/instructions/*`; never run `bun sync` — post-commit hook owns regeneration)

### Files
- `packages/dom/lib/internal/render.ts` — modify — `mountNode` (entry, ~line 65): add `__static` short-circuit + cache populate. `appendToParent` (~line 146): string-child fast path before `resolveValue`; inline `isHellaNode` at the resolved-child branch (~line 233); accept `currentBoundary` already computed by caller and drop the per-call `peekState(parent)` when caller asserts no error config. `resolveNode` (~line 46): inline `isHellaNode`.
- `packages/dom/lib/internal/template.ts` — modify — `cloneWithValues` (~line 29): reorder `__static` check before `__placeholder`; replace `children.flat()` (~line 151) with a manual flatten that skips allocation when no element is an array.
- `packages/dom/lib/internal/utils.ts` — modify — `renderProp` (~line 53): inline `DIRECT_PROPS.has(key)` as four `===` compares; inline `isFalsy(value)` as `value === false || value === null || value === undefined`.
- `packages/dom/lib/internal/reset.ts` — modify — `resetDom` (~line 11): also clear the new `staticDom` cache (test isolation).
- `packages/dom/tests/html.test.ts` — modify — add clone-independence regression scenarios (see Behavioral scenarios).
- `packages/dom/AGENTS.md` — modify — §`html\`\`` parsing & caching: document the `staticDom` prototype cache. §Performance: add a bullet.
- (Task 6 / A2 only) `packages/dom/lib/internal/template.ts`, `packages/dom/lib/html.ts` — larger refactor; see Task 6 strategy.

### Public API delta
None. All changes are internal. The observable contract is unchanged: `mount(html\`...\`)` produces the same DOM tree with the same semantics, faster.

### Behavioral scenarios
(A1 — DOM cache; the only new-observable-behavior task)
- Two `mount()` calls of the same `html\`\`` literal containing a `__static` subtree produce independent DOM trees: after `mountNode` returns the cloned subtree, removing or mutating a node in one tree does not affect the other (regression for the `cloneNode(true)` correctness).
- A `__static` subtree nested inside a non-static parent (e.g. the `<a class="remove"><span…/></a>` branch in `examples/bench/src-ts/Row.ts`) still mounts with correct attributes and children.
- `resetDom()` clears the static-subtree cache so that a second test mounting the same literal rebuilds the prototype (test isolation).
- Existing `foreach.test.ts` keyed-reconciliation scenarios still pass when many rows share the same `Row(row)` template (the Row template has both static and non-static branches — exercises cache + clone in a list).

### Doc placement
- `packages/dom/AGENTS.md` §`html\`\`` parsing & caching — extend the **Static-subtree optimization** bullet to document the `staticDom: WeakMap<HellaNode, Element | DocumentFragment>` prototype cache: first mount builds + caches; subsequent `mountNode` calls on a `__static` node return `cached.cloneNode(true)`. Note that this is safe because `markIfStatic` guarantees `__static` nodes carry no `on`/`e`/`bind`/`hooks`/`error` and therefore have zero `ElementState` entries.
- `packages/dom/AGENTS.md` §Performance — add bullet: "`staticDom` prototype cache — `__static` subtrees return `cloneNode(true)` of a cached prototype, turning O(nodes) mount into O(1) for static branches."

### Tests view
Surface change is `no`, so no Tests-*view* trio task is required. A1 still adds scenarios to the existing `tests/html.test.ts` because it introduces a new internal invariant (clone independence) that the existing suite does not assert. The B-tier tasks and Task 6 are verified by the existing suite (`bun coverage dom`) — no new tests.

### Docs view
Surface change is `no`, so no Docs-*view* trio task is required. The `AGENTS.md` update is bundled into Task 1 because AGENTS.md is the agent-facing source of truth and its §Performance + §`html\`\`` sections describe these exact internals; leaving them stale after introducing `staticDom` violates root `AGENTS.md` §Source of truth & sync. Per root AGENTS.md: edit `AGENTS.md` only; never run `bun sync`; never touch `CLAUDE.md` / `.github/instructions/*`.

---

## [x] A1 — Static-subtree DOM-prototype cache (Code + internal test + AGENTS.md)
**Type:** Code
**Depends on:** None

### Strategy
Add a module-level `staticDom: WeakMap<HellaNode, Element | DocumentFragment>` in `render.ts`. At `mountNode` entry, before any other work: if `node.__static`, look up the prototype; on hit return `cached.cloneNode(true)`. On the existing return paths (the `tag === "$"` fragment path at line 68-72 and the element path at line 135), if `node.__static`, populate the cache before returning. **Safety** rests on `markIfStatic` (`template.ts:280-318`) guaranteeing that `__static` nodes carry no `on`/`e`/`bind`/`hooks`/`error`/`__scope` (all of those would be placeholders, which `markIfStatic` rejects at lines 283-306), so the cached element has zero `ElementState` entries — `cloneNode(true)` yields a purely-structural, independent subtree. **Key identity** is correct because `cloneWithValues` returns the *same* `__static` node reference for every invocation of a literal (`template.ts:35`), so cache identity = template identity. Extend `resetDom` (`reset.ts:11`) to clear the cache for test isolation. Trade-off considered and rejected: cloning per-bucket instead of per-subtree — rejected because per-subtree `cloneNode(true)` is one C++ call vs. dozens of JS-level `createElement`/`setAttribute`/`appendChild`; and caching at parse-time in `template.ts` — rejected because the prototype requires a live DOM (`document`), which `parseHTML` should not depend on.

### Definition of Done
- [x] `bun coverage dom` exits 0; overall coverage not lower than before
- [x] `bun lint` exits 0
- [x] `packages/dom/lib/internal/render.ts` `mountNode` short-circuits on `node.__static` via a `staticDom` lookup, returns `cached.cloneNode(true)` on hit
- [x] `mountNode` populates `staticDom` on both return paths (fragment + element) when `node.__static`
- [x] `packages/dom/lib/internal/reset.ts` `resetDom` clears `staticDom`
- [x] Every file in Contract.Files touched as specified for this task (render.ts, reset.ts, tests/html.test.ts, AGENTS.md)
- [x] New scenarios in `tests/html.test.ts` — one `test()` per Behavioral scenario above (4 total); each uses `mock()` from `bun:test` where counting, `setupContainer`/`resetTestState` per `tests.md`; no `it()`/`test.skip`/`any`/boolean-flag counters
- [x] No claim in the changed `AGENTS.md` section contradicts the implementation — cross-checked against `render.ts` source
- [x] `AGENTS.md` is the only agent-file edited; `CLAUDE.md` / `.github/instructions/*` untouched; `bun sync` NOT run
- [x] No new runtime dependency
- [x] No public API change — existing `html.test.ts` / `template.test.ts` / `foreach.test.ts` scenarios remain green
- [x] Audit skill (`brain-audit`) run on `render.ts` reports no deviations from `./guides/code.md`

## [x] B-bundle utils — renderProp fast paths (B1 + B2) (Code)
**Type:** Code
**Depends on:** None

### Strategy
In `packages/dom/lib/internal/utils.ts` `renderProp` (line 53): replace `DIRECT_PROPS.has(key)` with `key === "value" || key === "checked" || key === "selected" || key === "innerHTML"` — for 4 short strings, inline compares beat `Set.has` (no Set lookup + no closure-captured set). Replace `isFalsy(value)` (line 58, called once at line 55 and once at line 58) with the inlined `value === false || value === null || value === undefined` — removes a function call + the `typeof value === "undefined"` inside `isFalsy`. Keep the `DIRECT_PROPS` frozen Set only if `code.md`/other code references it; otherwise delete it. Trade-off considered and rejected: keeping `Set.has` for clarity — rejected because `code.md` §Performance explicitly trades DRY for hot-path speed and renderProp runs once per attribute per mount.

### Definition of Done
- [x] `bun coverage dom` exits 0; coverage on `renderProp` lines not lower
- [x] `bun lint` exits 0
- [x] `packages/dom/lib/internal/utils.ts` `renderProp` uses inline `===` compares for both `DIRECT_PROPS` and `isFalsy`; no function call to `isFalsy` remains in this function
- [x] `DIRECT_PROPS` Set deleted if no longer referenced anywhere (`rg DIRECT_PROPS` clean); otherwise left with a cited reason
- [x] No behavior change — `isFalsy(0)` still returns false (signal `0` renders `"0"`); falsy branches unchanged
- [x] Existing `mount-binding.test.ts` (`DIRECT_PROPS` falsy fallback) and any `renderProp`-covering tests remain green
- [x] No new test needed — the existing suite covers all `renderProp` branches; behavior is unchanged

## [x] B-bundle render — appendToParent + resolveNode fast paths (B3 + B5 + B7) (Code)
**Type:** Code
**Depends on:** None

### Strategy
In `packages/dom/lib/internal/render.ts`: (a) `appendToParent` (line 146): the single-string fast path at line 149 stays; in the per-child loop, before calling `resolveValue(child)` at line 227, add `typeof child === "string"` → `parent.appendChild(document.createTextNode(child))` and `continue` — skips `resolveValue` + `toText` for known-string children (the common static-text case). (b) Inline `isHellaNode(resolved)` at line 233 as `resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined` — removes a function call on every child resolution; keep the exported `isHellaNode` in `utils.ts` for non-hot callers. (c) `resolveNode` (line 46): inline `isHellaNode(value)` at line 47 the same way. (d) B7 — `appendToParent` currently calls `peekState(parent)?.errorConfig` at line 154 on every invocation; for a freshly-`createElement`'d parent created by `mountNode`, no state exists yet (state is only created when `__scope`/`error`/hooks/events/bind are set), so the peek is almost always a wasted WeakMap lookup. Pass `currentBoundary` from `mountNode` (where `error ? element : boundaryElement` is already computed at line 86) into `appendToParent` as a third arg and use it directly; drop the local re-peek **unless** the caller is the fragment path or any path that legitimately cannot pass boundary — in that case keep the peek as a fallback parameter defaulting to undefined and let `mountNode` pass the resolved boundary explicitly. Trade-off considered and rejected: removing the peek entirely — rejected because the boundary may differ from the caller's when a deeper element has its own `errorConfig` (only relevant for the non-static reactive path, which still needs the local check); keep the local check only on the reactive (`isFunction(child)`) branch where `currentBoundary` is referenced inside the effect closure.

### Definition of Done
- [x] `bun coverage dom` exits 0; coverage on changed lines not lower
- [x] `bun lint` exits 0
- [x] `packages/dom/lib/internal/render.ts` `appendToParent` per-child loop has a `typeof child === "string"` direct-`createTextNode` short-circuit before `resolveValue`
- [x] `isHellaNode` inlined at both `appendToParent` (~line 233) and `resolveNode` (~line 47) hot sites; the `isHellaNode` export in `utils.ts` retained for cold callers
- [x] `appendToParent` accepts `currentBoundary` from `mountNode` and skips the `peekState(parent)` re-lookup on the non-reactive branches; the reactive-child branch retains whatever boundary lookup is correct for its closure
- [x] No behavior change — existing `mount-binding.test.ts`, `reactive-dynamic-children.test.ts`, `html.test.ts`, `foreach.test.ts` remain green
- [x] No new test needed — behavior is unchanged; existing suite verifies
- [x] Audit skill (`brain-audit`) run on `render.ts` reports no deviations from `./guides/code.md`

## [x] B-bundle template — cloneWithValues fast paths (B4 + B6) (Code)
**Type:** Code
**Depends on:** None

### Strategy
In `packages/dom/lib/internal/template.ts` `cloneWithValues` (line 29): (a) B6 — reorder so the `Object.hasOwn(node, "__static")` check (line 35) runs *before* the `__placeholder` check (line 32). For the dominant hot path (partially-static templates where `cloneWithValues` is recursing through a non-static parent's children and repeatedly hits static-subtree references), `__static` is the common hit and `__placeholder` only fires at leaves; checking the common case first is free. (b) B4 — at line 151, `children.flat()` always allocates a new array even though `HellaNode.children` is invariantly flat post-substitution (root `AGENTS.md` §HellaNode: "children is always flat"). Replace with a manual `while` loop that scans for any `Array.isArray(element)`; only if found, allocate a flattened result, otherwise return the array as-is. Keep the defensive behavior (a placeholder value may itself be an array) without the always-alloc. Trade-off considered and rejected: dropping the flatten entirely and trusting the invariant — rejected because a placeholder can resolve to an array (e.g. `${[a, b]}`), which the current `.flat()` handles correctly and tests may rely on.

### Definition of Done
- [x] `bun coverage dom` exits 0; coverage on `cloneWithValues` lines not lower
- [x] `bun lint` exits 0
- [x] `packages/dom/lib/internal/template.ts` `cloneWithValues` checks `__static` before `__placeholder`
- [x] `children.flat()` replaced with a manual `while` scan that allocates only when an array element is present
- [x] No behavior change — `html.test.ts` / `template.test.ts` (caching, fragments, deep nesting, dynamic components) remain green
- [x] No new test needed — behavior is unchanged
- [x] Audit skill (`brain-audit`) run on `template.ts` reports no deviations from `./guides/code.md`

## [-] A2 — Compiled clone plans (Code)
**Type:** Code
**Depends on:** A1 — Static-subtree DOM-prototype cache (deferred — do only if A1 + B-bundles measured insufficient)

### Strategy
Larger refactor. At parse time, instead of producing a generic `HtmlInternalNode` AST that `cloneWithValues` walks generically, compile a specialized clone closure per template-literal that reads `values[i]` directly into the known bucket/key paths. The closure replaces the recursive `cloneWithValues` call in `html.ts:17` and `html.ts:42`. Concretely: during `parseHTML`, accumulate a list of `(targetPath, valueIndex)` slots (e.g. "node.children[0].children[1].props.class ← values[3]"); emit a function that builds the cloned node object literal directly, copying static buckets by reference and substituting only the placeholder slots. `__static` and `__dynamicComponent` short-circuits are preserved at the closure entry. **This supersedes the B4/B6 micro-opts within `cloneWithValues` for the hot path** (the generic walker is no longer invoked) but B4/B6 should still land first as a low-risk incremental win in case A2 is deferred. Trade-off considered and rejected: keeping `cloneWithValues` as a generic interpreter — rejected because per-node `typeof`/`hasOwn`/`Object.keys` overhead is the remaining bottleneck after A1 eliminates the DOM-build cost; the parse-time work is amortized over the template cache (`templateCache: WeakMap`) so it runs once per literal.

### Definition of Done
- [ ] `bun coverage dom` exits 0; overall coverage not lower
- [ ] `bun lint` exits 0
- [ ] Every Contract.Files entry for this task (template.ts, html.ts) touched as specified
- [ ] `cloneWithValues` either replaced by or backed by an emitted closure per template; the existing `templateCache` (`html.ts:4`) still keys the closure by template-strings identity
- [ ] Existing `html.test.ts` / `template.test.ts` (parsing edge cases, fragments, dynamic components, error-config materialization, deep nesting, `__static` sharing) remain green — these are the regression surface for clone-equivalence
- [ ] No behavior change observable from the public API; no new test needed beyond the existing clone-equivalence coverage
- [ ] If measured, a documented before/after delta on `examples/bench` Create-1,000-rows (or a focused microbench) — gates keeping the refactor
- [ ] Audit skill (`brain-audit`) run on `template.ts` + `html.ts` reports no deviations from `./guides/code.md`
