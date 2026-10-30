# HellaJS @hellajs/dom vs. Solid / Svelte / React / Vue / Angular

A ground-up comparison based on the actual source code of `@hellajs/dom` v2. Every claim below was verified against `packages/dom/lib/`. Competitor versions researched: Solid 1.9.15, Svelte 5.56, React 19.2, Vue 3.5, Angular 22.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS dom | Solid | Svelte 5 | React 19 | Vue 3 | Angular 22 |
|---|---|---|---|---|---|---|
| Reactive model | Fine-grained signals (`@hellajs/core`) | Fine-grained signals | Runes (signals) | VDOM + hooks | Proxies (`ref`/`reactive`) | Signals, zoneless change detection |
| Rendering | Direct DOM, surgical | Direct DOM, surgical | Compiled direct DOM | VDOM diff & reconcile | VDOM diff & reconcile | Change detection + template instructions |
| Virtual DOM | None | None | None | Yes | Yes | Yes (view tree) |
| Compile step | Mandatory (Babel plugin; JSX → HellaNode at build) | Mandatory for JSX | Mandatory (SFC → JS) | JSX → JS | SFC/template → render fn | Decorators + HTML templates |
| Runtime deps | 0 (+ core peer) | 3 | 16 | 0 | 5 | 1 |
| Templating | JSX | JSX / tagged templates | Svelte SFC | JSX | `<template>` / JSX | HTML templates + TS |
| Error boundaries | Global `onError` + per-element `error:` config | `ErrorBoundary` component | `<svelte:boundary>` | Class boundaries + root callbacks | `errorCaptured` hook | `ErrorHandler` + zone-less capture |
| Language | TS, framework-agnostic packages | TS | SFC compiler | JS/TS | SFC compiler | TS-first, decorators |

HellaJS sits closest to Solid philosophically (signal-driven, no VDOM, surgical DOM writes), with a runtime-API shape closer to an explicitly composable library than a compiler-first framework like Svelte or an all-inclusive platform like Angular.

---

## 2. Architecture & Rendering Strategy

### HellaJS

Rendering is a one-way function from a plain-object AST to the live DOM, with reactivity attached per binding: there is no render loop, no reconciliation pass, and no tree to diff. The mechanism:

- No virtual DOM. The Babel plugin compiles client JSX to imperative `@hellajs/dom/runtime` construction: cached `template()`/`fragment()` clones wired by `text`/`prop`/`on`/`child` calls, so mount executes the compiled calls directly with no intermediate tree and no diffing (`plugins/babel/src/builders/imperative.mjs`, `packages/dom/lib/runtime.ts`). Element creation is namespace-aware: `svg`/`math` roots and their descendants create via `createElementNS`, with `foreignObject` resetting children to HTML (`lib/features/namespaces.ts`, applied in the runtime's parse). The server target still emits the plain-object HellaNode AST that `@hellajs/ssr` stringifies.
- Surgical updates: each reactive binding registers its own effect. A function-valued prop gets one effect wrapping `renderProp` (`lib/internal/render.ts`); a reactive child gets a persistent empty text-node anchor plus a `renderedNodes` array and one effect that clears and re-inserts exactly the nodes it owns (`lib/internal/render.ts`). When a signal changes, only those bindings re-run: no tree walk, no sibling reconciliation.
- Static-subtree hoisting happens at compile time: the Babel pass folds fully-static subtrees (literal props, no prefixed attributes, no expressions) into the cached template HTML itself, so re-mounting a static branch is one `cloneNode(true)` instead of O(nodes) construction (`plugins/babel/src/builders/imperative.mjs`, `lib/runtime.ts`). Static children of a dynamic parent still hoist individually.
- The client DOM carries no comment markers: list, portal, lazy, transition, suspense, and reactive-child regions all anchor on invisible empty text nodes (`lib/ForEach.ts`, `lib/Portal.ts`, `lib/Lazy.ts`, `lib/Transition.ts`, `lib/internal/render.ts`).
- Hydration claims server HTML positionally: `@hellajs/ssr` bounds each dynamic region in `<!--[-->…<!--]-->` comment markers, and `hydrate()` re-runs the compiled build with adoption engaged, so the construction calls claim the matching server nodes in place and `replaceChildren` is never called (`lib/hydrate.ts`, `lib/internal/claims.ts`). Claim order equals document order (the compiler's emission guarantee), claim exhaustion is verified, and structural divergence throws instead of guessing; only reactive-value drift degrades, warn-and-rebuild per region (`lib/internal/hydrate.ts`, `lib/internal/claims.ts`). A streamed `<Suspense>` region arrives as a staged `<template>` that an inline `$hs` script swaps in as it lands, with `swapSuspenseStage` as the no-script fallback and an interrupted stream degrading to client-side re-suspension (`lib/internal/hydrate.ts`).

### Solid

Solid compiles JSX to real DOM node constructors wrapped in fine-grained reactive computations, the closest architectural sibling. Components run once to set up the view; updates flow through per-binding computations that touch the DOM directly (per the Solid README and published 1.9.15 bundle). Both libraries treat the DOM as the source of truth and bind signals straight to nodes, and both require a compiler. The default emission now matches too: HellaJS's client target generates imperative cached-template construction through the public `@hellajs/dom/runtime` module, with the same pass auto-wrapping call expressions into reactive thunks, while the `"ast"` target keeps emitting the plain-object HellaNode AST the server stringifier consumes.

### Svelte 5

Svelte 5 is the compiler-first counterpoint. Runes (`$state`, `$derived`, `$effect`) compile to fine-grained signals, and the Svelte compiler emits imperative DOM-mutation code; the framework largely disappears at build time (per the Svelte README and docs). HellaJS performs the same style of analysis in its Babel pass (`hoistStaticJSX` in `plugins/babel/src/utils/static.mjs`), which folds fully-static subtrees into shared template HTML, and its default client emission is the same Svelte-style imperative construction (`target: "dom"`); the `"ast"` target remains for the server pipeline.

### React 19 / Vue 3

React and Vue both diff a virtual tree and patch the DOM. React 19 layers Actions (`useActionState`, `useOptimistic`), the `use()` API, Server Components, and full custom-element support on top of the render-then-commit model (per the React 19 release post). Vue 3 compiles `<template>` SFCs into optimized render functions with static hoisting and patch flags over a Proxy-based reactivity system (per the Vue reactivity guide and docs). Even with keys and memoization, both reconcile component subtrees, inherently more work per update than a surgical signal binding.

### Angular

Angular runs hierarchical change detection over a component tree and updates bindings through compiled template instructions. Since v21 zoneless change detection is the default: signal updates, template listeners, and `markForCheck` schedule checks on the affected views, with Zone.js available as an opt-in peer for legacy apps (per Angular's zoneless guide, researched at v22). It is the most platform-shaped of the group (DI, router, forms, and SSR are first-party modules) and the heaviest conceptual surface.

**Verdict:** HellaJS, Solid, and Svelte form the no-VDOM, surgical camp; React and Vue reconcile virtual trees; Angular schedules per-view change detection. HellaJS's compiler emits a plain data structure by default (with an opt-in imperative target), and it ships in-place hydration and streaming-Suspense adoption in the same package rather than as framework infrastructure.

---

## 3. Dependencies

| | HellaJS (dom) | Solid | Svelte | React | Vue | Angular |
|---|---|---|---|---|---|---|
| Runtime deps | 0 | 3 (`csstype`, `seroval`, `seroval-plugins`) | 16 (compiler toolchain) | 0 (`react-dom` separate) | 5 (`@vue/*` compiler/runtime) | 1 (`tslib`) |
| Peer deps | `@hellajs/core` | none | none | none | `typescript` | `@angular/compiler`, `rxjs`, `zone.js` (optional) |

- `@hellajs/dom` declares zero runtime dependencies and a single peer: the reactivity core (`package.json`). React is the only competitor that also ships zero runtime deps, but every React app pays for `react-dom` next to it; HellaJS's peer *is* the rendering engine's reactivity, nothing more.
- The package is split for tree-shaking: a pre-bundled `dist/bundle.js` entry plus per-feature `dist/./*` subpath exports, so `ForEach`, `Lazy`, `hydrate`, etc. can be imported individually (`package.json`).
- HellaJS is the only entry here that is a composable package rather than a framework to adopt: pairing it with `@hellajs/core` is enough to render, and router/state/CSS come from sibling packages or not at all. Solid, Svelte, Vue, and Angular each expect to own the application.

---

## 4. Reactivity Granularity

Reactivity comes from `@hellajs/core`: signals as sources, computeds as transforms, effects as sinks, on a doubly-linked dependency graph with depth-first topological propagation, glitch-free, each node running at most once per update cycle (core's `propagation.ts`/`validation.ts`, an Alien Signals fork).

| Framework | Granularity | Glitch-free? | Tracking opt-out |
|---|---|---|---|
| HellaJS | Per-binding effect | Yes (DFS propagation) | Pass a value instead of a function: no `untrack()` needed at the binding level |
| Solid | Per-binding computation | Yes | `untrack()` |
| Svelte 5 | Per-binding (runes) | Yes | `$state.raw` / module scope |
| React | Component subtree | No (render then commit) | `memo` / `useMemo` |
| Vue | Component + `ref` | Mostly | `markRaw`, `shallowRef` |
| Angular | Component / signal view | Yes (signals) | `equal` comparator / zone opt-in legacy |

A distinctive HellaJS ergonomic: passing a bare signal reference creates a live binding while calling it (`count()`) produces a one-time static value, because the single discriminator is `isFunction` on the child/prop value (`lib/internal/render.ts`, `lib/internal/utils.ts`). A signal *is* a function, so it binds; a primitive never does. Under the Babel plugin, call-containing expressions are auto-wrapped into thunks, so compiled `{count() * 2}` is reactive without a manual wrapper (per the package's control-flow docs). This is a zero-API way to opt in and out of tracking that no competitor matches so directly.

---

## 5. List Reconciliation (ForEach)

`ForEach` (`lib/ForEach.ts`) is a hand-tuned keyed reconciler:

- Fast paths: **first render** builds into a `DocumentFragment` with a single `insertBefore`; **prefix/suffix trim** skips all diff machinery for unchanged runs at either end; a middle with **no retained keys** (zero-overlap replacement included) mounts through one fragment inserted before the boundary node; **empty list** clears tracked nodes in one batch (`lib/ForEach.ts`).
- The complex case runs a binary-search LIS over the trimmed middle and moves only non-longest-increasing-subsequence nodes, walking keys backwards with a rolling move anchor (`lib/ForEach.ts`).
- Key resolution: the `ForEach` `key` extractor → the rendered `key` prop → `item.id` → array index; with the extractor present, retained keys reuse their node without re-invoking `use` (`lib/ForEach.ts`).
- Explicit-class keys (extractor, `key` prop, `item.id`) reuse nodes by key identity regardless of item reference; index-fallback keys additionally require the same item reference, preventing accidental reuse on shuffled data (`lib/ForEach.ts`).
- Items are single-root: a `use` result must resolve to one element or text node; a multi-root fragment (`<>…</>`), an array of nodes, or multi-root raw HTML throws at item build (`lib/ForEach.ts`). Multi-node rows require an explicit wrapper element.
- Live collections (`keyToNode`, `keyToItem`, `currentKeys`) swap by reference with temp collections reused across renders: no per-update Map allocation (`lib/ForEach.ts`).

| Framework | Algorithm |
|---|---|
| HellaJS | LIS + prefix/suffix trim, keyed, collection reuse |
| Solid | `<For>` keyed by reference; `<Index>` unkeyed |
| Svelte 5 | Compiled keyed `{#each}` with optimized diff |
| React | Child-array reconciliation with keys (LIS-based moves) |
| Vue | Heuristic keyed diff, LIS-based moves |
| Angular | `@for` with mandatory `track` |

Roughly on par with Solid and Vue on mechanism, and ahead of naive React usage. Its fast paths make the common cases (initial mount, full swap, clear) near-free, and its hydrate path adopts server-rendered items directly into the reconciliation maps when counts match, falling back to a warned fresh build when they diverge (`lib/internal/hydrate.ts`).

---

## 6. Event Handling

HellaJS uses global event delegation by default through the `on:` prefix:

- One `document.body.addEventListener(type, handler, true)` listener per event type, in the capture phase; a `globalListeners` Set short-circuits types with no handlers (`lib/internal/events.ts`).
- Dispatch walks `event.composedPath()` and looks up `peekState(element)?.handlers[type]` on each path element: one WeakMap peek per ancestor, no DOM walking (`lib/internal/events.ts`).
- The `e:` prefix attaches direct, bubble-phase listeners per element for cases delegation handles poorly (focus/blur semantics, opt-out of shared dispatch) or for native listener options (`once`/`passive`/`capture` via a `{ handler, options }` spec, `DirectListenerSpec` in `lib/types/nodes.d.ts`), wrapped in the same error-boundary handling (`lib/features/direct-events.ts`).

| Framework | Strategy |
|---|---|
| HellaJS | Global delegation, capture phase, one listener per type |
| Solid | Fixed set of ~20 high-frequency types delegated to the document; rest per-element |
| Svelte 5 | Compiled `onclick` → native per-element listeners |
| React | Synthetic events, single delegated root listener |
| Vue | `v-on` → native per-element listeners |
| Angular | Per-element listeners via `(click)` |

HellaJS delegates every `on:` type uniformly rather than a curated set (verified against Solid's `DelegatedEvents` set in its 1.9.15 bundle). The trade-off vs Svelte/Solid: the whole delegated walk runs from a single capture-phase `document.body` listener per type, ahead of any native listener below `body` (a handler's `stopPropagation()` halts the walk, but ordering with directly-attached third-party listeners still differs from per-element attachment), and registered event types stay live for the page lifetime rather than being torn down with the last handler (`lib/internal/events.ts`). The `e:` escape hatch closes the gesture side of this trade: its `{ handler, options }` spec forwards native listener options verbatim, including `passive: false`, required for cancelable gestures because browsers treat the body-level delegated listener as passive by default for touch and wheel, silently no-oping `preventDefault()` in `on:` handlers (`lib/internal/events.ts`).

---

## 7. Component Model & Composition

Components are plain functions returning HellaNodes. There is no class component and no framework-injected props object; the Babel plugin wraps component references in `component()`, which creates a disposal scope for automatic effect cleanup and catches render errors into the error system (`lib/component.ts`).

```jsx
// Plain function; no special API, runs once per mount
const Counter = () => {
  const count = signal(0);
  return <button on:click={() => count(count() + 1)}>{count}</button>;
};
```

Five built-ins (`ForEach`, `Portal`, `Lazy`, `Transition`, `Suspense`) bypass `component()` entirely via an `isDynamic` flag and receive the parent element directly, mounting and updating themselves (`lib/ForEach.ts`, `lib/Portal.ts`, `lib/Lazy.ts`, `lib/Transition.ts`, `lib/Suspense.ts`). For custom elements, `element()` registers a real `HTMLElement` subclass with light DOM by default and opt-in shadow roots (`ElementOptions.shadow`), a Proxy props object where any attribute reads as a tracked getter, synchronous attribute reactivity via overridden `setAttribute`/`removeAttribute`, and one-time slot capture (`lib/element.ts`).

| Framework | Component form |
|---|---|
| HellaJS | Plain function + optional `element()` for Web Components |
| Solid | Function components (run once) |
| Svelte 5 | `.svelte` components |
| React | Function components (re-render) |
| Vue | `.vue` SFC |
| Angular | TS class + `@Component` |

HellaJS's `element()` is the most Web-Components-native authoring path in the group, closer to a custom-elements toolkit than a framework component, while its function components are the leanest: no hooks rules, no re-renders, no lifecycle boilerplate. The cost is that nothing is provided for you: there is no built-in context/provider mechanism, so shared state travels through signals at module scope or explicit props.

---

## 8. Cleanup & Memory Management

HellaJS pairs two cooperating mechanisms:

1. **Synchronous `cleanupSubtree()`**, called directly at every internal removal point: reactive child swaps (`lib/internal/render.ts`), ForEach stale removal and list clearing (`lib/ForEach.ts`), transition leave completion (`lib/Transition.ts`), lazy/suspense region drops (`lib/internal/hydrate.ts`). Per node it runs `beforeDestroy`, disposes component/forEach/lazy/transition/portal/suspense scopes, drains effects, removes direct handlers, runs `afterDestroy`, and deletes state (`lib/internal/cleanup.ts`).
2. **A scoped `MutationObserver` safety net**: one observer shared across all mount targets (`observedContainers` WeakSet) feeds removed state-carrying nodes into a cleanup queue drained on a microtask, skipping nodes that re-attached by the time it runs (`lib/internal/queue.ts`).

All per-element state lives in a `WeakMap<Node, ElementState>`: no expando properties on DOM nodes, and the state GCs with the node it describes (`lib/internal/state.ts`). `effects`, `directHandlers`, and `hooks` are lazy-allocated on first use, so a reactive leaf pays for little more than `{ handlers, isMounted }` (`lib/internal/state.ts`).

| Framework | Cleanup mechanism |
|---|---|
| HellaJS | Sync subtree cleanup + observer safety net, WeakMap state |
| Solid | Owner-tree disposal + `onCleanup` |
| Svelte 5 | Compiler-generated teardown |
| React | `useEffect` return on unmount |
| Vue | Component unmount lifecycle |
| Angular | `OnDestroy` / `DestroyRef` |

HellaJS is the only one here that auto-disposes effects when a node is removed by *outside* code: a third-party library calling `removeChild` inside an observed mount container triggers full cleanup of scopes, handlers, and effects on the next microtask (`lib/internal/queue.ts`), while the synchronous path makes framework-driven updates immediate. Solid, Vue, React, and Angular own their removal paths and leave externally-yanked nodes leaking or diverging.

---

## 9. Error Boundaries

A hybrid global + element-level system:

- Global `onError(fn)` handlers live in a `Set`; they run in insertion order and the first non-null HellaNode wins; `onError(null)` clears all (`lib/features/errors.ts`, re-exported by `lib/error.ts`).
- Element-level config rides the `error:` prefix: `error:fallback` (render function), `error:category` (routing tag), `error:boundary` (explicit boundary) (`lib/internal/render.ts`).
- `findBoundary` walks `parentElement` from the error origin and memoizes on `state.cachedBoundary` with revalidation; a `category`-only config is not a boundary (`lib/features/errors.ts`).
- A `handlingBoundaries` WeakSet detects a boundary erroring while handling and breaks the loop with a console error (`lib/features/errors.ts`).
- `context.reset()` re-renders the boundary's `originalNode`, recovery without remounting the app (`lib/internal/dispatch.ts`).
- Fallback rendering is site-appropriate: reactive-child errors insert the fallback at the anchor preserving siblings; prop/event errors replace the boundary's content (`lib/internal/render.ts`, `lib/internal/events.ts`).

| Framework | Boundary model |
|---|---|
| HellaJS | Global `onError` + element `error:` config + reset + loop guard |
| Solid | `ErrorBoundary` component with fallback prop |
| Svelte 5 | `<svelte:boundary>` with `onerror` / `failed` / `pending` |
| React | Class boundaries + `onCaughtError`/`onUncaughtError` root callbacks |
| Vue | `errorCaptured` hook per component |
| Angular | Global `ErrorHandler` |

HellaJS's DOM-tree-walking boundary lookup is unique: errors find their boundary by position in the rendered DOM, not by component wrapper structure, so any element can be hardened with one attribute and no refactoring. The honest trade: without an `onError` handler registered, errors log to the console and no UI appears at all (`lib/features/errors.ts`), and Svelte's boundary additionally suspends `await` expressions with a `pending` snippet, a combination HellaJS splits between `<Suspense>` and this system (`lib/Suspense.ts`).

---

## 10. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React 19 | Vue 3 | Angular 22 |
|---|---|---|---|---|---|---|
| Lazy / async components | `Lazy` w/ `AbortSignal` (`lib/Lazy.ts`) | `lazy` + Suspense | `await` + dynamic import | `React.lazy` + Suspense | `defineAsyncComponent` | `@defer` |
| Suspense boundary | `<Suspense>`: streaming + client async (`lib/Suspense.ts`) | Yes | `pending` snippet on `<svelte:boundary>` | Yes | `<Suspense>` | No equivalent |
| Portals | `Portal`, 5 insert modes (`lib/Portal.ts`) | `Portal` | Render anywhere | `createPortal` | `<Teleport>` | via Angular CDK |
| Transitions | `Transition` enter/leave/appear/rescue (`lib/Transition.ts`) | Transition components | `transition:` directive | CSS / framer-motion | `<Transition>` | `@angular/animations` |
| Custom elements | First-class `element()` (`lib/element.ts`) | `solid-element` | Custom-element adapter | Full CE support | `defineCustomElement` | `@angular/elements` |
| Existing-DOM refs | `$ref` / `$collection` auto-watch (`lib/$ref.ts`) | `ref` | `bind:this` | ref callback | template ref | `ViewChild` |
| Lifecycle hooks | 6 element-level `hook:` hooks (`lib/features/hooks.ts`) | `onMount`/`onCleanup` | Lifecycle module | `useEffect` | Options/composition hooks | `ngOnInit` et al. |
| Error boundaries | `onError` + `error:` (`lib/features/errors.ts`) | `ErrorBoundary` | `<svelte:boundary>` | Class + root callbacks | `errorCaptured` | `ErrorHandler` |
| SSR + hydration | `ssr` + marker-reader `hydrate` w/ selective hydration (`lib/internal/hydrate.ts` + `internal/deferred.ts`) | `renderToString` + `data-hk` hydrate | Compiled SSR + hydrate | Streaming + selective hydration | `renderToString` + hydrate | Hydration (non-destructive) |
| Streaming SSR | `ssr.stream` + `$hs` progressive reveal + deferred-region adoption (`lib/internal/deferred.ts`) | Streaming SSR | via SvelteKit | `renderToPipeableStream` | via meta-framework | - |
| Keyed lists | `ForEach` LIS (`lib/ForEach.ts`) | `<For>` / `<Index>` | keyed `{#each}` | keys | `v-for :key` | `@for track` |
| SVG / MathML | Namespaced (`createElementNS`, `foreignObject` resets) (`lib/internal/render.ts`) | Yes | Yes | Yes | Yes | Yes |
| Context / DI | None: signals + props | `createContext` | `setContext`/`getContext` | Context | provide / inject | DI + inject |

### Headless utils

The headless wiring layer ships as its own package, `@hellajs/headless`, fifteen utils under `@hellajs/headless/utils` (plus the root barrel): `trapFocus`, `onEscape`, `onOutside`, `rovingTabIndex`, `anchorPosition`, `computeAnchorPosition`, `hoverIntent`, `menuTypeahead`, `onDrag`, `onSwipe`, `onPinch`, `onLongPress`, `onDoubleTap`, `layerDismissal`, and `modal` (each at `packages/headless/lib/utils/utils/<name>.ts`). Nothing wiring-shaped remains in `@hellajs/dom`: its renderer exports are the template/mount/hydrate surface above. The React-ecosystem headless libraries keep the same utils internal to their components:

| Util | HellaJS headless | Radix Primitives | Base UI | Zag |
|---|---|---|---|---|
| Standalone focus trap | Yes (`packages/headless/lib/utils/trapFocus.ts`) | Internal only (FocusScope) | Internal only | Yes (`@zag-js/focus-trap`) |
| Standalone outside-press / Escape | Yes (`packages/headless/lib/utils/onOutside.ts`, `packages/headless/lib/utils/onEscape.ts`) | Internal only (DismissableLayer) | Internal only | Yes (`@zag-js/dismissable`) |
| Standalone roving tabindex | Yes (`packages/headless/lib/utils/rovingTabIndex.ts`) | No public surface | No public surface | No public surface |
| Focus restore on close | Yes, default on (`packages/headless/lib/utils/trapFocus.ts`) | Yes, `onCloseAutoFocus` customizable | Yes, in components | Yes, `returnFocusOnDeactivate` |
| Dynamic content re-query | Per keypress / per press (`packages/headless/lib/utils/trapFocus.ts`, `packages/headless/lib/utils/onOutside.ts`) | Via layer composition | Via parts | Via machine events |
| Orientation / loop control | Both options (`packages/headless/lib/utils/types/utils.d.ts`) | Via RovingFocusGroup internals | Per component | Per machine |
| Home / End jumps | Yes (`packages/headless/lib/utils/rovingTabIndex.ts`) | Yes (in components) | Yes (in components) | Yes (in machines) |
| Nested traps | No | Yes (FocusScope stacking) | Yes (in components) | Yes (focus-trap utility) |
| Shadow DOM traversal | No | Yes | Yes | Yes |
| ARIA attributes provided | No: wiring only | Yes (parts set roles/ids) | Yes | Yes (`connect` getters) |
| Framework adapters | None needed (plain DOM) | React | React | React, Solid, Vue, Svelte |
| Works without a framework | Yes | No | No | Partially (utilities, not machines) |

HellaJS is the only entry whose entire util surface is the wiring itself: the trap, the dismissal listeners, and the roving group are public functions, not machinery hidden under components. Every call returns a dispose handle that undoes its DOM mutations (`rovingTabIndex` restores original `tabindex` attributes from an init-time snapshot, `trapFocus` refocuses the pre-trap `activeElement`; `packages/headless/lib/utils/rovingTabIndex.ts`, `packages/headless/lib/utils/trapFocus.ts`). The honest gaps: the trap handles only edge wrapping (no nested traps, no shadow DOM traversal), and the default focusable collector excludes `tabindex="-1"` while roving writes `-1` onto inactive items, so tabindex-collected groups need an explicit `selector` (`packages/headless/lib/internal/focusables.ts`, `packages/headless/lib/utils/rovingTabIndex.ts`).

### Notable HellaJS differentiators

- `$ref` / `$collection` wrap existing DOM outside HellaJS's render tree, queueing operations until a match appears via an independent `MutationObserver` on `document.body`: `bind`/`on`/`hooks` apply to nodes HellaJS never created (`lib/$ref.ts`, `lib/$collection.ts`, `lib/internal/selectors.ts`).
- `Lazy` cancellation is total: parent removal sets `isCancelled`, aborts an `AbortController`, and the loader receives `{ signal }` for network-level cancellation; both settle paths guard against a removed anchor (`lib/Lazy.ts`).
- `Transition` rapid-toggle rescue: showing during a leave cancels the timer, strips the leave class, and keeps the node: no flicker or double nodes (`lib/Transition.ts`).
- Hydrated `<Suspense>` regions degrade instead of breaking: a sentinel whose staged `<template>` never arrived (interrupted stream) flags the context and the boundary re-suspends client-side with fresh-mount semantics; and when hydrate runs mid-stream, such regions defer instead: each adopts the moment its stage lands, with buffered discrete events replayed positionally (selective hydration, React 19 parity) (`lib/internal/deferred.ts`).
- `raw(html)` embeds foreign HTML as an opaque marker-bounded child that SSR emits verbatim and hydrate adopts without binding anything inside, the seam meta-framework renderers use for slot passthrough (`lib/features/raw.ts`, `lib/internal/hydrate.ts`).

---

## 11. Ergonomics & Syntax

Attribute prefixes are explicit and uniform in JSX:

```jsx
<div
  on:click={handler}        // delegated event (capture phase)
  e:click={handler}         // direct listener (bubble phase)
  class={fn}                // function-ref prop → reactive binding
  style={{ color: theme() }}// style object → kebab-case, no auto-px
  hook:afterMount={fn}      // lifecycle
  error:fallback={<Fail/>}  // error config
  {...attrs}                // spread: merges at its source position
>
  {count}                   // bare signal → live binding
  {count() * 2}             // auto-wrapped by the compiler
</div>
```

Spreads: JSX scatters `{...rest}` onto the element, merging at the spread's source position (a literal attribute after the spread wins; one before is overridden).

The `on:`/`e:`/`hook:`/`error:` convention is closer to Svelte's directive style than React's `onClick` or Vue's `@click`, and it makes the delegated-vs-direct listener choice a prefix rather than a different API. Function-ref props separate reactive from static attributes syntactically, a clarity win over libraries where every attribute behaves the same way until you learn which ones track.

Single-syntax JSX keeps the authoring surface small: one way to write a component, the same output on every site. Where Solid layers a second tagged-template entry and Svelte has no non-SFC option, HellaJS matches React, Vue, and Angular's one-syntax model while compiling to a plain-object AST any package (dom, ssr, a test harness) can consume.

---

## Bottom Line

Architecturally, HellaJS dom is a sibling to Solid and a cousin to Svelte, firmly in the fine-grained-reactive, no-virtual-DOM camp, with React and Vue on the other side of the diffing line and Angular running the heaviest platform. Its surgical per-binding effects, LIS reconciler with trim fast paths, dual cleanup system, compile-time static hoisting, and WeakMap element state are competitive with the established players on raw mechanism.

What sets HellaJS apart (and no single competitor matches all of):

1. **Composable package boundaries**: adopt dom + core, add router/store/css/resource as needed. A library, not a framework.
2. **Compile-time static folding**: the Babel pass folds fully-static subtrees into the cached template HTML, so re-mounting a static branch is one `cloneNode(true)` (`plugins/babel/src/builders/imperative.mjs`, `lib/runtime.ts`).
3. **Marker-based adopt-in-place hydration**: reads `<!--[-->…<!--]-->` regions, adopts server DOM per region, subtree-replaces only mismatches, and degrades gracefully on interrupted streams (`lib/internal/hydrate.ts`).
4. **Web-Components-first `element()`**: custom elements with Proxy reactive props, synchronous attribute propagation, and opt-in shadow DOM (`lib/element.ts`).
5. **Reactive external-DOM refs**: `$ref`/`$collection` auto-watch nodes outside the render tree, queueing ops until they exist (`lib/$ref.ts`, `lib/internal/selectors.ts`).
6. **Auto-cleanup of externally-removed DOM**: the observer safety net disposes effects on third-party `removeChild` inside observed containers (`lib/internal/queue.ts`).
7. **Robust lazy cancellation**: `AbortSignal` propagated into the loader, guards on both settle paths (`lib/Lazy.ts`).

Its gaps are the predictable ones: ecosystem size, devtools, and adoption maturity against React/Vue/Angular. `<Suspense>` streaming reveals content progressively and hydrates selectively: a mid-stream hydrate script defers unresolved regions, adopts each as its stage lands, and replays buffered discrete events (React 19 parity). There is no context/provider mechanism (cross-tree state travels through module-scope signals or props), and `<Suspense>` suspends a thenable child once at mount rather than reactively re-suspending (reactive async belongs to `@hellajs/resource`). Delegated event types register for the page lifetime once used (`lib/internal/events.ts`), and the bare-signal-vs-called tracking rule reads as magic until the `isFunction` gate is internalized.
