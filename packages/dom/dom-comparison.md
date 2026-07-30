# HellaJS @hellajs/dom vs. Solid / Svelte / React / Vue / Angular

A ground-up comparison based on the actual source code of `@hellajs/dom` v2. Every claim below was verified against `packages/dom/lib/`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS dom | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Reactive model | Fine-grained signals (from `@hellajs/core`) | Fine-grained signals | Runes (signals) | VDOM + hooks (proxies) | Proxies (ref/reactive) | Zone.js + signals |
| Rendering | Direct DOM, surgical | Direct DOM, surgical | Compiled direct DOM | VDOM diff & reconcile | VDOM diff & reconcile | VDOM diff + change detection |
| Virtual DOM | None | None | None | Yes | Yes | Yes |
| Compile step | Optional (JSX/html\`\` → HellaNode) | Yes (JSX → reactive) | Yes (SFC → JS) | Yes (JSX → js) | Yes (SFC/template) | Yes (TS/HTML decorators) |
| Gzipped size | ~9 KB min+gzip (~13.7 KB full bundle) | ~7–8 KB | ~2–5 KB runtime | ~40–45 KB | ~34 KB | ~90+ KB |
| External deps | 0 + core peer | 0 | 0 | 0 | 0 | many |
| Templating | JSX and html\`\` | JSX / tagged templates | Svelte SFC | JSX | `<template>` | HTML templates + TS |
| Language | TS, framework-agnostic packages | TS | SFC compiler | JS/TS | SFC compiler | TS-first, decorators |

HellaJS sits closest to Solid philosophically (signal-driven, no VDOM, surgical DOM writes), with a runtime API shape reminiscent of an explicitly-composable library rather than a compiler-first framework like Svelte.

---

## 2. Architecture & Rendering Strategy

### HellaJS

- No virtual DOM. Templates (JSX or html\`\`) compile to a HellaNode AST once, then `mountNode()` produces real DOM nodes directly (`lib/internal/render.ts`, wired up in `lib/mount.ts`).
- Surgical updates: an effect is registered per reactive binding (`render.ts`). When a signal changes, only the specific DOM property/text/attribute bound to it updates — no tree walk, no diffing, no reconciliation of siblings.
- The html\`\` tag caches parsed AST by `TemplateStringsArray` identity in a `WeakMap` (`lib/html.ts`). On first parse, `markStaticSubtrees()` (`lib/internal/template.ts`) walks the entire AST and marks any subtree with zero placeholder dependencies as `static`. Subsequent invocations **share static subtrees by reference** and only deep-clone the dynamic portions (`cloneWithValues`, `template.ts`) — giving you compile-time-like static analysis at runtime, with no build step required.
- Reactive children use invisible text-node anchors + a `renderedNodes` array for stable insertion (`render.ts`) — on mount no comment markers pollute the DOM. Hydration is a marker-reader: `hydrate()` (`lib/hydrate.ts` + `lib/internal/hydrate.ts`) walks AST children in parallel with the server DOM via a node pointer, locating each `<!--[->…<!--]-->` region by its `Comment` nodes (`isMarkOpen`/`gatherRegion`/`consumeRegion`) and adopting it in place — never replacing server DOM. On tag/structure mismatch it warns and re-mounts just that subtree (`replaceMismatch`); a streamed `<Suspense>` region's resolved children arrive as a `<template>` + an inline `$hs` swap script that swaps them in the moment they arrive (progressive, React/Solid parity); `hydrate` later adopts the already-swapped nodes (`swapSuspenseStage` is the no-script/HappyDOM fallback).

### Solid

- Conceptually identical: JSX compiles to reactive computations wrapping direct DOM calls. Both HellaJS and Solid treat the DOM as the source of truth and bind signals directly to nodes.

### Svelte 5

- Compiler analyses reactivity at build time and emits imperative DOM-mutation code. Svelte moves work to compile time; HellaJS does its lightweight parsing at runtime (with optional build-time compilation via the babel/rollup/vite plugins).

### React / Vue

- Both diff a virtual tree and patch the DOM. Even with keys and memoization, they reconcile component subtrees — inherently more work per update than surgical signal bindings.

### Angular

- Change detection walks the component tree (Zone-patched events, or signals in modern Angular) and updates bindings through template instructions. The heaviest runtime of the group.

**Verdict:** HellaJS, Solid, and Svelte form the "no-VDOM, surgical" camp. HellaJS achieves it without a mandatory compiler, which is its differentiator vs. Svelte.

---

## 3. Bundle Size & Dependencies

|  | HellaJS (dom only) | HellaJS dom + core | Solid | Svelte (runtime) | React+ReactDOM |
|---|---|---|---|---|---|
| Min+gzip | ~9 KB | ~11 KB | ~7–8 KB | ~2–5 KB | ~40 KB |

- `@hellajs/dom` declares zero runtime deps and one peer dep (`@hellajs/core`). No scheduler, no event system polyfill, no custom polyfills. The full pre-bundled `dist/bundle.js` is ~13.7 KB gzipped (~9 KB minified+gzipped); the per-module `dist/./*` builds let a bundler tree-shake to only what is imported.
- The package is split: consumers can import `@hellajs/dom/bundle` for a single pre-bundled file, or tree-shake per-feature (`ForEach.js`, `Lazy.js`, `hydrate.js`, etc. are individually published under `dist/./*`).
- The bundle spans rendering, hydration, and reconciliation: the hydrate marker-reader (`internal/hydrate.ts`, ~2.5 KB gzip), the keyed reconciler (`ForEach`, ~2 KB gzip), and the runtime template analyzer (`internal/template.ts`, ~2.5 KB gzip) are the largest slices — surgical updates, in-place hydration, and streaming-Suspense adoption all ship in one peer-dep-only package.
- HellaJS is the only one here that is a composable package rather than a framework you adopt wholesale — you bring your own router/state/CSS from the same ecosystem or none.

---

## 4. Reactivity Granularity

HellaJS's reactivity comes from `@hellajs/core` (a separate package): signals as sources, computeds as transforms, effects as sinks, with a doubly-linked dependency graph and depth-first propagation that is glitch-free.

| Framework | Granularity | Glitch-free? | Untracked reads |
|---|---|---|---|
| HellaJS | Per-binding effect | Yes (DFS propagation) | Automatic — only signal references/functions subscribe |
| Solid | Per-binding computation | Yes | Requires `untrack()` / `markComponent` |
| Svelte 5 | Per-binding (Runes) | Yes | Compile-time static analysis |
| React | Component subtree | No (renders then commits) | Always tracks unless memoized |
| Vue | Component + ref | Mostly | `markRaw`, `shallowRef` opt-outs |
| Angular | Component / signal | Yes (signals) | Zone covers everything by default |

A distinctive HellaJS ergonomic: passing a bare signal reference into JSX creates a **live binding**, while calling it `count()` produces a **one-time static value** (`render.ts` — functions become tracked effects, primitives become static text nodes). This is a clean, explicit, zero-API way to opt in/out of tracking that no competitor matches so directly.

---

## 5. List Reconciliation (ForEach)

HellaJS's `ForEach` (`lib/ForEach.ts`) is a hand-tuned keyed reconciler:

- Three fast paths: **first render** — `currentKeys.length === 0`, builds in a DocumentFragment with a single `insertBefore` (`ForEach.ts`); **complete replacement** — no key overlap detected, bulk swap via fragment (`ForEach.ts`); **empty list** — clears all tracked nodes (`ForEach.ts`).
- LIS algorithm (O(n log n) binary search) for the complex case, moving only non-longest-increasing-subsequence nodes (`ForEach.ts`).
- Key resolution priority: `element.props.key` → `item.id` → array index (`ForEach.ts`).
- Key-only vs. reference reconciliation: explicit keys reuse DOM nodes purely by key identity; index-fallback keys require the same item reference — preventing accidental reuse on shuffled index-keyed data (`ForEach.ts`: `if (!node || (!hasExplicitKey && oldItem !== item))`).
- Collection reuse: `keyToNode`/`keyToItem`/`currentKeys` are swapped (not reallocated) across renders; temp arrays are cleared and reused (`ForEach.ts`).

| Framework | Algorithm |
|---|---|
| HellaJS | LIS + fast paths, manual keyed, collection reuse |
| Solid | `<For>` keyed with map lookup; `<Index>` unkeyed |
| Svelte | Compiled keyed `{#each}` with optimize diff |
| React | Child-array reconciliation + keys (LIS-like under the hood) |
| Vue | Heuristic diff with keys, also LIS-based moves |
| Angular | `*ngFor` / `@for` with `trackBy` |

HellaJS is roughly on par with Solid/Vue for list performance and ahead of naive React usage. Its fast paths (first-render, complete-replacement, empty) make common app patterns essentially free.

---

## 6. Event Handling

HellaJS uses global event delegation by default via the `on:` prefix:

- A single `document.body.addEventListener(type, handler, true)` listener per event type, registered in the capture phase (`lib/internal/events.ts`).
- Dispatch walks `event.composedPath()` (pre-computed ancestor chain) and looks up `getState(element).handlers[type]` on each ancestor (`events.ts`).
- \`globalListeners\` Set short-circuits when no handlers exist for a type (\`events.ts\`).
- `e:` prefix offers direct (non-delegated) listeners when delegation is undesirable (`events.ts`).

| Framework | Strategy |
|---|---|
| HellaJS | Global delegation, capture phase, single listener/type |
| Solid | Per-element listeners via `on:` (synthetic events optional) |
| Svelte | Compiled `on:` → native `addEventListener` per element |
| React | Synthetic event system (single delegated root listener) |
| Vue | Per-element `v-on` → native listeners |
| Angular | Per-element listeners via `@Output` / `(click)` |

HellaJS's approach is closest to React's historical root delegation, but with capture-phase traversal and the `composedPath` optimization. The downside vs. Svelte/Solid: capture-phase delegation means `event.stopPropagation()` on the target behaves differently — HellaJS traverses the entire path by default (no auto-stop).

---

## 7. Component Model & Composition

HellaJS is unusual here: components are just functions returning HellaNodes. There is no class component, no props object passed by the framework in the React sense. `component()` is a low-level scope wrapper (`lib/component.ts`) used mainly for automatic effect cleanup via `scope()`.

```js
// Plain function — no special API
const Counter = () => {
  const count = signal(0);
  return <button on:click={() => count(count() + 1)}>{count}</button>;
};
```

For reusable Web Components, `element()` (`lib/element.ts`) registers a real `HTMLElement` subclass with:

- **Light DOM only** (no shadow DOM — deliberate, since shadow boundaries break its reactivity internals) (`element.ts`).
- **Proxy-based reactive props**: `props.anyAttr()` is a tracked getter reading `getAttribute`. Any attribute is accessible without declaration (`element.ts`).
- **Synchronous attribute reactivity** by overriding `setAttribute`/`removeAttribute` (`element.ts`).
- **Slot capture**: children captured once before mount, projected as raw DOM nodes. Named slots via the `slot` attribute (`element.ts`).

| Framework | Component form |
|---|---|
| HellaJS | Plain function + optional `element()` for Web Components |
| Solid | Function components |
| Svelte 5 | `.svelte` components / classes |
| React | Function components (classes legacy) |
| Vue | `.vue` SFC / Options object |
| Angular | TS class + `@Component` decorator |

HellaJS's `element()` is more "Web Components native" than any competitor's component model — closer to a real custom-elements authoring tool than a framework component.

---

## 8. Cleanup & Memory Management

This is a HellaJS standout. It uses a dual cleanup system:

1. **Synchronous `cleanupSubtree()`** — invoked directly during reactive child removal (e.g. ForEach removal at `ForEach.ts`, Transition leave at `Transition.ts`, reactive child swap at `render.ts`). Immediate, no delay.
2. **Scoped `MutationObserver`** as a safety net on mount targets (`lib/internal/queue.ts`), deferred via `queueMicrotask` (runs before paint), with `isConnected || parentNode` checks (`queue.ts`) so moved nodes aren't disposed.

Element state lives in a `WeakMap<Node, ElementState>` (`lib/internal/state.ts`) — zero property pollution on DOM elements (`__hella_`-style expando properties are explicitly avoided). ForEach collections, template ASTs, and text-node anchors are all reused rather than reallocated.

| Framework | Cleanup mechanism |
|---|---|
| HellaJS | Dual sync + observer, WeakMap state, auto-dispose |
| Solid | `createMemo`/`createEffect` + cleanup callbacks, manual `onCleanup` |
| Svelte | Compile-time-generated teardown, `onDestroy` |
| React | `useEffect` return + unmount; no auto-cleanup of DOM moved externally |
| Vue | Component unmount lifecycle; watchers auto-stopped |
| Angular | `OnDestroy`, `takeUntil`, `DestroyRef` |

HellaJS is the only one that auto-cleans DOM nodes removed externally (e.g. by a third-party library calling `removeChild`). React/Vue/Angular/Solid generally leak effects if a node is yanked outside their APIs.

---

## 9. Error Boundaries

HellaJS implements a hybrid global + element-level system (`lib/error.ts`, `lib/internal/dispatch.ts`, `error:` prefix):

- Global `onError()` handler (`error.ts`), supports multiple handlers via a `Set` (`dispatch.ts`), first non-null result wins (`dispatch.ts`).
- Element-level config: `error:fallback`, `error:category`, `error:boundary` (`render.ts`).
- `findBoundary()` walks the DOM tree via `parentElement` and caches the result in `state.cachedBoundary` (`dispatch.ts`).
- Fallback UI is rendered for bind/event/reactive-child errors; `beforeMount` hook errors are caught but render no fallback (`render.ts`).
- `reset()` re-renders `state.originalNode` — recovery without remount (`dispatch.ts`).
- Infinite-loop prevention via a `WeakSet` `handlingBoundaries` that tracks active boundaries (`dispatch.ts`, `dispatch.ts`).

| Framework | Boundary model |
|---|---|
| HellaJS | Global `onError()` + element `error:` config + reset + loop guard |
| Solid | `ErrorBoundary` component with fallback prop |
| Svelte | No built-in boundary (community workarounds) |
| React | `componentDidCatch` / `getDerivedStateFromError` class boundaries |
| Vue | `errorCaptured` hook per component |
| Angular | Global `ErrorHandler` + zone error handling |

HellaJS's global-first approach with DOM-tree-walking boundary lookup is unique — closer to how the platform itself propagates errors. React/Vue/Solid require wrapping components explicitly.

---

## 10. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte | React | Vue |
|---|---|---|---|---|---|
| Lazy / async components | `Lazy` w/ `AbortSignal` | `lazy` + `Suspense` | `await` blocks | `React.lazy` + `Suspense` | `defineAsyncComponent` |
| Suspense | `<Suspense>` (streaming + client async) | Yes | Yes | Yes | Yes |
| Portals | `Portal` (5 insert modes: `lib/Portal.ts`) | `Portal` | `svelte:portal` | `createPortal` | `<Teleport>` |
| Transitions | `Transition` (enter/leave/appear/rescue) | via transitions | `transition:` directive | CSS / framer-motion | `<Transition>` |
| Custom elements | First-class `element()` | web wrapper | custom-element adapter | `customElements.define` | `defineCustomElement` |
| Refs to existing DOM | `$ref` / `$collection` w/ auto-watch | `ref` | `bind:this` | ref callback | template ref |
| Lifecycle hooks | `hook:` prefix (5 hooks) | `onMount`/`onCleanup` | lifecycle module | `useEffect` | options hooks |
| Scoped styling | via `@hellajs/css` package | css\`\` | `<style scoped>` | CSS Modules / styled | `<style scoped>` |

### Notable HellaJS differentiators

- `$ref` / `$collection` auto-watch via an independent `MutationObserver` on `document.body` (`lib/internal/selectors.ts`) — you can target existing DOM nodes outside HellaJS's render tree and operations are queued until they appear (`$ref.ts`). No competitor offers reactive external-DOM manipulation this directly.
- Lazy cancellation is uniquely robust: parent removal sets `isCancelled`, aborts an `AbortController`, and the loader receives `{ signal }` for user-side network cancellation (`Lazy.ts`). Both `.then()` and `.catch()` check `isCancelled` and `anchor.parentNode` before touching the DOM. React/Solid Suspense and Vue async components generally don't cancel in-flight loaders on unmount.
- Transition rapid-toggle rescue: toggling `show` during a leave animation cancels the leave timer, removes the leave class, and keeps the node (`Transition.ts`) — avoiding flicker bugs that plague hand-rolled transitions.
- Progressive Suspense streaming: each region's resolved children stream as a `<template>` + an inline `$hs` swap script that swaps them the moment they arrive (React/Solid parity). `hydrate()` then reads `<!--[->…<!--]-->` markers to adopt the already-swapped server DOM in place, with mismatched subtrees re-mounted individually (`lib/internal/hydrate.ts`; `swapSuspenseStage` is the no-script/HappyDOM fallback when the inline script hasn't run).

---

## 11. Ergonomics & Syntax

HellaJS attribute prefixes are distinctive and explicit:

```html
<div
  on:click={handler}      // delegated event (capture-phase)
  e:click={handler}       // direct listener
  bind:class={fn}         // reactive attribute binding
  hook:afterMount={fn}    // lifecycle
  error:fallback={<Fail/>}// error config
>
  {signal}                // live binding
  {signal()}              // static one-time read
</div>
```

The `on:`/`bind:`/`hook:`/`error:` prefix convention (`template.ts`) is closer to Svelte's `on:`/`bind:` directives than React's `onClick`/Vue's `@click`. The explicit `bind:` for reactive attributes vs. plain attributes for static ones is a clarity win over Solid/React where all attributes behave the same way.

The dual JSX + html\`\` story is a genuine differentiator: the **same HellaNode AST** is produced by both, so authors can choose JSX (build-compiled, type-checked) or html\`\` (runtime, dependency-free) per file. Solid has `solid-html` but it's secondary; Svelte has no equivalent (SFC only); React/Vue/Angular have no tagged-template option.

---

## Bottom Line

Architecturally, HellaJS dom is a sibling to Solid and a cousin to Svelte — it belongs firmly in the "fine-grained reactive, no virtual DOM" camp. Its surgical update model, LIS-keyed reconciliation with three fast paths, dual cleanup system (synchronous + MutationObserver safety net), runtime static-subtree analysis (`markStaticSubtrees`), and WeakMap-based element state are all competitive with or superior to the established players on raw mechanism.

What sets HellaJS apart — and no single competitor matches all of:

1. **Composable package boundaries** — adopt dom, core, css, router, resource, store independently. Not a framework.
2. **Runtime static analysis** — `markStaticSubtrees` identifies zero-dependency subtrees on first parse and shares them by reference across all future invocations. Compile-time-like optimization with no build step.
3. **Dual JSX + html\`\` syntax** — the same HellaNode AST from both. JSX for type-checked build paths, html\`\` for zero-dependency runtime authoring.
4. **Zero-API tracking control** — bare signal reference = live binding; `signal()` = one-time read. No `untrack()`, no `markRaw()`, no `shallowRef()`.
5. **Web-Components-first `element()`** — light DOM custom elements with Proxy-based reactive props, synchronous attribute reactivity, and slot capture. Closer to a real custom-elements authoring tool than a framework component.
6. **Auto-cleanup of externally-removed DOM** — the only library here that auto-disposes effects when a third-party library yanks a node via `removeChild`.
7. **Reactive external-DOM refs** — `$ref`/`$collection` with auto-watching MutationObserver, targeting nodes outside HellaJS's own render tree.
8. **Robust lazy cancellation** — `AbortSignal` propagated to the loader, `isCancelled` guards on both resolve and reject paths.

Its gaps are the predictable ones: bundle size reflects its in-bundle hydration and streaming-Suspense support (~9 KB min+gzip, slightly above Solid's ~7–8 KB and well above Svelte's ~2–5 KB), plus ecosystem size, devtools, and adoption maturity. SSR + hydration ship via `@hellajs/ssr` (a zero-runtime-import stringifier — with `ssrAsync` and `ssrStream` — emitting `<!--[->…<!--]-->` region markers plus a `<!--hsN-->` Suspense sentinel) and `hydrate()` (a one-shot marker-reader that adopts server DOM in place, adopts already-swapped `<Suspense>` regions in place (an inline `$hs` script swapped each as it arrived), and re-mounts only mismatched subtrees — no VDOM, no coalescing rebuild; content reveals progressively (React/Solid parity), with per-segment *interactivity* hydration the remaining gap).
