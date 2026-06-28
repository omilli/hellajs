<dom-package-instructions>
Surgical DOM rendering — no virtual DOM diffing. Only elements with reactive dependencies update, never whole trees. The DOM is mutated directly from `HellaNode` AST objects produced by the babel plugin or the `html\`\`` tagged template. Per-node state lives in a `WeakMap<Node, ElementState>`, never on DOM nodes. Code/test/docs style rules live in `guides/code.md`, `guides/tests.md`, `guides/docs.md` — not duplicated here.

## Public exports (`lib/index.ts`)

| Export | Kind | Source |
|---|---|---|
| `mount`, `html`, `component`, `element`, `onError` | Core API | `lib/{mount,html,component,element,error}.ts` |
| `ForEach`, `Portal`, `Lazy`, `Transition` | Dynamic components (`isDynamic: true`) | `lib/{ForEach,Portal,Lazy,Transition}.ts` |
| `$ref`, `$collection` | Reactive wrappers over existing DOM | `lib/$ref.ts`, `lib/$collection.ts` |
| `registry` | `addEffect` / `addHook` registration API | `lib/registry.ts` |
| `resetDom` | State reset (test/introspection) | `lib/internal/reset.ts` |
| `checkMultiSelectors`, `multiSelectors` | Selector-watcher state (test/introspection) | `lib/internal/selectors.ts` |
| `getState`, `hasState`, `peekState`, `deleteState` | ElementState access (test/introspection) | `lib/internal/state.ts` |
| `HellaNode`, `HellaChild`, `ElementHooks`, `HookType`, `ErrorConfig`, `ErrorContext`, `ErrorFn`, `DomWrapper`, `DomRef`, `DomCollection`, `ForEachProps`, `PortalProps`, `LazyProps`, `TransitionProps`, `ComponentFn`, `RenderFn`, … | Type-only | `lib/types/nodes.d.ts` |
| `DOMEventMap`, `HTMLAttributeMap`, `HTMLAttributes` | Type-only | `lib/types/attributes.d.ts` |

**Throw contracts.** `mount` → `[dom] mount: target "<target>" not found in document`. `ForEach` → `[dom] ForEach: each is required` / `[dom] ForEach: use must be a function`. `element` → `[dom] element: tagName must be a hyphenated string / render must be a function`. `Lazy` → `[dom] Lazy: loader must be a function`. `Portal` → `[dom] Portal: target "<to>" not found in document` (at first effect run, not at construction).

## ElementState (`lib/internal/state.ts`) — `WeakMap<Node, ElementState>`

`getState` lazily creates; `peekState` returns `undefined` if absent; `hasState`/`deleteState` wrap `has`/`delete`. Initial shape: `{ handlers: {}, isMounted: false }`. `effects`, `directHandlers`, and `hooks` are **lazy-allocated on first use** (`registry.addEffect` → `effects` array, `setDirectHandler` → `directHandlers` Map, `registry.addHook` → `hooks` object) — elements that never carry `bind:` / `e:` / `hook:` pay zero allocation for those collections (guide `code.md` §Memory). `handlers` stays eager (plain object, cheap, and `on:` is common).

| Field | Purpose |
|---|---|
| `effects` | `(() => void)[]` effect disposers; drained during cleanup. |
| `handlers` | `Record<type, EventListener>` delegated handlers (one per type per element). |
| `directHandlers` | `Map<type, EventListener>` `e:` handlers; `removeEventListener`-ed on cleanup. |
| `hooks` | `Partial<Record<HookType, fn[]>>` stacked lifecycle hooks; all execute in insertion order. |
| `isMounted` | `true` after `afterMount` fires. Root set sync in `mount()`; descendants async via the scoped observer. |
| `componentScope` | Dispose fn from `scope()`, attached when a node is created by `component()`. |
| `portalCleanup` / `lazyCleanup` / `transitionCleanup` | Optional disposers (Portal registers on its **anchor**; Lazy/Transition on the **parent**). |
| `errorConfig` | Set when the node carries any `error:` attribute. |
| `originalNode` | Snapshot for `reset()` re-render; set alongside `errorConfig` at mount. |
| `cachedBoundary` | Memoized nearest boundary (revalidated each lookup). |

## HellaNode (`lib/types/nodes.d.ts`)

Plain object produced by the babel plugin or `html\`\``; consumed by `mountNode`. `isHellaNode` = `v !== null && typeof v === "object" && v.tag !== undefined` — the hot-path structural discriminator. Dom-local and deliberately skips the `isPlainObject` proto/`toString` cost; DOM Nodes expose `tagName` (not `tag`), so they fail the `tag` own-property check and are correctly rejected.

| Field | Purpose |
|---|---|
| `tag` | Element tag, or `"$"` for fragment. |
| `props` | Static attributes applied once at mount via `renderProp`. |
| `on` | Delegated handlers (`on:` prefix). |
| `e` | Direct non-delegated handlers (`e:` prefix). |
| `bind` | Reactive bindings wrapped in `registry.addEffect` (`bind:` prefix). |
| `hooks` | Lifecycle hooks (`hook:` prefix). |
| `error` | `error:fallback` / `error:category` / `error:boundary` (`error:` prefix). |
| `children` | Always flat (`.flat()` runs during template substitution). |
| `__scope` | Attached by `component()`; copied to `state.componentScope` at mount. |
| `__static` | Template-cache marker — subtree has zero placeholder deps; shared by reference across invocations, never cloned. |

## Attribute prefixes

| Prefix | Bucket | Behavior |
|---|---|---|
| `on:` | `node.on` | Delegated: one `document.body.addEventListener(type, …, true)` (capture phase) per type. |
| `e:` | `node.e` | Direct: per-instance `addEventListener` (bubble phase), error-boundary-wrapped. |
| `bind:` | `node.bind` | Reactive: `registry.addEffect` re-runs on dependency change. |
| `hook:` | `node.hooks` | Lifecycle: `beforeMount` / `afterMount` / `beforeDestroy` / `afterDestroy` / `beforeUpdate` / `afterUpdate`. |
| `error:` | `node.error` | Config: `error:fallback` (fn) / `error:category` (string) / `error:boundary` (boolean). |
| (none) | `node.props` | Static attribute, applied once. |

## `html\`\`` parsing & caching (`lib/html.ts`, `lib/internal/template.ts`)

`templateCache: WeakMap<TemplateStringsArray, HtmlInternalNode>` keys the AST by template-strings identity. First call builds the AST; later calls skip parsing and only run `cloneWithValues`.

- **Tokenization.** `SKIP_REGEX` strips comments/DOCTYPE/CDATA; `<>`/`</>` rewrite to `<__fragment__>`/`</__fragment__>` → `tag: "$"`. `TOKEN_REGEX` matches tags + text; `ATTR_REGEX` classifies prefixes (`error:` before `e:` before `on:`/`bind:`/`hook:` before bare) in one pass; `parseAttributes` routes by `name.startsWith(...)`.
- **Placeholders.** Interpolations become `__SLOT_N__` markers in the string and `{ __placeholder: N }` markers in the AST. **Format is `__SLOT_N__`, not `__HELLA_N__`.** `parseTextContent` splits text containing slots.
- **Static-subtree optimization.** `markIfStatic` tags any node whose `props`/`on`/`e`/`bind`/`hooks`/`error`/`children` contain no `__placeholder` and no `__dynamicComponent` as `__static = true`. `cloneWithValues` short-circuits on `Object.hasOwn(node, "__static")` and returns the node as-is — **static subtrees are shared by reference across every invocation of the same literal.** This is why mutating a returned HellaNode is unsafe.
- **Root interpolation unwrap.** If the trimmed template is exactly `__SLOT_N__`, `parseHTML` returns the placeholder value directly — `html\`${value}\`` yields `value` itself, unwrapped.
- **Roots.** 1 root → that node; `>1` roots → wrapped in `{ tag: "$", children: nodes }`.
- **Dynamic components.** `<${Comp}>` becomes `{ __dynamicComponent: N, props, children }`; `cloneWithValues` calls `Comp(mergedProps)` if `Comp.isDynamic` (passthrough) or wraps via `component(Comp, mergedProps)`. Attribute buckets merge into one props object; a single child unwraps, multiple become an array.
- **Unclosed tags.** Anything left on the parse stack at EOF is flushed — no throw.
- **Cloning rules.** `__placeholder`/`__static`/`__dynamicComponent` short-circuit; arrays flat-clone; HellaNodes shallow-clone each bucket; children `.flat()`-ed.

## `mount(node, target = "#app")` (`lib/mount.ts`)

`resolveValue` calls `node` if it's a function. If the result is a thenable (`typeof resolved.then === "function"`), `attach` is deferred via `.then`; otherwise `attach` runs sync. `attach` = `mountNode` → `container.replaceChildren(...)` → `registerContainer(container)` (starts scoped observer) → sets `getState(root).isMounted = true` (root only).

- **Async mount rejections** route through `dispatchError(err, { phase: 'mount' })` — no element context, so no fallback rendering; surfaces via `onError` or `console.error('[dom]', err)`.
- **`setMountNode` indirection.** `mount.ts` registers `mountNode` with `dispatch.ts` at module init to break the `render.ts` ↔ `dispatch.ts` circular import; `events.ts` reads `getMountNode()` lazily when rendering fallback UI.

## `mountNode` / `appendToParent` (`lib/internal/render.ts`)

`mountNode(node, boundaryElement?)` — creates element (or fragment for `tag: "$"`), copies `__scope` → `state.componentScope` and `error` → `state.errorConfig` + `state.originalNode`, sets `currentBoundary = error ? element : boundaryElement`, registers hooks, runs `beforeMount` (errors caught, `phase: 'mount'`, **no fallback**), applies `props` via `renderProp`, registers `on:` (delegated) / `e:` (direct) / `bind:` (effect-wrapped; errors `phase: 'update'`, fallback `replaceChildren` on `currentBoundary ?? element`), then `appendToParent(element, children, currentBoundary)`.

- **`resolveNode(value, parent?)`** — `HellaNode` → `mountNode`; a non-dynamic **function/signal** → a text node plus an effect (registered on `parent || textNode`) tracking `resolveText(value())`; primitive → text node. This is the path Portal/Transition/ForEach use for their children.
- **`appendToParent` static-string fast path.** A single string child → `parent.textContent = str` (no text-node allocation).
- **Reactive child effect** (non-dynamic function child): creates a text anchor + `renderedNodes[]` + one effect. Each run resolves the value, `cleanupSubtree` + `removeChild` on every previous node, re-inserts. If the resolved value is itself a dynamic function, a `Proxy` parent intercepts `appendChild` to track nodes while still inserting before the anchor. Errors `phase: 'mount'`, fallback `insertBefore`-ed at anchor — **preserves siblings**, unlike the `bind:`/event path.
- **Non-function children.** `resolveValue` first; string/number → text node; raw `Node` → appended directly; `HellaNode` → `mountNode(resolved, currentBoundary)`.

## Cleanup & queues (`lib/internal/cleanup.ts`, `lib/internal/queue.ts`)

Two cooperating mechanisms share one `MutationObserver` per mount target:

- **Sync `cleanupSubtree(root)`** — called directly by `appendToParent` (reactive child swap), ForEach (stale-removal + list clear), Transition (leave completion). `traverseDescendants` (iterative stack) → per descendant `clean(node)`: `beforeDestroy` → `componentScope?.()` → `portalCleanup?.()` → `lazyCleanup?.()` → `transitionCleanup?.()` → drain `effects` → `removeDirectHandlers` → `afterDestroy` → `deleteState`.
- **Scoped observer safety net.** `registerContainer(container)` (called from `mount()`) + `ensureContainerObserver` lazily create one `MutationObserver` shared across all mount targets (`observedContainers: WeakSet<Element>`), observing `{ childList: true, subtree: true }`. Removed nodes' traversed via `registerNode`, which recursively walks each removed node's subtree collecting elements with state → `cleanupQueue`; added element nodes → `mountQueue`; both drain on `queueMicrotask`. `processCleanupQueue` skips nodes still `isConnected` (re-attached, not removed).
- **`runHooks` element-argument rule.** `beforeMount` and `afterDestroy` are called with **no** argument; every other hook receives the element.
- **Reset (test).** `resetEventState` / `resetQueueState` / `resetSelectorState` / `resetDom` tear down listeners, observers, queues, and `handlerCounts` between tests.

## Mount queue

`processMountQueue` traverses each queued node's descendants; every element with state gets `isMounted = true` and `afterMount` run. Skips nodes not `isConnected` at flush time. The root's `isMounted` is set sync in `mount()`; descendants are deferred one microtask — **tests must call `app.flush()` on the mount handle before asserting on `afterMount`-gated behavior.** `flush()` on the mount handle processes the mount queue synchronously for the container tree.

## Event delegation (`lib/internal/events.ts`, `lib/internal/counts.ts`)

- **Two Sets track types.** `globalListeners: Set<string>` = types with a real `document.body.addEventListener(type, delegatedHandler, true)` (capture) listener. `handlerCounts: Set<string>` (a Set despite the name) = the fast-exit checked at the top of `delegatedHandler`. **Neither is ever decremented** — types stay registered for the page lifetime until `resetEventState()`.
- **`delegatedHandler`** reads `event.composedPath()` and walks it; for each path element with `state.handlers[type]`, invokes `handler.call(element, event)` in try/catch. Errors dispatch with `phase: 'event'` and render fallback on `findBoundary(element) ?? element` via `replaceChildren`. **No automatic `stopPropagation`** — the whole path always fires (and because the walk is over the static `composedPath`, even a handler calling `stopPropagation` cannot short-circuit it).
- **Direct (`e:`) handlers** are wrapped per-instance with the same error handling, stored in `state.directHandlers` (Map keyed by type), and `removeEventListener`-ed each on cleanup.

## Keyed reconciliation — `ForEach` (`lib/ForEach.ts`)

Returns a function with `isDynamic: true`; `appendToParent` calls it with the parent. Creates a text anchor + one effect holding live collections (`keyToNode`, `keyToItem`, `currentKeys`) and reusable temp collections (`newKeys`, `newKeyToNode`, `newKeyToItem`, `nodesToRemove`, `keyToOldIndex`, `toMove`).

- **Key resolution.** `element.props.key` → `item.id` → array index. The first two set `hasExplicitKey = true`; the index fallback does not.
- **Reuse rule.** `!node || (!hasExplicitKey && oldItem !== item)` → `resolveNode` (fresh node). Explicit keys reuse by key identity regardless of item reference; index-fallback keys require the same item reference.
- **First render** (`currentKeys.length === 0`): build into a `DocumentFragment`, single `insertBefore(fragment, anchor)`.
- **Stale removal** (every non-first render): existing nodes absent from `newKeyToNode` (or whose node identity changed) are collected, then `cleanupSubtree` + `removeChild`-ed in a batch. Nodes whose `parentNode !== actualParent` (e.g. portal-moved) are skipped.
- **No-overlap fast path**: if no `newKey` exists in `keyToNode`, append all via one fragment.
- **LIS path**: `mapped[i]` = old index if reused else `-1`; binary-search LIS (`O(n log n)`) removed from `toMove`. Walk `newKeys` **backwards**, `insertBefore(node, moveAnchor)` only for indices still in `toMove` — minimal DOM moves.
- **Empty list**: `cleanupSubtree` + `removeChild` every node, clear maps.
- **Collection swap**: live and temp collections swap by reference; `clear()` the temps next round, never reallocate.

## `Portal` (`lib/Portal.ts`)

Renders children to a remote target. Creates a local anchor, then in one effect (guarded by `if (portalNodes.length > 0) return` → runs once) resolves `document.querySelector(to)`, builds nodes into a fragment, applies it via the target's `appendChild`/`prepend`/`replaceChildren`/`before`/`after` (`type` prop; default `append` maps to `appendChild`). `state.portalCleanup` (on the **anchor**) removes each tracked node from its current parent on cleanup. Throws if the target misses.

## `Lazy` (`lib/Lazy.ts`)

Async loader with cancellation. Creates an anchor; optionally `insertBefore`s a `loading` node. Allocates an `AbortController`; `state.lazyCleanup` (on the **parent**) sets `isCancelled = true` and `controller.abort()`. Calls `props.loader({ signal })`, then:

- **Success** — guards on `isCancelled || !anchor.parentNode`; removes loading; if `component` is a function calls `component(props.props)`, else uses directly; `mountNode`s + `insertBefore` at anchor. **No nested Promise unwrapping** — loader must resolve to `ComponentFn | HellaNode`.
- **Error** — same guards; removes loading; if `props.fallback`, `resolveNode` + `insertBefore` at anchor. **Errors do NOT bubble to `onError`** (local fallback only).
- **Cancellation** — both `.then`/`.catch` check the guard, so resolve/reject after parent removal is a no-op. Pass `signal` through to `fetch`/AbortController-aware APIs for network cancellation.

## `Transition` (`lib/Transition.ts`)

Enter/leave CSS animations. Holds `current`, `leaveTimer`, `isFirstRender`. One effect re-runs on `show`:

- **Enter** (`show=true`, no `current`, no `leaveTimer`): `resolveNode(children, parent)`, `insertBefore` at anchor. `isFirstRender && appear` → add `appear` (string) or fall back to `enter`; `!isFirstRender && enter` → add `enter`. **Without `appear`, no class is added on first mount.**
- **Rescue** (`show=true` with active `leaveTimer`): `clearTimeout`, remove `leave` class, keep the node (rapid-toggle rescue).
- **Leave with class** (`show=false`, `current`, `leave`): add `leave`, schedule `setTimeout(cleanup, duration + 50)`. The 50ms absorbs frame-timing drift; `duration` (default **300ms**) must match the CSS animation. Timer callback runs `cleanupSubtree` + `removeChild`.
- **Leave without class**: `cleanupSubtree` + `removeChild` synchronously.
- **`transitionCleanup`** (on parent) clears a pending `leaveTimer` when the parent is removed mid-leave. The `enter` class stays on after the animation (idempotent; re-entering re-adds it).

## Error system (`lib/internal/dispatch.ts`, `lib/error.ts`)

`onError(fn)` adds to `handlers: Set<ErrorFn>`; `onError(null)` clears all; returns an unregister. With **no handlers**, `dispatchError` logs `[dom] <error>` to `console.error` and returns `null` (no UI change). Handler errors are caught (`[dom] Error handler threw:`). Handlers iterate in insertion order; **first non-null HellaNode wins**.

- **Boundary detection.** `findBoundary(origin)` walks `parentElement`, returns nearest element whose `errorConfig` has `boundary || fallback`. **A `category`-only config is NOT a boundary.** Memoized on `state.cachedBoundary`, revalidated each lookup (must still be `isConnected` and still have `boundary || fallback`).
- **Config resolution.** `resolveErrorConfig(origin)` walks the same way but returns the first config of any kind (incl. `category`-only) — populates `context.config` even without a boundary.
- **Infinite-loop guard.** `handlingBoundaries: WeakSet<Element>` tracks boundaries mid-handling; a second error from one logs `[dom] Error during error handling - preventing infinite loop:` and returns `null`.
- **Reset.** `context.reset` is synthesized only when the boundary has `state.originalNode`; `reset()` = `boundary.replaceChildren(mountNodeFn(originalNode))`.
- **Fallback rendering is the caller's job** — `dispatchError` only returns the HellaNode:

| Error site | Phase | Fallback rendering |
|---|---|---|
| `component()` render body | render | none — returns empty fragment `{ tag:'$', children:[] }` |
| `beforeMount` hook | mount | none — element continues mounting |
| Reactive child effect | mount | `insertBefore` at anchor (**preserves siblings**) |
| `bind:` effect | update | `replaceChildren` on `currentBoundary ?? element` (replaces siblings) |
| `beforeUpdate`/`afterUpdate` hook | update | none — bindings stay functional |
| `on:`/`e:` handler | event | `replaceChildren` on `findBoundary(element) ?? element` |
| Async mount rejection | mount | none — no element context |

## `element()` custom elements (`lib/element.ts`)

`customElements.define` wrapper. **Light DOM only** (shadow DOM would break reactivity internals). Per instance:

- **connectedCallback** — guards on `_isInitialized`, defers `_mount` via `Promise.resolve().then()` so children are parsed before capture.
- **Child capture** — iterates `childNodes`; nodes with a `slot` attribute → `slots[slotName]`; others (text nodes only if `textContent.trim()`) → `children`. Captured once, projected as **raw DOM nodes — not reactive** to later slot changes.
- **Props Proxy** — `props.children` → children array, `props.slots` → slots record, any other key → `() => { version(); return self.getAttribute(name); }`. Attributes reactive via an internal `_version` signal; `setAttribute`/`removeAttribute` are overridden to bump it and `flush()` for synchronous propagation. Missing attributes return `null`.
- **Render scope** — `_mount` wraps `mount(render(props), this)` in `scope()`, storing dispose on `_dispose`.
- **disconnectedCallback** — calls `_dispose()`, resets `_isInitialized` → reconnect re-runs render from scratch.

## `$ref` / `$collection` (`lib/$ref.ts`, `lib/$collection.ts`, `lib/internal/reactive.ts`, `lib/internal/selectors.ts`)

Imperative escape hatch over existing DOM. `createReactive(element)` builds the shared `DomWrapper` (`bind`/`on`/`hooks` returning the wrapper for chaining, plus a `node` getter). `bind` detects `INPUT`/`TEXTAREA`/`SELECT` (frozen `FORM_ELEMENTS`) and targets `.value` instead of `.textContent` for primitives; an object arg sets arbitrary attributes. `hooks` **fires `afterMount` immediately** if the element is already `isMounted`.

- **`$ref(selector)`** — `document.querySelector` synchronously; wraps immediately if found. Otherwise lazily starts watching on the first `bind`/`on`/`hooks` call: registers an op in the global `multiSelectors` Map, ensures `refObserver`. The watcher's `processNode` takes the first match, drains queued ops, then runs `processMountQueue` so `afterMount` hooks fire. Returns a callable `DomRef` — `ref()` / `ref.node` returns the node; methods chain. Also exposes a `.node` getter.
- **`$collection(selector)`** — wraps every current match and registers with `registerMultiOp` so new matches auto-apply queued ops. Returns a `DomCollection`: callable `collection(index = 0)`, dynamic `length`, `forEach`, `bind`/`on`/`hooks` (all current + future), `dispose()`. Indexed `[i]` access is populated **only for the initial set** — use the callable form for dynamically-added elements.
- **`refObserver`** — separate from the container observer. Watches `document.body` `{ childList: true, subtree: true }`; removals feed `cleanupQueue`, any mutation schedules `checkMultiSelectors` via microtask. `cleanupRefObserver` disconnects when `multiSelectors.size === 0`.

## `registry` (`lib/registry.ts`)

Public, exported. `addEffect(node, fn)` wraps `fn` in `effect(...)` bracketed by `beforeUpdate`/`afterUpdate` (only when `state.isMounted`; hook errors caught, `phase: 'update'`, no fallback). `addHook(element, type, handler)` pushes onto `state.hooks[type]` (stacking). Both accumulative.

## `renderProp` (`lib/internal/utils.ts`)

`DIRECT_PROPS` = `value`/`checked`/`selected`/`innerHTML` → set the IDL property directly (falsy → `''`, never `removeAttribute`). Other keys: `isFalsy` (`false`/`null`/`undefined`) → `removeAttribute`; `true` → empty string; arrays → space-joined filtering falsy (class lists); else `setAttribute`. **`isFalsy(0)` is false** — signal `0` renders `"0"`.

## Non-obvious behaviors (gotchas)

- **Treat returned HellaNodes as immutable.** Static subtrees are shared by reference across invocations of the same `html\`\`` literal.
- **`html\`${value}\`` returns `value` directly**, unwrapped.
- **`<>...</>` and multiple roots** are supported inside `html\`\`` at any nesting; multiple roots auto-wrap in a fragment.
- **`HellaNode.children` is always flat** — nested arrays are impossible after substitution.
- **Passthrough components bypass `component()`** — `ForEach`/`Portal`/`Lazy`/`Transition` set `isDynamic: true` and are called directly by `appendToParent` with the parent. `<${Comp}>` in templates wraps in `component()` only if `Comp.isDynamic` is false.
- **One scoped observer covers every `mount()` target** (`observedContainers`); a second mount target adds no second observer.
- **`isMounted`: root sync, descendants async.** Tests must call `app.flush()` on the mount handle before asserting on `afterMount`-gated behavior.
- **Hook element-argument rule.** `afterMount`/`beforeDestroy`/`beforeUpdate`/`afterUpdate` receive the element; `beforeMount`/`afterDestroy` do not. `beforeMount` fires synchronously before `appendChild`; `afterMount` fires deferred via the observer's microtask. Multiple hooks of the same type all fire in insertion order.
- **`bind:` effects run `beforeUpdate`/`afterUpdate`** only when `state.isMounted` is true.
- **`onError(null)` clears all handlers**; a function registers and returns an unregister. No handlers → `console.error('[dom]', error)` and no UI change.
- **Event types registered for delegation stay registered for the page lifetime** — only `resetEventState()` (called by `resetDom()` in tests) removes them. Delegated handlers never auto-stop propagation.

## Performance

- **`while` + cached `length`** on every hot path — no `for…of`/`forEach`.
- **`DocumentFragment`** for every multi-insert (ForEach first render / no-overlap / empty-recovery, Portal fragment).
- **ForEach collection reuse** — temp Maps/arrays/Sets `clear()` + reference-swap, never reallocated.
- **`__static` sharing** — static subtrees returned by reference, no deep clone.
- **`composedPath()`** for delegation (pre-computed ancestor chain).
- **`handlerCounts` fast-exit** + inline prefix matching in `ATTR_REGEX` (single regex pass).
- **Module-level cached regexes** (`TOKEN_REGEX`, `PLACEHOLDER_REGEX`, `SKIP_REGEX`, `ATTR_REGEX`), `lastIndex = 0` before each use.
- **`WeakMap`/`WeakSet`** for `elementMap`, `observedContainers`, `handlingBoundaries`, `processedNodes` — GC with the DOM nodes.
- **Persistent text-node anchors** (`createTextNode("")`) for ForEach/Portal/Lazy/Transition/reactive children — never recreated; no comment nodes in the DOM.
- **Bulk removal** in ForEach (collect before mutating); events cleanup iterates handlers once.
- **Fast `isHellaNode`** — dom-local `typeof === "object" && v.tag !== undefined`, avoiding `isPlainObject`'s `getPrototypeOf` + `Object.prototype.toString.call` on every child resolution / ForEach item / dispatch step. `isPlainObject` is retained in core for cold input-validation paths (`$ref`/`$collection`).
- **`toText` vs `resolveText`** — `toText(value)` assumes an already-resolved input and skips the `resolveValue` call; `resolveText` (which keeps the call) is used only where the input may still be a function/signal (`reactive.ts` bind path). Mount-side text rendering routes through `toText`.
- **Lazy `ElementState` collections** — `effects` / `directHandlers` / `hooks` allocate on first use, not at `getState`. A reactive leaf pays only `{ handlers, isMounted }`.
- **Single WeakMap lookup** on hot guards — `peekState(node)?.field` replaces the `hasState` + `getState` double-lookup in `appendToParent`'s boundary check and in `delegatedHandler`'s per-path-element walk.

## Testing approach (`tests/`)

Integration-style, public API only. Runtime imports come from **`@hellajs/dom/bundle`** (the instrumented bundle — see root `bunfig.toml`); type-only imports from `@hellajs/dom`. Reactive primitives import from `@hellajs/core`. `onError` imports from `@hellajs/dom/bundle`. Test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) import from `../../../utils/test-helpers.js`. The publicly-exported introspection helpers used directly: `peekState`, `getState`, `multiSelectors`, `checkMultiSelectors`. Track call counts with `mock()` from `bun:test` — never boolean flags or counters.

`tests/helpers.ts` exports `fallbackHandler(defaultFallback)` — registers an `onError` handler that delegates to `context.config?.fallback?.(error)` else returns the default; the standard pattern for exercising element-level fallback through the global handler.

- `mount.test.ts` — sync/async component fns, signal `0` renders `"0"`, async-mount error routing.
- `mount-validation.test.ts`, `mount-targets.test.ts`, `mount-binding.test.ts`, `mount-edge-cases.test.ts` — target-miss throw, selector-vs-Element targets, `DIRECT_PROPS` falsy fallback, raw-`Node` passthrough, `componentScope`/`errorConfig` transfer to state.
- `async-mount.test.ts` — async resolution + rejection routing through `onError`/`dispatchError`.
- `reactive-dynamic-children.test.ts` — `appendToParent` Proxy forwarding for dynamic-component children.
- `html.test.ts`, `template.test.ts` — caching, parsing edge cases, fragments, dynamic components, error-config materialization, deep nesting.
- `foreach.test.ts` — keyed reconciliation, LIS moves, `item.id` fallback, index-keyed reference equality, key-only reuse preserving signal children, duplicate keys (last-wins), large-list clearing, no-change no-op, fragments, sibling preservation.
- `lazy.test.ts` — loading/fallback/success, props forwarding, `signal` forwarding, unmount-during-load guards for both paths.
- `transition.test.ts` — enter/leave classes, rapid-toggle rescue, `appear` variants, timer cleanup on parent removal.
- `portal.test.ts` — every insert type, cleanup on removal, missing-target throw.
- `error-boundary.test.ts`, `error.test.ts`, `error-reset.test.ts`, `error-catching.test.ts` — implicit/explicit boundaries, category-only is not a boundary, cache invalidation, sibling-preservation vs replacement, nested boundaries, `onError` semantics, `reset` re-render, phase coverage.
- `delegated-events.test.ts`, `direct-events.test.ts` — capture-phase delegation, direct bubble-phase handlers, cleanup/removal.
- `lifecycle.test.ts` — execution order, deeply-nested `afterMount`, destroy cleanup with handler removal.
- `element.test.ts` — custom-element props/slots/lifecycle, attribute reactivity, reconnect.
- `ref.test.ts`, `collection.test.ts` — queued ops, auto-watching, method chaining, `dispose()`, selector-registry state.
- `component.test.ts`, `registry.test.ts` — `component()` scope wrapping, `addEffect`/`addHook` stacking.

**Pattern across all tests:** `mount` → drive signals → `flush()` (sync, no `await`) → assert DOM. For lifecycle assertions, `app.flush()` on the mount handle processes deferred lifecycle hooks. For removal assertions, `el.remove()` then `await delay()` to let the MutationObserver fire and process cleanup. Never test two behaviors in one test; aim for 100% coverage.

Run with `bun coverage dom`.
</dom-package-instructions>
