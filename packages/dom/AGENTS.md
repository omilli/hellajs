<dom-package-instructions>
Surgical DOM rendering — no virtual DOM diffing. Only elements with reactive dependencies update, never whole trees. The DOM is mutated directly from `HellaNode` AST objects produced by the babel plugin or the `html\`\`` tagged template. Per-node state lives in a `WeakMap<Node, ElementState>`, never on DOM nodes. Code/test/docs style rules live in `guides/code.md`, `guides/tests.md`, `guides/docs.md` — not duplicated here.

## Public exports (`lib/index.ts`)

| Export | Kind | Source |
|---|---|---|
| `mount`, `hydrate`, `html`, `component`, `element`, `onError` | Core API | `lib/{mount,hydrate,html,component,element,error}.ts` |
| `ForEach`, `Portal`, `Lazy`, `Transition`, `Suspense` | Dynamic components (`isDynamic: true`) | `lib/{ForEach,Portal,Lazy,Transition,Suspense}.ts` |
| `$ref`, `$collection` | Reactive wrappers over existing DOM | `lib/$ref.ts`, `lib/$collection.ts` |
| `raw` | Raw HTML child sentinel — `ssr` emits verbatim, `hydrate` adopts opaquely | `lib/raw.ts` |
| `registry` | `addEffect` / `addHook` registration API | `lib/registry.ts` |
| `resetDom` | State reset (test/introspection) | `lib/internal/reset.ts` |
| `checkMultiSelectors`, `multiSelectors` | Selector-watcher state (test/introspection) | `lib/internal/selectors.ts` |
| `getState`, `hasState`, `peekState`, `deleteState` | ElementState access (test/introspection) | `lib/internal/state.ts` |
| `HellaNode`, `HellaChild`, `ElementHooks`, `HookType`, `HookFn`, `ErrorConfig`, `ErrorContext`, `ErrorFn`, `DirectListenerSpec`, `DomWrapper`, `DomRef`, `DomCollection`, `ForEachProps`, `PortalProps`, `LazyProps`, `TransitionProps`, `SuspenseProps`, `ComponentFn`, `RenderFn`, … | Type-only | `lib/types/nodes.d.ts` |
| `DOMEventMap`, `HTMLAttributeMap`, `HTMLAttributes` | Type-only | `lib/types/attributes.d.ts` |

**Throw contracts.** `mount` → `[dom] mount: target "<target>" not found in document`. `ForEach` → `[dom] ForEach: each is required` / `[dom] ForEach: use must be a function`. `element` → `[dom] element: tagName must be a hyphenated string / render must be a function`. `Lazy` → `[dom] Lazy: loader must be a function`. `Portal` → `[dom] Portal: target "<to>" not found in document` (at first effect run, not at construction).

## ElementState (`lib/internal/state.ts`) — `WeakMap<Node, ElementState>`

`getState` lazily creates; `peekState` returns `undefined` if absent; `hasState`/`deleteState` wrap `has`/`delete`. Initial shape: `{ isMounted: false }`. All four collections — `handlers`, `effects`, `directHandlers`, `hooks` — are **lazy-allocated on first use** (`setNodeHandler` → `handlers` object, `registry.addEffect` → `effects` array, `setDirectHandler` → `directHandlers` Map, `registry.addHook` → `hooks` object) — elements that never carry `on:` / a function-ref prop / `e:` / `hook:` pay zero collection allocation at mount (guide `code.md` §Memory).

| Field | Purpose |
|---|---|
| `effects` | `(() => void)[]` effect disposers; drained during cleanup. |
| `handlers` | `Record<type, EventListener>` delegated handlers (one per type per element); lazily allocated by `setNodeHandler`. |
| `directHandlers` | `Map<type, DirectListenerSpec>` — wrapped `e:` handler + caller options; `removeEventListener`-ed with the same options on cleanup. |
| `hooks` | `Partial<Record<HookType, fn[]>>` stacked lifecycle hooks; all execute in insertion order. |
| `isMounted` | `true` once `afterMount` has fired. Set for root + descendants at the end of `attach()` via the handle's `flush()` — but only while any lifecycle hook exists anywhere (`mountHooksExist` in `queue.ts`, flipped by the first `registry.addHook`; hook-free apps skip the walk entirely). For hooks registered post-mount, mounted-ness resolves lazily: `registry.addHook`'s `afterMount` immediate-fire and `registry.addEffect`'s update-hook gate both fall back to `element.isConnected` (suppressed while `isMountInFlight()` — a mount/hydrate attach is running). The scoped `MutationObserver` only catches *later* dynamic additions. |
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
| `e` | Direct non-delegated handlers (`e:` prefix); value = handler function or `{ handler, options }` spec. |
| `hooks` | Lifecycle hooks (`hook:` prefix). |
| `error` | `error:fallback` / `error:category` / `error:boundary` (`error:` prefix). |
| `children` | Always flat (`.flat()` runs during template substitution). |
| `componentScope` | Attached by `component()`; copied to `state.componentScope` at mount. |
| `static` | Template-cache marker — subtree has zero placeholder deps (runtime `html\`\``) or was hoisted by the babel plugin as a fully-static module constant (JSX / compiled `html\`\``); shared by reference across invocations and cloned via `staticDom` on re-mount, never cloned structurally. |

### `RenderFn` / `SsrMeta` (isDynamic components)

`RenderFn = ((element) => void) & { isDynamic: true; ssr?: SsrMeta }` — the return type of the five isDynamic components (`ForEach`/`Portal`/`Lazy`/`Transition`/`Suspense`). Each attaches `fn.ssr = { kind, props }` before returning, carrying its kind (`"forEach"`/`"transition"`/`"portal"`/`"lazy"`/`"suspense"`) and the resolved props object. `SsrMeta` is consumed **type-only** by `@hellajs/ssr`, which reads `kind` to re-implement each component's render without DOM access. `props` is typed `object` (not `Record<string, unknown>`) because TS interfaces (`ForEachProps`, etc.) lack a string index signature; ssr casts to index it. A user-authored isDynamic function has no `ssr` and renders as nothing in SSR.

## Attribute prefixes

| Prefix | Bucket | Behavior |
|---|---|---|
| `on:` | `node.on` | Delegated: one `document.body.addEventListener(type, …, true)` (capture phase) per type. |
| `e:` | `node.e` | Direct: per-instance `addEventListener` (bubble phase), error-boundary-wrapped. Value = handler function or `{ handler, options }` spec forwarding native listener options (`once`/`passive`/`capture`). |
| `hook:` | `node.hooks` | Lifecycle: `beforeMount` / `afterMount` / `beforeDestroy` / `afterDestroy` / `beforeUpdate` / `afterUpdate`. |
| `error:` | `node.error` | Config: `error:fallback` (fn) / `error:category` (string) / `error:boundary` (boolean). |
| (none) | `node.props` | Attribute; a function-ref value (signal / `() => …`) is reactive (effect-wrapped), else applied once. |

## `html\`\`` parsing & caching (`lib/html.ts`, `lib/internal/template.ts`)

`templateCache: WeakMap<TemplateStringsArray, HtmlInternalNode>` keys the AST by template-strings identity. First call builds the AST; later calls skip parsing and only run `cloneWithValues`.

- **Tokenization.** `SKIP_REGEX` strips comments/DOCTYPE/CDATA; `<>`/`</>` rewrite to `<__fragment__>`/`</__fragment__>` → `tag: "$"`. `TOKEN_REGEX` matches tags + text; `ATTR_REGEX` classifies prefixes (`error:` before `e:` before `on:`/`hook:` before bare) in one pass; `parseAttributes` routes by `name.startsWith(...)`.
- **Placeholders.** Interpolations become `__SLOT_N__` markers in the string and `{ placeholder: N }` markers in the AST. **Format is `__SLOT_N__`, not `__HELLA_N__`.** `parseTextContent` splits text containing slots.
- **Static-subtree optimization.** `markIfStatic` tags any node whose `props`/`on`/`e`/`bind`/`hooks`/`error`/`children` contain no `placeholder` and no `dynamicComponent` as `static = true`. `cloneWithValues` short-circuits on `Object.hasOwn(node, "static")` and returns the node as-is — **static subtrees are shared by reference across every invocation of the same literal.** This is why mutating a returned HellaNode is unsafe. `mountNode` further caches the first-built DOM subtree in a `staticDom: WeakMap<HellaNode, Element | DocumentFragment>` (`render.ts`); subsequent mounts of the same `static` node return `cache.cloneNode(true)`, replacing O(nodes) DOM construction with O(1) clone (`render.ts:mountNode`). Safe because `markIfStatic` guarantees `static` nodes carry no `on`/`e`/`bind`/`hooks`/`error` — zero `ElementState` entries exist on cached elements. The cache is cleared by `resetDom()` for test isolation.
- **Root interpolation unwrap.** If the trimmed template is exactly `__SLOT_N__`, `parseHTML` returns the placeholder value directly — `html\`${value}\`` yields `value` itself, unwrapped.
- **Roots.** 1 root → that node; `>1` roots → wrapped in `{ tag: "$", children: nodes }`.
- **Dynamic components.** `<${Comp}>` becomes `{ dynamicComponent: N, props, children }`; `cloneWithValues` calls `Comp(mergedProps)` if `Comp.isDynamic` (passthrough) or wraps via `component(Comp, mergedProps)`. Attribute buckets merge into one props object; a single child unwraps, multiple become an array.
- **Unclosed tags.** Anything left on the parse stack at EOF is flushed — no throw.
- **Cloning rules.** `placeholder`/`static`/`dynamicComponent` short-circuit; arrays flat-clone; HellaNodes shallow-clone each bucket; children `.flat()`-ed.

## `mount(node, target = "#app")` (`lib/mount.ts`)

`resolveValue` calls `node` if it's a function. If the result is a thenable (`typeof resolved.then === "function"`), `attach` is deferred via `.then`; otherwise `attach` runs sync. `attach` = `mountNode` → `container.replaceChildren(...)` → `registerContainer(container)` (starts scoped observer) → `attached = true` → `flush()` (drains the mount queue: sets `isMounted = true` and fires `afterMount` for root + descendants; idempotent).

- **Async mount rejections** route through `dispatchError(err, { phase: 'mount' })` — no element context, so no fallback rendering; surfaces via `onError` or `console.error('[dom]', err)`.
- **`setMountNode` indirection.** `mount.ts` registers `mountNode` with `dispatch.ts` at module init to break the `render.ts` ↔ `dispatch.ts` circular import; `events.ts` reads `getMountNode()` lazily when rendering fallback UI.

## `hydrate(node, target = "#app")` (`lib/hydrate.ts`, `lib/internal/hydrate.ts`)

Attaches reactivity to existing server-rendered HTML in place — re-executes the component tree and wires effects/handlers/state to the DOM the server shipped, **never `replaceChildren`** (the core invariant vs `mount`). Mirrors `mount`'s resolve + sync/async shape; `attach` hydrates the resolved node against `container`'s existing childNodes (no replace). Fragment root → `hydrateSequence` over `container.firstChild`; single element → `hydrateNode(node, container.firstChild)`. Empty container → falls back to a fresh `mount`. Returns the same `MountHandle` shape as `mount`.

- **`hydrateNode(node, existing, boundary?)`** — mirrors `mountNode`'s step order: `static` fast-path (verify tag, attach nothing — static subtrees carry no `on`/`e`/`hooks`); copy `componentScope`/`error`; register hooks; run `beforeMount`; **SKIP `props`** (server applied them via `ssr`); register `on:`/`e:` and wire function-ref props against `existing`; recurse `hydrateSequence`. Tag mismatch or missing element → `console.warn("[dom] hydrate mismatch…")` + `replaceMismatch` (`mountNode` subtree-replace via `existing.parentNode.replaceChild`, created in `existing`'s namespace via `childNamespaceOf`); a missing child (no existing) returns an orphan that `hydrateSequence` appends. Tag comparison is uppercase-folded for HTML elements but exact-case for foreign-namespace elements (SVG/MathML keep authored case — `clipPath` ≠ `CLIPPATH`), via the local `tagMatches` helper.
- **`hydrateSequence(parent, children, current, boundary)`** — a **marker-reader**: walks AST children in parallel with existing DOM via a node pointer, locating each dynamic region by its `<!--[->…<!--]-->` Comment markers (`isMarkOpen` / `gatherRegion` / `consumeRegion`). Static text/elements match by position (consume one node); element children → `hydrateNode` (adopt); a fragment child → gather + remove its marker pair, recurse inline; a reactive child → `consumeRegion` (gather nodes, remove markers, insert anchor) + `adoptReactiveRegion` (adopt the gathered nodes first-run, clear+render on subsequent runs — mirrors `appendToParent`, incl. the isDynamic-resolved `Proxy` branch which is safe here because `clearRenderedNodes` runs before re-rendering); an isDynamic child → `hydrateDynamic`.
- **`HydrateCtx` + stack** (`peekHydrateContext`/`push`/`pop`) — an **internal** type in `lib/internal/hydrate.ts` (NOT in `nodes.d.ts`; `RenderFn`'s public signature is unchanged). Carries `{ anchor, existingNodes, hydrateNode }`. `adoptRegion` pushes it around each isDynamic `fn(parent)` call so the component reuses the walker's pre-positioned anchor and adopts the marker-gathered region nodes instead of building fresh. Reentrancy-safe for nested regions.
- **isDynamic dispatch** (`hydrateDynamic`): `consumeRegion` gathers the region's nodes + positions the anchor; `adoptRegion` pushes the ctx + calls `fn`. `ForEach`/`Transition` adopt the gathered nodes; `Portal` passes `[]` (server rendered nothing in-place) and re-mounts into the target; `Lazy` `clearRenderedNodes` the gathered loading node, then re-runs the loader. `Suspense` runs `swapSuspenseStage` — the no-script/HappyDOM fallback (a staged `<template>` whose id matches a sentinel comment replaces the fallback). In a browser the inline `$hs` swap script (emitted by `@hellajs/ssr`) has already swapped each region as it arrived, so this runs only when that script hasn't (e.g. in tests). Either way it then adopts the resolved children. When the sentinel is present but its staged `<template>` never arrived (interrupted stream), the ctx is flagged `stageMissing` and `<Suspense>` degrades to fresh-mount semantics — fallback kept, child re-suspended client-side, content swapped on settle, rejections bubbled. ForEach's first-render adopts via `hctx.existingNodes` into `keyToNode`/`keyToItem`/`currentKeys` **iff `existingNodes.length === arr.length`** (count-strict); on mismatch it warns + removes the gathered nodes + fresh-builds (the LIS update path is unchanged). `Transition` adopts `existingNodes[0]` as `current` when visible (applies `appear`).
- **Marker contract** — `ssr()` wraps every dynamic region (reactive child, isDynamic component, nested fragment) in `<!--[->…<!--]-->` Comment markers; hydrate reads them. There is **no coalescing/rebuild**: each reactive value is its own bounded region, adopted in place. Missing markers (e.g. hand-built server HTML without them) → `console.warn("[dom] hydrate: expected … marker, not found")` + fresh-mount the region (graceful degradation). Reset: `resetHydrateState()` clears the stack (wired into `resetDom()`).

## `mountNode` / `appendToParent` (`lib/internal/render.ts`)

`mountNode(node, boundaryElement?, ns?)` — creates element (or fragment for `tag: "$"`), copies `componentScope` → `state.componentScope` and `error` → `state.errorConfig` + `state.originalNode`, sets `currentBoundary = error ? element : boundaryElement`, registers hooks, runs `beforeMount` (errors caught, `phase: 'mount'`, **no fallback**), applies `props` via `renderProp` (function-ref values are effect-wrapped; errors `phase: 'update'`, fallback `replaceChildren` on `currentBoundary ?? element`), registers `on:` (delegated) / `e:` (direct), then `appendToParent(element, children, currentBoundary)`.

- **Namespace-aware creation.** `tag === "svg"` → `createElementNS(SVG_NS)`, `tag === "math"` → `createElementNS(MATHML_NS)`, else `ns ? createElementNS(ns, tag) : createElement(tag)` (HTML hot path unchanged). `childNamespaceOf(parent)` (exported from `render.ts`) is the single derivation: the parent's own `namespaceURI` when foreign, `undefined` for HTML parents / fragments / text anchors / `foreignObject` (HTML integration point). The `ns` param is consumed only at creation — children re-derive from the live parent element, so there is one source of truth. Fragments keep the incoming `ns` (ForEach builds into one before insertion); element parents self-derive in `appendToParent`. All child-creation call sites thread it: ForEach (`actualParent`), Transition/Suspense (`parent`), Lazy (anchor's parent), Portal (remote `target`), `replaceMismatch` (`existing.namespaceURI` via `childNamespaceOf`), `adoptReactiveRegion` (`parent`). Out of scope by design: error-fallback `mountNode` calls (`renderEventFallback`, prop-effect catch) — fallback UI stays HTML.

- **`resolveNode(value, parent?, ns?)`** — `HellaNode` → `mountNode` (forwards `ns`); a non-dynamic **function/signal** → a text node plus an effect (registered on `parent || textNode`) tracking `resolveText(value())`; primitive → text node. This is the path Portal/Transition/ForEach use for their children.
- **`appendToParent` static-string fast path.** A single string child → `parent.textContent = str` (no text-node allocation).
- **Reactive child effect** (non-dynamic function child): creates a text anchor + `renderedNodes[]` + one effect. Each run resolves the value, `cleanupSubtree` + `removeChild` on every previous node, re-inserts. If the resolved value is itself a dynamic function, a `Proxy` parent intercepts `appendChild` to track nodes while still inserting before the anchor. Errors `phase: 'mount'`, fallback `insertBefore`-ed at anchor — **preserves siblings**, unlike the prop-effect/event path.
- **Non-function children.** `resolveValue` first; string/number → text node; raw `Node` → appended directly; `HellaNode` → `mountNode(resolved, currentBoundary)`.

## Cleanup & queues (`lib/internal/cleanup.ts`, `lib/internal/queue.ts`)

Two cooperating mechanisms share one `MutationObserver` per mount target:

- **Sync `cleanupSubtree(root)`** — called directly by `appendToParent` (reactive child swap), ForEach (stale-removal + list clear), Transition (leave completion). `traverseDescendants` (iterative stack) → per descendant `clean(node)`: `beforeDestroy` → `componentScope?.()` → `portalCleanup?.()` → `lazyCleanup?.()` → `transitionCleanup?.()` → `suspenseCleanup?.()` → drain `effects` → `removeDirectHandlers` → `afterDestroy` → `deleteState`.
- **Scoped observer safety net.** `registerContainer(container)` (called from `mount()`) + `ensureContainerObserver` lazily create one `MutationObserver` shared across all mount targets (`observedContainers: WeakSet<Element>`), observing `{ childList: true, subtree: true }`. Removed nodes' traversed via `registerNode`, which collects removed nodes with state → `cleanupQueue` — a stateful node is queued WITHOUT recursing into it (`processCleanupQueue`'s `cleanupSubtree` already traverses its descendants; only stateless intermediates are walked through); added element nodes → `mountQueue` (scheduled only when `mountHooksExist`); both drain on `queueMicrotask`. `processCleanupQueue` skips nodes still `isConnected` (re-attached, not removed).
- **`runHooks` element-argument rule.** `beforeMount` and `afterDestroy` are called with **no** argument; every other hook receives the element.
- **Reset (test).** `resetEventState` / `resetQueueState` / `resetSelectorState` / `resetDom` tear down listeners, observers, queues, the `staticDom` cache, between tests.

## Mount queue

`processMountQueue` traverses each queued node's descendants; every element with state gets `isMounted = true` and `afterMount` run, **idempotently** — already-`isMounted` nodes are skipped, so re-flushing never double-fires `afterMount`. The whole walk is **skipped while no lifecycle hook has ever been registered** (`mountHooksExist`) — hook-free apps (the common case) pay nothing. Skips nodes not `isConnected` at flush time. The scoped `MutationObserver` only catches *later* dynamic additions (it is started by `registerContainer` after the initial `replaceChildren`, so the initial tree is never observed); the initial attach is flushed explicitly at the end of `attach()`. `afterMount` therefore fires by the time `mount()`/`hydrate()` return — **no `flush()` call is required**. The handle's `flush()` remains as an optional escape hatch (e.g. to drain the cleanup queue synchronously in tests). An `afterMount` hook registered on an already-mounted node via `registry.addHook` fires immediately (`state.isMounted`, or lazily via `element.isConnected` outside a running attach — which also sets `isMounted` so the walk does not double-fire).

## Event delegation (`lib/internal/events.ts`)

- **One Set tracks types.** `globalListeners: Set<string>` holds every type with a registered `document.body.addEventListener(type, delegatedHandler, true)` (capture) listener; it is also the fast-exit checked at the top of `delegatedHandler`. **Never decremented** — types stay registered until `resetEventState()`.
- **`delegatedHandler`** reads `event.composedPath()` and walks it target-first; for each path element with `state.handlers[type]`, invokes `handler.call(element, event)` in try/catch. The walk checks `event.cancelBubble` at each iteration — a handler calling `stopPropagation()`/`stopImmediatePropagation()` halts it (later path handlers do not fire). Errors dispatch with `phase: 'event'` and render fallback on `findBoundary(element) ?? element` via `replaceChildren`. **No automatic `stopPropagation`** — every handler on the path fires unless one stops it.
- **Direct (`e:`) handlers** are wrapped per-instance with the same error handling, stored in `state.directHandlers` (Map of `{ handler, options }` per type), and `removeEventListener`-ed with the same options on cleanup (`capture` is the discriminating flag for removal). The `e:` value is the handler function or a `DirectListenerSpec`; options forward verbatim to `addEventListener`. Delegated `on:` stays options-less **by design** — the body-level listener is shared per type, and making it non-passive for touch/wheel would degrade scrolling for every app; browsers treat body-level touch/wheel listeners as passive by default, silently no-oping `preventDefault()` in `on:` handlers — cancelable gestures use `e:` with `passive: false`.

## Keyed reconciliation — `ForEach` (`lib/ForEach.ts`)

Returns a function with `isDynamic: true` and `fn.ssr = { kind: "forEach", props }` (the SSR descriptor consumed type-only by `@hellajs/ssr`); `appendToParent` calls it with the parent. Creates a text anchor + one effect holding live collections (`keyToNode`, `keyToItem`, `currentKeys`) and reusable temp collections (`newKeys`, `newKeyToNode`, `newKeyToItem`, `nodesToRemove`, `keyToOldIndex`, `toMove`).

- **Key resolution.** `element.props.key` → `item.id` → array index. The first two set `hasExplicitKey = true`; the index fallback does not.
- **Reuse rule.** `!node || (!hasExplicitKey && oldItem !== item)` → `resolveNode` (fresh node). Explicit keys reuse by key identity regardless of item reference; index-fallback keys require the same item reference.
- **First render** (`currentKeys.length === 0`): build into a `DocumentFragment`, single `insertBefore(fragment, anchor)`.
- **Stale removal** (every non-first render): existing nodes absent from `newKeyToNode` (or whose node identity changed) are collected, then `cleanupSubtree` + `removeChild`-ed in a batch. Nodes whose `parentNode !== actualParent` (e.g. portal-moved) are skipped.
- **No-overlap fast path**: if no `newKey` exists in `keyToNode`, append all via one fragment.
- **LIS path**: `mapped[i]` = old index if reused else `-1`; binary-search LIS (`O(n log n)`) removed from `toMove`. Walk `newKeys` **backwards**, `insertBefore(node, moveAnchor)` only for indices still in `toMove` — minimal DOM moves.
- **Empty list**: `cleanupSubtree` + `removeChild` every node, clear maps.
- **Collection swap**: live and temp collections swap by reference; `clear()` the temps next round, never reallocate.

## `Portal` (`lib/Portal.ts`)

Returns a function with `isDynamic: true` and `fn.ssr = { kind: "portal", props }`. Renders children to a remote target. Creates a local anchor, then in one effect (guarded by `if (portalNodes.length > 0) return` → runs once) resolves `document.querySelector(to)`, builds nodes into a fragment, applies it via the target's `appendChild`/`prepend`/`replaceChildren`/`before`/`after` (`type` prop; default `append` maps to `appendChild`). `state.portalCleanup` (on the **anchor**) removes each tracked node from its current parent on cleanup. Throws if the target misses.

## `Lazy` (`lib/Lazy.ts`)

Returns a function with `isDynamic: true` and `fn.ssr = { kind: "lazy", props }`. Async loader with cancellation. Creates an anchor; optionally `insertBefore`s a `loading` node. Allocates an `AbortController`; `state.lazyCleanup` (on the **parent**) sets `isCancelled = true` and `controller.abort()`. Calls `props.loader({ signal })`, then:

- **Success** — guards on `isCancelled || !anchor.parentNode`; removes loading; if `component` is a function calls `component(props.props)`, else uses directly; `mountNode`s + `insertBefore` at anchor. **No nested Promise unwrapping** — loader must resolve to `ComponentFn | HellaNode`.
- **Error** — same guards; removes loading; if `props.fallback`, `resolveNode` + `insertBefore` at anchor. **Errors do NOT bubble to `onError`** (local fallback only).
- **Cancellation** — both `.then`/`.catch` check the guard, so resolve/reject after parent removal is a no-op. Pass `signal` through to `fetch`/AbortController-aware APIs for network cancellation.

## `Transition` (`lib/Transition.ts`)

Returns a function with `isDynamic: true` and `fn.ssr = { kind: "transition", props }`. Enter/leave CSS animations. Holds `current`, `leaveTimer`, `isFirstRender`. One effect re-runs on `show`:

- **Enter** (`show=true`, no `current`, no `leaveTimer`): `resolveNode(children, parent)`, `insertBefore` at anchor. `isFirstRender && appear` → add `appear` (string) or fall back to `enter`; `!isFirstRender && enter` → add `enter`. **Without `appear`, no class is added on first mount.**
- **Rescue** (`show=true` with active `leaveTimer`): `clearTimeout`, remove `leave` class, keep the node (rapid-toggle rescue).
- **Leave with class** (`show=false`, `current`, `leave`): add `leave`, schedule `setTimeout(cleanup, duration + 50)`. The 50ms absorbs frame-timing drift; `duration` (default **300ms**) must match the CSS animation. Timer callback runs `cleanupSubtree` + `removeChild`.
- **Leave without class**: `cleanupSubtree` + `removeChild` synchronously.
- **`transitionCleanup`** (on parent) clears a pending `leaveTimer` when the parent is removed mid-leave. The `enter` class stays on after the animation (idempotent; re-entering re-adds it).

## `Suspense` (`lib/Suspense.ts`)

Returns a function with `isDynamic: true` and `fn.ssr = { kind: "suspense", props }`. A streaming + async boundary with three render paths:

- **`ssr.stream`** (server) — `@hellajs/ssr`'s walker flushes `fallback` inline and stages the resolved children in a `<template id="hsN">` for hydrate to swap.
- **`hydrate`** — `hydrateDynamic` → `adoptRegion`; `swapSuspenseStage` reads the staged `<template>` id from a sentinel comment, replaces the fallback with the template's resolved children, then adopts them — the no-script/HappyDOM fallback (in a browser the inline `$hs` script from `@hellajs/ssr` swaps each region as it arrives; this runs only when that script hasn't).
- **Fresh mount** (client, no server HTML — e.g. after client-side navigation) — evaluates the child once (`isFunction(children) ? children() : children`). A thenable suspends: render `fallback` before the anchor, await, then `insertBefore(resolveNode(resolved), anchor)`. `state.suspenseCleanup` (on parent) sets a `cancelled` flag; both `.then` and `.catch` no-op on `cancelled || !anchor.parentNode` (parent removed mid-flight is safe). Sync children render directly via `resolveNode` (no fallback).
- **Errors bubble** — on rejection the pending `fallback` is removed (pending-only) and the error is `dispatchError`-ed with `config: resolveErrorConfig(parent)`, so the nearest `error:fallback`/`error:boundary`/`onError` renders (React/Solid/Vue parity). **Unlike `Lazy`, Suspense errors bubble** (Lazy keeps them local). No `AbortController`/`{ signal }` — network-level cancellation belongs to `resource`/`fetch`, not the boundary.
- **One-shot, not reactive** — the child function runs once at mount; `<Suspense>` does not re-suspend when a signal the child reads changes (reactive async = `resource` + a reactive child branching on `isLoading()`/`data()`).

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
| Function-ref prop effect | update | `replaceChildren` on `currentBoundary ?? element` (replaces siblings) |
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

Imperative escape hatch over existing DOM. `createReactive(element)` builds the shared `DomWrapper` (`bind`/`on`/`hooks` returning the wrapper for chaining, plus a `node` getter). `bind` detects `INPUT`/`TEXTAREA`/`SELECT` (frozen `FORM_ELEMENTS`) and targets `.value` instead of `.textContent` for primitives; an object arg sets arbitrary attributes. `hooks` **fires `afterMount` immediately** if the element is already `isMounted` (handled centrally by `registry.addHook`).

- **`$ref(selector)`** — `document.querySelector` synchronously; wraps immediately if found. Otherwise lazily starts watching on the first `bind`/`on`/`hooks` call: registers an op in the global `multiSelectors` Map, ensures `refObserver`. The watcher's `processNode` takes the first match, drains queued ops, then runs `processMountQueue` so `afterMount` hooks fire. Returns a callable `DomRef` — `ref()` / `ref.node` returns the node; methods chain. Also exposes a `.node` getter.
- **`$collection(selector)`** — wraps every current match and registers with `registerMultiOp` so new matches auto-apply queued ops. Returns a `DomCollection`: callable `collection(index = 0)`, dynamic `length`, `forEach`, `bind`/`on`/`hooks` (all current + future), `dispose()`. Indexed `[i]` access is populated **only for the initial set** — use the callable form for dynamically-added elements.
- **`refObserver`** — separate from the container observer. Watches `document.body` `{ childList: true, subtree: true }`; removals feed `cleanupQueue`, any mutation schedules `checkMultiSelectors` via microtask. `cleanupRefObserver` disconnects when `multiSelectors.size === 0`.

## `registry` (`lib/registry.ts`)

Public, exported. `addEffect(node, fn)` wraps `fn` in `effect(...)` bracketed by `beforeUpdate`/`afterUpdate` — gated on `state.hooks` (two property loads, not WeakMap gets) and `state.isMounted`, which resolves lazily from `element.isConnected` so hooks registered post-mount still fire on updates; hook errors caught, `phase: 'update'`, no fallback. `addHook(element, type, handler)` pushes onto `state.hooks[type]` (stacking) and flips `mountHooksExist`; an `afterMount` registered on an already-mounted node fires immediately. Both accumulative.

## `renderProp` (`lib/internal/utils.ts`)

`value`/`checked`/`selected`/`innerHTML` → set the IDL property directly (falsy → `''`, never `removeAttribute`). Other keys: `isFalsy` (`false`/`null`/`undefined`) → `removeAttribute`; `true` → empty string; arrays → space-joined filtering falsy (class lists); else `setAttribute`. **`isFalsy(0)` is false** — signal `0` renders `"0"`.

## Non-obvious behaviors (gotchas)

- **Treat returned HellaNodes as immutable.** Static subtrees are shared by reference across invocations of the same `html\`\`` literal.
- **`html\`${value}\`` returns `value` directly**, unwrapped.
- **`<>...</>` and multiple roots** are supported inside `html\`\`` at any nesting; multiple roots auto-wrap in a fragment.
- **`HellaNode.children` is always flat** — nested arrays are impossible after substitution.
- **`raw(html)` is an opaque child.** `ssr` wraps it in `<!--[-->…<!--]-->` markers and emits the HTML verbatim (never escaped); `hydrate` consumes the markers and adopts the existing DOM in place, binding nothing inside — no reactive scope crosses the boundary. Meta-framework renderers inject slot HTML as `props.children = [raw(slotHtml)]` (array-wrapped, so the babel `<X>{props.children}</X>` spread yields the sentinel). Bypasses escaping — sanitize untrusted input (XSS).
- **Passthrough components bypass `component()`** — `ForEach`/`Portal`/`Lazy`/`Transition` set `isDynamic: true` and `fn.ssr = { kind, props }`, and are called directly by `appendToParent` with the parent. `<${Comp}>` in templates wraps in `component()` only if `Comp.isDynamic` is false. The `ssr` descriptor (see `RenderFn`/`SsrMeta`) lets `@hellajs/ssr` render these without DOM access; it's write-only at mount.
- **One scoped observer covers every `mount()` target** (`observedContainers`); a second mount target adds no second observer.
- **`afterMount` fires at `mount()`/`hydrate()`.** `isMounted` (root + descendants) is set and `afterMount` fired synchronously at the end of `attach()` — no `app.flush()` needed. `flush()` on the handle is an idempotent escape hatch (drains the cleanup queue).
- **Hook element-argument rule.** `afterMount`/`beforeDestroy`/`beforeUpdate`/`afterUpdate` receive the element; `beforeMount`/`afterDestroy` do not. `beforeMount` fires synchronously during the walk; `afterMount` fires at the end of `attach()` (root + descendants, top-down via `traverseDescendants`). Multiple hooks of the same type all fire in insertion order.
- **Function-ref prop effects run `beforeUpdate`/`afterUpdate`** only when `state.isMounted` is true.
- **`onError(null)` clears all handlers**; a function registers and returns an unregister. No handlers → `console.error('[dom]', error)` and no UI change.
- **Event types registered for delegation stay registered for the page lifetime** — only `resetEventState()` (called by `resetDom()` in tests) removes them. Delegated handlers never auto-stop propagation.

## Performance

- **`while` + cached `length`** on every hot path — no `for…of`/`forEach`.
- **`DocumentFragment`** for every multi-insert (ForEach first render / no-overlap / empty-recovery, Portal fragment).
- **ForEach collection reuse** — temp Maps/arrays/Sets `clear()` + reference-swap, never reallocated.
- **`static` sharing** — static subtrees returned by reference, no deep clone.
- **`staticDom` prototype cache** — `static` subtrees return `cloneNode(true)` of a cached prototype, turning O(nodes) mount into O(1) for static branches.
- **`composedPath()`** for delegation (pre-computed ancestor chain).
- **\`globalListeners\` fast-exit** + inline prefix matching in \`ATTR_REGEX\` (single regex pass).
- **Module-level cached regexes** (`TOKEN_REGEX`, `PLACEHOLDER_REGEX`, `SKIP_REGEX`, `ATTR_REGEX`), `lastIndex = 0` before each use.
- **`WeakMap`/`WeakSet`** for `elementMap`, `observedContainers`, `handlingBoundaries`, `processedNodes` — GC with the DOM nodes.
- **Persistent text-node anchors** (`createTextNode("")`) for ForEach/Portal/Lazy/Transition/reactive children — never recreated; no comment nodes in the DOM.
- **Bulk removal** in ForEach (collect before mutating); events cleanup iterates handlers once.
- **Fast `isHellaNode`** — dom-local `typeof === "object" && v.tag !== undefined`, avoiding `isPlainObject`'s `getPrototypeOf` + `Object.prototype.toString.call` on every child resolution / ForEach item / dispatch step. `isPlainObject` is retained in core for cold input-validation paths (`$ref`/`$collection`).
- **`toText` vs `resolveText`** — `toText(value)` assumes an already-resolved input and skips the `resolveValue` call; `resolveText` (which keeps the call) is used only where the input may still be a function/signal (`reactive.ts` bind path). Mount-side text rendering routes through `toText`.
- **Lazy `ElementState` collections** — `handlers` / `effects` / `directHandlers` / `hooks` allocate on first use, not at `getState`. A reactive leaf pays only `{ isMounted }`.
- **Single WeakMap lookup** on hot guards — `peekState(node)?.field` replaces the `hasState` + `getState` double-lookup in `appendToParent`'s boundary check and in `delegatedHandler`'s per-path-element walk.

## Testing approach (`tests/`)

Integration-style, public API only. Runtime imports come from **`@hellajs/dom/bundle`** (the instrumented bundle — see root `bunfig.toml`); type-only imports from `@hellajs/dom`. Reactive primitives import from `@hellajs/core`. `onError` imports from `@hellajs/dom/bundle`. Test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) import from `@utils/test-helpers.js`. The publicly-exported introspection helpers used directly: `peekState`, `getState`, `multiSelectors`, `checkMultiSelectors`. Track call counts with `mock()` from `bun:test` — never boolean flags or counters.

`tests/helpers.ts` exports `fallbackHandler(defaultFallback)` — registers an `onError` handler that delegates to `context.config?.fallback?.(error)` else returns the default; the standard pattern for exercising element-level fallback through the global handler.

- `mount.test.ts` — sync/async component fns, signal `0` renders `"0"`, async-mount error routing, target-miss throw.
- `mount-targets.test.ts`, `mount-binding.test.ts`, `mount-edge-cases.test.ts` — selector-vs-Element targets, direct-prop falsy fallback, raw-`Node` passthrough, `componentScope`/`errorConfig` transfer to state.
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

**Pattern across all tests:** `mount` → drive signals → `flush()` (core, sync, no `await`) → assert DOM. `afterMount` fires during `mount()`/`hydrate()` already; the handle's `flush()` is only needed to drain the cleanup queue synchronously (e.g. `afterDestroy` assertions). For removal assertions, `el.remove()` then `await delay()` to let the MutationObserver fire and process cleanup. Never test two behaviors in one test; aim for 100% coverage.

Run with `bun coverage dom`.
</dom-package-instructions>
