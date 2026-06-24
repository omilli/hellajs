---
applyTo: "packages/dom/**"
---

<dom-package-instructions>
Surgical DOM rendering without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. The DOM is mutated directly from `HellaNode` AST objects produced by the babel plugin or the `html\`\`` tagged template. State is kept in a `WeakMap<Node, ElementState>`, never on DOM elements themselves.

## Public exports (`lib/index.ts`)

| Export | Kind | Source |
|---|---|---|
| `mount`, `html`, `component`, `element`, `onError` | Core API | `lib/{mount,html,component,element,error}.ts` |
| `ForEach`, `Portal`, `Lazy`, `Transition` | Dynamic components (set `isDynamic: true`) | `lib/{ForEach,Portal,Lazy,Transition}.ts` |
| `$ref`, `$collection` | Reactive refs over existing DOM | `lib/$ref.ts`, `lib/$collection.ts` |
| `registry` | Effect/hook registration API (`addEffect`, `addHook`) | `lib/registry.ts` |
| `flushMount`, `queueCleanup`, `resetDomState` | Testing utilities | `lib/internal/testing.ts` |
| `checkMultiSelectors`, `multiSelectors` | Selector watcher state (testing/introspection) | `lib/internal/selectors.ts` |
| `getState`, `hasState`, `peekState`, `deleteState` | ElementState access (testing/introspection) | `lib/internal/state.ts` |
| `HellaNode`, `HellaChild`, `ElementHooks`, `HookType`, `ErrorConfig`, `ErrorContext`, `ErrorFn`, `DomWrapper`, `DomRef`, `DomCollection`, `ForEachProps`, `PortalProps`, `LazyProps`, `TransitionProps`, `ComponentFn`, `RenderFn`, … | Type-only | `lib/types/nodes.d.ts` |
| `DOMEventMap`, `HTMLAttributeMap`, `HTMLAttributes` | Type-only | `lib/types/attributes.d.ts` |

`mount` throws `[dom] mount: target "<target>" not found in document` if the selector misses. `ForEach` throws `[dom] ForEach: each is required` / `[dom] ForEach: use must be a function`. `Lazy` throws `[dom] Lazy: loader must be a function`. `Portal` throws `[dom] Portal: target "<to>" not found in document` at first effect run.

## ElementState (`lib/internal/state.ts`)

`WeakMap<Node, ElementState>` — sole source of per-node state. `getState` lazily creates; `peekState` returns `undefined` if absent; `hasState`/`deleteState` are the obvious wrappers. Initial shape: `{ effects: [], handlers: {}, directHandlers: new Map(), hooks: {}, isMounted: false }`.

| Field | Type | Purpose |
|---|---|---|
| `effects` | `(() => void)[]` | Effect disposer functions; called during cleanup. |
| `handlers` | `Record<string, EventListener>` | Delegated handlers (one per type per element). |
| `directHandlers` | `Map<string, EventListener>` | Direct (`e:`) handlers; removed via `removeEventListener` on cleanup. |
| `hooks` | `Partial<Record<HookType, Array>>` | Stacked lifecycle hooks; multiple per type all execute. |
| `isMounted` | `boolean` | True after `afterMount` has fired. Root set sync in `mount()`; descendants set async via the container observer. |
| `componentScope` | `() => void` | Dispose function from `scope()` — attached when a node is created by `component()`. |
| `portalCleanup` / `lazyCleanup` / `transitionCleanup` | `() => void` | Optional disposers registered by Portal/Lazy/Transition (Portal registers on its anchor, Lazy and Transition on the parent). |
| `errorConfig` | `ErrorConfig` | Set when the node carries any `error:` attribute. |
| `originalNode` | `HellaNode` | Snapshot for `reset()` re-render; set alongside `errorConfig`. |
| `cachedBoundary` | `Element` | Memoized nearest boundary; see error system. |

## HellaNode (`lib/types/nodes.d.ts`)

Plain object produced by the babel plugin or `html\`\``; consumed by `mountNode`.

| Field | Type | Purpose |
|---|---|---|
| `tag` | `keyof HTMLAttributeMap` | Element tag, or `"$"` for fragment. |
| `props` | `HTMLAttributes<T>` | Static attributes applied once at mount. |
| `on` | `Record<string, EventListener>` | Delegated handlers (`on:` prefix). |
| `e` | `Record<string, EventListener>` | Direct non-delegated handlers (`e:` prefix). |
| `bind` | `Record<string, HellaPrimitive>` | Reactive bindings wrapped in `registry.addEffect` (`bind:` prefix). |
| `hooks` | `ElementHooks` | Lifecycle hooks (`hook:` prefix). |
| `error` | `ErrorConfig` | `error:fallback` / `error:category` / `error:boundary` (`error:` prefix). |
| `children` | `HellaChild[]` | Flattened (`Array.flat()`) during template substitution. |
| `__scope` | `() => void` | Attached by `component()`; copied to `state.componentScope` at mount. |
| `__static` | `true` | Template-cache marker — subtree has zero placeholder deps; shared across invocations, not cloned. |

## Attribute prefixes

| Prefix | Bucket | Behavior |
|---|---|---|
| `on:` | `node.on` | Delegated: one `document.body.addEventListener(type, …, true)` per type. |
| `e:` | `node.e` | Direct: `element.addEventListener` wrapped with error-boundary support. |
| `bind:` | `node.bind` | Reactive: `registry.addEffect` re-runs on dependency change. |
| `hook:` | `node.hooks` | Lifecycle: `beforeMount`/`afterMount`/`beforeDestroy`/`afterDestroy`/`beforeUpdate`/`afterUpdate`. |
| `error:` | `node.error` | Config: `error:fallback` (fn), `error:category` (string), `error:boundary` (boolean). |
| (none) | `node.props` | Static attribute, applied once. |

## `html\`\`` parsing & caching (`lib/html.ts`, `lib/internal/template.ts`)

`templateCache: WeakMap<TemplateStringsArray, HtmlInternalNode>` keys the parsed AST by the template strings identity. First call builds the AST; subsequent calls skip parsing and only run `cloneWithValues`.

- **Tokenization.** `SKIP_REGEX` strips comments, DOCTYPE, and CDATA first. `<>`/`</>` are rewritten to `<__fragment__>`/`</__fragment__>` and parsed back to `tag: "$"`. `TOKEN_REGEX` matches closing/opening/self-closing tags and text. `ATTR_REGEX` matches every prefix (`error:`, `e:`, `on:`, `bind:`, `hook:`) inline plus bare names; `name.startsWith(...)` chains bucket each attribute with no extra pass.
- **Placeholders.** Interpolations become `__SLOT_N__` markers in the string and `{ __placeholder: N }` markers in the AST. `parseTextContent` splits text containing slots. **Placeholder format is `__SLOT_N__`, not `__HELLA_N__`.**
- **Static-subtree optimization.** After parsing, `markStaticSubtrees` walks the AST; any node whose `props`/`on`/`e`/`bind`/`hooks`/`error`/`children` contain no `__placeholder` and no `__dynamicComponent` is tagged `__static = true`. `cloneWithValues` then short-circuits on `Object.hasOwn(node, "__static")` and returns the node as-is — **static subtrees are shared by reference across every invocation of the same literal, never cloned.** This is the main reason mutating a returned HellaNode is unsafe.
- **Root interpolation unwrap.** If the trimmed template is exactly `__SLOT_N__`, `parseHTML` returns the placeholder value directly — `html\`${value}\`` yields `value` itself, not a wrapper node.
- **Multiple roots.** More than one root element is wrapped in `{ tag: "$", children: nodes }`.
- **Dynamic components.** `<${Comp}>` becomes `{ __dynamicComponent: N, props, children }`; `cloneWithValues` resolves it to `Comp(mergedProps)` if `Comp.isDynamic` (passthrough) or wraps with `component(Comp, mergedProps)` otherwise. Attribute buckets (`props`/`on`/`e`/`bind`/`hooks`) are merged into a single props object; a single child is unwrapped, multiple become an array.
- **Unclosed tags.** Anything left on the parse stack at EOF is flushed to the result list — no throw.
- **Cloning rules.** Arrays flat-clone each element; `HellaNode` shallow-clones each bucket; `__placeholder`/`__static`/`__dynamicComponent` short-circuit. Children are `.flat()`-ed to prevent nested arrays.

## `mount(node, target = "#app")` (`lib/mount.ts`)

Resolves `node` via `resolveValue` (calls it if it's a function). If the result is a thenable (`typeof resolved.then === "function"`), `attach` is deferred via `.then`; otherwise `attach` runs synchronously. `attach` calls `mountNode`, `container.replaceChildren(...)`, then `registerContainer(container)` to start the scoped observer, and sets `getState(mountedNode).isMounted = true` on the root only.

- **Async mount rejections** route through `dispatchError(err, { phase: 'mount' })` — no element context, so no fallback rendering; surfaces via `onError` or `console.error('[dom]', err)`.
- **`setMountNode` indirection.** `mount.ts` registers the `mountNode` function with `dispatch.ts` at module init to break a circular import (`render.ts` ↔ `dispatch.ts`). This is why `events.ts` reads `getMountNode()` lazily when rendering fallback UI.

## `mountNode` and `appendToParent` (`lib/internal/render.ts`)

`mountNode` creates the element (or fragment for `tag: "$"`), copies `__scope` and `error` onto state, runs `beforeMount` (errors caught, dispatched with `phase: 'mount'`, no fallback), applies `props` via `renderProp`, registers `on:` (delegated), `e:` (direct), and `bind:` (effect-wrapped; errors caught, dispatched with `phase: 'update'`, fallback rendered via `target.replaceChildren(mountNode(fallback))` on `currentBoundary ?? element`). Children are appended via `appendToParent`, which recognizes dynamic functions (`child.isDynamic`) and calls them with the parent directly.

- **Reactive child effect.** For non-dynamic function children, `appendToParent` creates a text anchor, an empty `renderedNodes` array, and one effect that on each run: resolves the value, `cleanupSubtree` + `removeChild` on every previous node, then re-inserts. If the resolved value is itself a dynamic function, a `Proxy` parent intercepts `appendChild` to track inserted nodes while still inserting before the anchor. Errors are caught, dispatched with `phase: 'mount'`, and the fallback is `insertBefore`-ed at the anchor — **this preserves siblings**, unlike the bind/event path which uses `replaceChildren`.

## Cleanup system (`lib/internal/cleanup.ts`, `lib/internal/queue.ts`)

Two cooperating mechanisms share one `MutationObserver`:

- **Synchronous `cleanupSubtree(root)`** — called directly by `appendToParent` (reactive child swap), ForEach (stale node removal and list clear), and Transition (leave completion). Runs `traverseDescendants` (iterative stack, no recursion), then `clean(node)` per descendant: `beforeDestroy` → `componentScope?.()` → `portalCleanup?.()` → `lazyCleanup?.()` → `transitionCleanup?.()` → drain `effects` → `removeDirectHandlers` → `afterDestroy` → `deleteState`.
- **Scoped observer safety net** — `mount()` calls `registerContainer(container)`; `ensureContainerObserver` lazily creates one `MutationObserver` shared across all mount targets (tracked by `observedContainers: WeakSet<Element>`), observing `{ childList: true, subtree: true }`. Removed nodes with state go to `cleanupQueue`; added element nodes go to `mountQueue`. Both drain on `queueMicrotask`. `processCleanupQueue` skips any node still `isConnected` or still having a `parentNode` (re-parented, not removed).

- **`runHooks` element-argument rule.** `beforeMount` and `afterDestroy` are called with no argument; every other hook receives the element.
- **`resetEventState` / `resetQueueState` / `resetSelectorState` / `resetDomState`** (testing) tear down listeners, observers, and queues between tests.

## Mount queue (`lib/internal/queue.ts`)

Same observer that drives cleanup also populates `mountQueue` with added element nodes. `processMountQueue` traverses each queued node's descendants; for every element with state, sets `isMounted = true` and runs `afterMount`. Skips nodes not `isConnected` at flush time.

- **Root vs descendants.** The root's `isMounted` is set synchronously in `mount()`; descendant `isMounted` is set asynchronously via this queue (deferred one microtask). Tests must call `flushMount(container)` to force the queue before asserting on `afterMount` effects.
- **`flushMount(root = document.body)`** adds all direct children of `root` to `mountQueue` and processes it synchronously — the public testing escape hatch.

## Event delegation (`lib/internal/events.ts`, `lib/internal/counts.ts`)

- **Two Sets track types.** `globalListeners: Set<string>` records types that have a real `document.body.addEventListener(type, delegatedHandler, true)` listener (capture phase). `handlerCounts: Set<string>` is the fast-exit optimization checked at the top of `delegatedHandler`. **Neither is decremented during cleanup** — types remain registered for the page lifetime until `resetEventState()`.
- **`delegatedHandler`** reads `event.composedPath()` (pre-computed ancestor chain) and walks it; for each path element with `state.handlers[type]`, invokes `handler.call(element, event)` inside try/catch. Errors dispatch with `phase: 'event'` and render fallback on `findBoundary(element) ?? element` via `replaceChildren`. **No automatic `stopPropagation`** — the full path is always traversed.
- **Direct (`e:`) handlers** are wrapped per-instance with the same error handling and stored in `state.directHandlers`; `removeDirectHandlers` iterates and `removeEventListener`s each on cleanup.

## Keyed reconciliation — `ForEach` (`lib/ForEach.ts`)

`ForEach` returns a function with `isDynamic: true`; `appendToParent` calls it directly with the parent. Inside, it creates a text anchor and one effect holding the live collections (`keyToNode`, `keyToItem`, `currentKeys`) and the reusable temp collections (`newKeys`, `newKeyToNode`, `newKeyToItem`, `nodesToRemove`, `keyToOldIndex`, `toMove`).

**Key resolution.** `element.props.key` → `item.id` → array index. The first two mark `hasExplicitKey = true`; the index fallback does not.

**Reuse rule.** `!node || (!hasExplicitKey && oldItem !== item)` → call `resolveNode` (fresh node). So explicit keys reuse the existing DOM node by key identity regardless of item reference; index-fallback keys require the same item reference to reuse.

**Render paths.**
- *First render* (`currentKeys.length === 0`): build all nodes into a `DocumentFragment`, single `insertBefore(fragment, anchor)`.
- *Stale removal* (always, when not first render): every existing node whose key isn't in `newKeyToNode` (or whose node identity changed) is collected into `nodesToRemove`, then `cleanupSubtree` + `removeChild`-ed in a batch.
- *No-overlap fast path*: if no key in `newKeys` exists in `keyToNode`, append all new nodes via a single fragment.
- *LIS path*: build `mapped[i]` = old index if the node was reused else `-1`. Binary-search LIS over the reused indices (`O(n log n)`); the LIS set is removed from `toMove`. Walk `newKeys` **backwards** from the anchor, calling `insertBefore(node, moveAnchor)` only for indices in `toMove`. This produces minimal DOM moves.
- *Empty list*: remove and `cleanupSubtree` every node in `keyToNode`, clear maps.
- *Collection swap*: after each render, the live and temp collections are swapped by reference (`newKeyToNode` becomes the new `keyToNode`, etc.) — `clear()` the temps next round, never `new Map()`/`new Array()`.

## `Portal` (`lib/Portal.ts`)

Renders children to a remote target. Creates an anchor in the local parent, then in a single effect (guarded by `if (portalNodes.length > 0) return` so it runs once) resolves `document.querySelector(to)`, builds nodes into a fragment, and applies it via the target's `appendChild`/`prepend`/`replaceChildren`/`before`/`after` method (`type` prop, default `append`). `state.portalCleanup` (registered on the **anchor**, not the parent) removes each tracked node from its current parent on cleanup. Throws if the target selector misses.

## `Lazy` (`lib/Lazy.ts`)

Async component loader with cancellation. Creates an anchor; optionally `insertBefore`s a `loading` node. Allocates an `AbortController` and registers `state.lazyCleanup` on the **parent** that sets `isCancelled = true` and `controller.abort()`. Calls `props.loader({ signal: controller.signal })`, then:

- **Success path** — `.then(component => …)`: guards on `isCancelled || !anchor.parentNode`; removes the loading node; if `component` is a function, calls `component(props.props)`, else uses it directly; `mountNode`s the result and `insertBefore`s at the anchor. **No nested Promise unwrapping** — the loader must resolve to a `ComponentFn | HellaNode`, not a `Promise` of one.
- **Error path** — `.catch(() => …)`: same guards; removes loading; if `props.fallback` exists, `resolveNode` and `insertBefore` at the anchor. **Errors do NOT bubble to `onError`** — fallback is local-only.
- **Cancellation** — both `.then` and `.catch` check the guard, so resolving/rejecting after parent removal is a no-op. The `signal` is for user-side network cancellation; pass it through to `fetch`/`AbortController`-aware APIs.

## `Transition` (`lib/Transition.ts`)

Enter/leave CSS animations. Holds `current` (visible node or null), `leaveTimer`, and `isFirstRender`. One effect re-runs on `show` changes:

- *Enter* (`show=true`, no `current`, no `leaveTimer`): `resolveNode(children)`, `insertBefore` at anchor. If `isFirstRender && appear`, add the `appear` class (string) or fall back to `enter`; if `!isFirstRender && enter`, add `enter`. **Without `appear`, no class is added on first mount.**
- *Rescue* (`show=true` with active `leaveTimer`): `clearTimeout`, remove `leave` class, keep the node — this is rapid-toggle rescue.
- *Leave with class* (`show=false`, `current`, `leave`): add `leave` class, schedule `setTimeout(cleanup, duration + 50)`. The 50ms buffer absorbs frame-timing drift. The timer callback runs `cleanupSubtree` + `removeChild`.
- *Leave without class* (`show=false`, no `leave`): `cleanupSubtree` + `removeChild` synchronously.
- **`transitionCleanup`** on the parent clears any pending `leaveTimer` when the parent is removed mid-leave.
- **Enter class stays on the node after the animation** — harmless, CSS animations play once. Subsequent enters re-add it (idempotent).
- **Default `duration` is 300ms**; it must match the CSS animation duration (used only for scheduling leave cleanup, not for measuring animation).

## Error system (`lib/internal/dispatch.ts`, `lib/error.ts`)

`onError(fn)` adds to `handlers: Set<ErrorFn>`; `onError(null)` clears all. Returns an unregister function. **With no handlers registered, `dispatchError` logs `[dom] <error>` to `console.error` and returns `null`** (no UI change). Handler errors are caught and logged (`[dom] Error handler threw:`).

- **Boundary detection.** `findBoundary(origin)` walks `parentElement` from the origin and returns the nearest element whose `state.errorConfig` has `boundary || fallback`. **A `category`-only config is NOT a boundary.** Result is memoized on `state.cachedBoundary`; the cache is revalidated on each lookup (must still be `isConnected` and still have `boundary || fallback` config).
- **Config resolution.** `resolveErrorConfig(origin)` walks the same way but returns the first config of any kind (including `category`-only) — used to populate `context.config` for handlers even when no boundary exists.
- **Infinite-loop guard.** `handlingBoundaries: WeakSet<Element>` tracks boundaries mid-handling; a second error from a boundary already in the set logs `[dom] Error during error handling - preventing infinite loop:` and returns `null`.
- **Reset.** `dispatchError` synthesizes `context.reset` only when the boundary has `state.originalNode` (set at mount for any element with an `error:` config). `reset()` re-runs `boundary.replaceChildren(mountNodeFn(originalNode))`.
- **First-non-null-wins.** Handlers iterate in insertion order; the first to return a HellaNode wins.
- **Per-phase fallback rendering (caller responsibility).** `dispatchError` only returns the fallback HellaNode; the caller decides how to mount it:
  - Reactive child error → `insertBefore` at the anchor (preserves siblings).
  - `bind:` error → `replaceChildren` on `currentBoundary ?? element` (replaces all siblings).
  - `on:`/`e:` error → `replaceChildren` on `findBoundary(element) ?? element`.
  - `beforeMount` error → no fallback rendered (element continues mounting).
  - `beforeUpdate`/`afterUpdate` error → dispatched with `phase: 'update'`, no fallback rendered (bindings remain functional).
  - Render-phase error (inside `component()`) → dispatched with `phase: 'render'`, returns empty fragment `{ tag: '$', children: [] }`.

## `element()` custom elements (`lib/element.ts`)

Defines a custom element via `customElements.define`. Light DOM only — no shadow DOM (would break reactivity internals). Each instance:

- **connectedCallback** — guards on `_isInitialized`, then defers `_mount` via `Promise.resolve().then()` so children are parsed before capture.
- **Child capture** — iterates `childNodes`; nodes with a `slot` attribute go to `slots[slotName]`, others (text nodes only if `textContent.trim()`) go to `children`. Captured once, projected as raw DOM nodes — **not reactive** to later slot changes.
- **Props Proxy** — `props.children` returns the children array, `props.slots` the slots record, any other key returns `() => { version(); return self.getAttribute(name); }`. Attributes are reactive via an internal `_version` signal; `setAttribute`/`removeAttribute` are overridden to bump it and call `flush()` for synchronous propagation. Missing attributes return `null`.
- **Render scope** — `_mount` wraps `mount(render(props), this)` in `scope()`, storing the dispose function on `_dispose`.
- **disconnectedCallback** — calls `_dispose()`, resets `_isInitialized`, allowing reconnect to re-run the render from scratch.

## `$ref` and `$collection` (`lib/$ref.ts`, `lib/$collection.ts`, `lib/internal/selectors.ts`)

Reactive wrappers over existing DOM elements (the imperative escape hatch). `createReactive(element)` builds the shared `DomWrapper` with `bind`/`on`/`hooks` methods that delegate to `registry.addEffect`/`setNodeHandler`/`registry.addHook` and return the wrapper for chaining. `bind` detects `INPUT`/`TEXTAREA`/`SELECT` (via a frozen `FORM_ELEMENTS` set) and uses `.value` instead of `.textContent` for primitive values.

- **`$ref(selector)`** — `document.querySelector` synchronously; if found, wraps immediately. If not, lazily starts watching on first `bind`/`on`/`hooks` call: registers an op in the global `multiSelectors` Map under the selector, ensures `refObserver`. The watcher's `processNode` takes the first matched element, drains queued ops, then triggers `processMountQueue` so `afterMount` hooks fire. Returns a callable `DomRef` — `ref()` returns the node, `ref.bind(...)`/`ref.on(...)`/`ref.hooks(...)` chain.
- **`$collection(selector)`** — wraps every current match and registers with `registerMultiOp` so new matches auto-apply queued ops. Returns a `DomCollection`: callable as `collection(index = 0)` to get a node, with `length`, indexed `[i]` access, `forEach`, `bind`/`on`/`hooks` (applied to all current and future elements), and `dispose()` to stop watching.
- **`refObserver`** — separate from the container observer. Watches `document.body` with `{ childList: true, subtree: true }`; on removals, feeds `cleanupQueue`; on any mutation, schedules `checkMultiSelectors` via `checkMultiSelectors`. `cleanupRefObserver` disconnects when `multiSelectors.size === 0`.

## `registry` (`lib/registry.ts`)

Public, exported. `addEffect(node, fn)` wraps `fn` in `effect(...)` with `beforeUpdate`/`afterUpdate` hooks (only when `state.isMounted`) — both hook errors are caught and dispatched with `phase: 'update'` but no fallback is rendered. `addHook(element, type, handler)` pushes onto `state.hooks[type]`, stacking. Both are accumulative.

## Performance optimizations

- **`while` loops with cached `length`** everywhere on hot paths — no `for…of`, no `forEach` in hot code.
- **`DocumentFragment`** for every multi-insert (first render, no-overlap path, empty-list recovery).
- **Collection reuse in ForEach** — temp Maps/arrays/sets are `clear()`-ed and references swapped, never reallocated per render.
- **`__static` template sharing** — static subtrees are returned by reference from `cloneWithValues`, eliminating deep cloning for templates with no interpolated content.
- **`composedPath()`** for delegation traversal — pre-computed ancestor chain, no walking parents.
- **`handlerCounts` fast-exit** — `delegatedHandler` returns immediately if a type has no registered handlers.
- **Inline prefix matching** in `ATTR_REGEX` — single regex pass classifies every attribute bucket.
- **Cached regexes** — `TOKEN_REGEX`, `PLACEHOLDER_REGEX`, `SKIP_REGEX`, `ATTR_REGEX` are module-level; `lastIndex = 0` is reset before each use.
- **`WeakMap`/`WeakSet`** for `elementMap`, `observedContainers`, `handlingBoundaries`, `processedNodes` — automatic GC with the DOM nodes.
- **Text-node anchors** (empty `createTextNode("")`) persist across updates for ForEach/Portal/Lazy/Transition/reactive children — never recreated, no comment nodes in the DOM.
- **Bulk removal** — ForEach collects stale nodes before any DOM mutation; events cleanup iterates handlers once.
- **`DIRECT_PROPS` set** (`value`, `checked`, `selected`, `innerHTML`) — set as element properties directly, bypassing `setAttribute`/`removeAttribute`.

## Non-obvious behaviors

- **Mutating a returned `HellaNode` is unsafe.** Static subtrees are shared by reference across invocations of the same `html\`\`` literal. Treat HellaNodes as immutable after construction.
- **`html\`${value}\`` returns `value` directly**, unwrapped — useful for dynamic-root templates but easy to misread.
- **`<>...</>` is supported inside `html\`\```** at any nesting level, parsed via `__fragment__` rewrite. Multiple root elements are auto-wrapped in a fragment.
- **`HellaNode.children` is always flat** — `.flat()` runs during substitution; nested arrays are impossible.
- **Boolean attribute semantics** — `renderProp` removes the attribute for `false`/`null`/`undefined` (`isFalsy`); sets empty string for `true`; joins arrays with spaces (filtering falsy) for class lists. **Zero is preserved** (`isFalsy(0)` is `false`); it renders as `"0"`.
- **`DIRECT_PROPS` bypass attribute reflection** — `value`/`checked`/`selected`/`innerHTML` set the IDL property directly; falsy values become `''`, not removed.
- **`isHellaNode` checks `tag !== undefined`** on a plain object — the only structural discriminator.
- **`Passthrough` components bypass `component()`** — `ForEach`, `Portal`, `Lazy`, `Transition` set `isDynamic: true` and are called directly by `appendToParent` with the parent element. Dynamic components produced via `<${Comp}>` in templates are wrapped in `component()` only if `Comp.isDynamic` is false.
- **Scoped observer is shared** — one global `MutationObserver` covers every `mount()` target via `observedContainers`; adding a second mount target does not add a second observer.
- **`isMounted` is true for the root immediately, async for descendants.** Tests must `flushMount(container)` before asserting on `afterMount`-gated behavior.
- **`afterMount`/`beforeDestroy`/`beforeUpdate`/`afterUpdate` receive the element; `beforeMount`/`afterDestroy` do not.**
- **Lifecycle stacking** — multiple `hook:beforeMount` (etc.) on the same element all execute in insertion order.
- **`beforeMount` fires synchronously before `appendChild`** during construction; `afterMount` fires deferred via the scoped observer's microtask.
- **`bind:` effects run `beforeUpdate`/`afterUpdate`** only when `state.isMounted` is true.
- **`onError(null)` clears all handlers**; passing a function registers it and returns an unregister.
- **Default error behavior with no `onError` handler is `console.error('[dom]', error)`** and no UI change.
- **A `category`-only `error:` config does not make an element a boundary** — only `boundary` or `fallback` does. `category` is still propagated via `resolveErrorConfig` for handler-side filtering.
- **Reactive child errors preserve siblings** (insertBefore at anchor); `bind:`/`on:`/`e:` errors replace boundary content (`replaceChildren`).
- **Lazy errors are local** — they trigger `props.fallback` but never bubble to `onError`. Loader must resolve to a `ComponentFn | HellaNode`, not a nested Promise.
- **Transition `enter` class is not removed after the animation** — re-entering re-adds it (idempotent). Use `appear` to gate the first-mount animation.
- **Transition cleanup uses `setTimeout(duration + 50)`** — the 50ms buffer absorbs frame-timing drift; `duration` must match the CSS animation.
- **`element()` projects slot children as raw DOM nodes** — not as HellaNodes — captured once before mount; later slot changes are not reactive.
- **`element()` overrides `setAttribute`/`removeAttribute`** for synchronous reactivity; calling them re-runs the version signal and `flush()`s.
- **`element()` reconnect re-runs render from scratch** — `disconnectedCallback` resets `_isInitialized`, the next `connectedCallback` re-defers and re-mounts.
- **`$ref().bind(value)` on form elements targets `.value`**, every other element targets `.textContent`. Pass an object to set arbitrary attributes.
- **Event types registered for delegation stay registered** for the page lifetime — `handlerCounts`/`globalListeners` are not decremented on element cleanup. Only `resetEventState()` (called by `resetDomState()` in tests) removes them.
- **Delegated handlers never auto-stop propagation** — every handler on the composed path fires.

## Testing approach (`tests/`)

Integration-style, public API only — the only internal helpers imported are the publicly-exported `flushMount`, `queueCleanup`, `peekState`, `multiSelectors`. `tests/helpers.ts` exports `fallbackHandler(defaultFallback)` which registers an `onError` handler that delegates to `context.config?.fallback?.(error)` or returns the default — the standard pattern for testing element-level fallback via the global handler.

- `mount.test.ts` — sync/async component functions, signal zero renders `"0"`, async mount error routing.
- `html.test.ts` — template caching, error config materialization, deep nesting, reactive propagation.
- `template.test.ts` — parsing edge cases, fragments, dynamic components, self-closing tags.
- `foreach.test.ts` — keyed reconciliation, LIS moves, item.id fallback, index-keyed reference equality, key-only reuse preserving signal children, duplicate keys (last-wins), large-list clearing, fragment renderers.
- `lazy.test.ts` — loading/fallback/success paths, props forwarding, abort signal forwarding, unmount-during-load guards for both success and error paths.
- `transition.test.ts` — enter/leave classes, rescue on rapid toggle, appear prop variants, timer cleanup on parent removal.
- `portal.test.ts` — every insert type, cleanup on removal, missing target.
- `error-boundary.test.ts` — implicit/explicit boundaries, category-only is not a boundary, cache invalidation, sibling preservation for reactive-child errors vs replacement for bind/event errors, nested boundaries, direct-handler errors.
- `error.test.ts`, `error-reset.test.ts`, `error-catching.test.ts` — `onError` registry semantics, reset re-render, phase coverage.
- `events.test.ts` — delegation, direct handlers, capture-phase ordering.
- `lifecycle.test.ts` — execution order, deeply nested afterMount, destroy cleanup with handler removal.
- `element.test.ts` — custom element props/slots/lifecycle, attribute reactivity, reconnect.
- `ref.test.ts`, `collection.test.ts` — queued ops, auto-watching, method chaining, `dispose()`.
- `component.test.ts`, `registry.test.ts` — `component()` scope wrapping, `registry.addEffect`/`addHook` stacking.

Pattern across all tests: `mount` → drive signals → `flush()` (sync, no `await`) → assert DOM. For lifecycle assertions, `flushMount(container)` between mount and assertion. For removal assertions, `el.remove()` then `queueCleanup(el)` to bypass the microtask-deferred observer.
</dom-package-instructions>
