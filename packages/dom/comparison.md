# @hellajs/dom — Feature Comparison

A comprehensive feature-by-feature comparison of HellaJS DOM against Solid, Vue 3, React, Angular, and Svelte 5. All data gathered from official documentation and source code as of June 2026.

---

## 1. Architecture Overview

| Aspect | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Rendering model | Real DOM (surgical) | Real DOM (fine-grained) | Virtual DOM + compiler | Virtual DOM | Component DOM (incremental) | Compiled real DOM |
| Reactivity | Signal-based (runtime) | Signal-based (runtime) | Proxy-based (runtime) | State hooks (runtime) | Signals + Zone.js (runtime) | Compiler-generated (build-time) |
| Diffing strategy | No diffing — direct bindings | No diffing — direct bindings | VDOM diff (compiler-optimized) | VDOM reconciliation | Incremental DOM checks | No runtime diffing — compiled |
| Template system | JSX + `html` tagged template | JSX | SFC templates + JSX | JSX | HTML templates | Svelte syntax (.svelte) |
| Build requirement | Optional (Babel plugin for JSX) | Required (JSX transform) | Optional (browser build) | Required (JSX) | Required (compiler) | Required (compiler) |
| Component model | Plain functions | Plain functions | Options/Composition API | Functions/classes | Classes + decorators | Compiled components |
| Language | TypeScript-first | TypeScript-first | TypeScript-first | TypeScript/JavaScript | TypeScript-only | TypeScript-first |

---

## 2. Bundle Size

All sizes are **minified + gzipped** for the DOM rendering layer. "With reactivity" includes the reactive primitives.

| Package | Core Runtime | DOM Layer | Combined | Notes |
|---|---|---|---|---|
| **@hellajs/dom** | 1.78 KB (core) | 6.29 KB (dom bundle) | **~6.3 KB** | Core + DOM in single bundle |
| **Solid** | ~1.5 KB (signals) | ~7.2 KB (solid-js) | **~7.5 KB** | Excludes solid-jsx runtime |
| **Svelte 5** | ~2 KB (runtime) | Compiled per-component | **~2–4 KB** | No framework runtime — compiled output |
| **Vue 3** | ~12 KB (reactivity) | ~22 KB (runtime-dom) | **~34 KB** | Full VDOM runtime included |
| **React 19** | ~2 KB (react) | ~40 KB (react-dom) | **~42 KB** | Full VDOM reconciliation |
| **Angular** | N/A | N/A | **~60–130 KB** | Full framework — DI, router, forms, etc. |

> HellaJS sits between Svelte and Solid — the smallest full-featured real-DOM library. Only Svelte compiles away more, at the cost of requiring a build step.

---

## 3. Reactivity Model

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Primitive | `signal()` getter/setter | `createSignal()` getter/setter | `ref()` / `reactive()` | `useState()` | `signal()` | `$state` rune |
| Computed | `computed()` | `createMemo()` | `computed()` | `useMemo()` | `computed()` | `$derived` rune |
| Side effects | `effect()` | `createEffect()` | `watchEffect()` | `useEffect()` | `effect()` | `$effect` rune |
| Scope cleanup | `scope()` auto-dispose | `onCleanup()` | `onUnmounted()` | cleanup return | `DestroyRef` | auto via compiler |
| Batch updates | `batch()` | `batch()` | `nextTick()` | automatic | `NgZone.run()` | automatic |
| Glitch-free | Yes (DFS propagation) | Yes (DFS propagation) | Yes | Yes (batched) | Partial | Yes (compiled) |
| Dependency tracking | Automatic (auto-tracking) | Automatic (auto-tracking) | Automatic (Proxy) | Manual deps array | Automatic (signals) | Automatic (compiler) |

### Key Differences

- **HellaJS** and **Solid** share the most similar reactivity model — both use getter/setter signals with automatic dependency tracking and depth-first propagation. No VDOM overhead.
- **Vue 3** uses JavaScript Proxies for reactivity, requiring `.value` access on refs. The VDOM layer adds overhead, but compiler optimizations (static hoisting, patch flags) mitigate it.
- **React** requires manual dependency arrays and re-renders entire component subtrees. No fine-grained updates without external libraries.
- **Angular** is transitioning from Zone.js dirty-checking to signal-based reactivity. Zone.js is still the default for many apps.
- **Svelte 5** compiles reactivity at build time via runes (`$state`, `$derived`, `$effect`). No runtime tracking overhead.

---

## 4. DOM Rendering Features

### 4.1 Template Syntax

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| JSX support | Yes (Babel plugin) | Yes (Babel/plugin) | Yes (optional) | Yes (native) | No | No |
| Tagged templates | Yes (`html` literal) | No | No | No | No | No |
| SFC templates | No | No | Yes (.vue) | No | Yes (.html) | Yes (.svelte) |
| Template caching | WeakMap by identity | Compiled once | Compiled once | N/A (VDOM) | Compiled once | Compiled once |
| Dynamic components | `<${Comp}>` | `<Dynamic>` | `<component :is>` | conditional render | `NgComponentOutlet` | `{#snippet}` + `{@render}` |
| Fragment support | `tag: "$"` fragments | `<>` fragments | `<template>` multi-root | `<>` fragments | `<ng-container>` | Multi-root allowed |

### 4.2 Event Handling

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Event delegation | **Global** (single listener per type) | Synthetic events | Per-element | Synthetic events | Per-element | Per-element (compiled) |
| Delegation phase | Capture phase on body | N/A | N/A | Bubble phase on root | N/A | N/A |
| Handler lookup | `composedPath()` traversal | Direct binding | Direct binding | Direct binding | Direct binding | Direct binding |
| Direct events (`e:`) | Yes | `on:` native | `.native` modifier | Rarely needed | `(event)` binding | `on` (native) |
| Custom events | Via `on:` prefix | `on:` dispatch | `$emit` / `defineEmits` | Custom props | `@Output()` | `createEventDispatcher` |
| Event cleanup | Auto via MutationObserver | Manual / onCleanup | Auto (component scope) | Auto (unmount) | Auto (DestroyRef) | Auto (compiled) |

> HellaJS is the **only framework** with global event delegation — a single `capture` phase listener per event type on `document.body`. This minimizes memory overhead and setup/teardown costs for large DOM trees. All other frameworks attach individual listeners to each element.

### 4.3 Reactive Bindings

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Attribute binding | `bind:attr={fn}` | `attr={fn()}` | `:attr="expr"` | `attr={expr}` | `[attr]="expr"` | `attr={expr}` |
| Class binding | `bind:class={fn}` | `classList={obj}` | `:class="expr"` | `className={expr}` | `[class]="expr"` | `class={expr}` |
| Style binding | `bind:style={fn}` | `style={obj}` | `:style="obj"` | `style={obj}` | `[style]="expr"` | `style={expr}` |
| Two-way binding | Via `$ref` / `bind:` | `value={s()} onInput={s}` | `v-model` | Manual `value` + `onChange` | `[(ngModel)]` | `bind:value` |
| Boolean attributes | Auto (disabled → true) | Auto | Auto | Manual | Auto | Auto |
| Selective updates | Surgical (per-element) | Surgical (per-element) | Per-component + patch | Per-component re-render | Per-component check | Per-element (compiled) |

### 4.4 List Rendering

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| List control flow | `<ForEach>` | `<For>` | `v-for` | `.map()` | `*ngFor` | `{#each}` |
| Key strategy | Keyed (key → id → index) | Keyed only | Keyed (`:key`) | Keyed (`key`) | TrackBy function | Keyed (`(item)`) |
| Reconciliation | **LIS algorithm** | Unwrapped + keyed map | LIS algorithm (compiler) | VDOM diff (heuristic) | Iterable differ | Compiled keyed blocks |
| Fast paths | First render, empty, full replace | First render, keyed map | Compiler optimized | VDOM memo | Default iterables | Compiled |
| Collection reuse | Map/Array swapping | Map reuse | N/A | N/A | N/A | Compiled |
| Move optimization | LIS binary search O(n log n) | Index mapping | LIS O(n log n) | VDOM heuristic O(n) | Linear scan O(n) | Compiled minimal moves |

> HellaJS's ForEach uses the same LIS (Longest Increasing Subsequence) algorithm as Vue 3 for keyed reconciliation, implemented with binary search for O(n log n) performance. It adds collection reuse (swapping Maps instead of reallocating) and multiple fast paths (first render, empty list, complete replacement).

### 4.5 Conditional Rendering

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Conditionals | Function expressions | `<Show>` / `<Switch>` | `v-if` / `v-else` | Ternary / `&&` | `*ngIf` | `{#if}` |
| Ternary inline | `{cond ? a : b}` | `{cond() ? a : b}` | Inline ternary | `{cond ? a : b}` | `[ngSwitch]` | Ternary |
| Reactive markers | START/END comments | DOM insertion points | VDOM diff | VDOM diff | DOM insert/remove | Compiled blocks |
| DOM stability | Markers preserve position | Insertion points | Patch flags | Key-based | Structural directives | Compiled |

### 4.6 Portals / Teleport

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Portal component | `<Portal>` | `<Portal>` | `<Teleport>` | `createPortal()` | `cdkPortal` / `NgTemplateOutlet` | `{#await}` + actions |
| Insert modes | append, prepend, replace, before, after | Single target | Single target (to) | Single target | Various | N/A (use actions) |
| Reactive updates | Yes (re-renders on change) | Yes | Yes | Yes | Manual | N/A |
| Cleanup tracking | Comment marker + portalNodes array | Manual | Auto | Auto | Manual | N/A |
| Multiple portals | Supported | Supported | Supported | Supported | Manual | Via actions |

### 4.7 Lazy Loading

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Lazy component | `<Lazy>` | `lazy()` + `<Suspense>` | `defineAsyncComponent` + `<Suspense>` | `React.lazy` + `<Suspense>` | `loadComponent` | `{#await}` |
| Loading state | `loading` prop | `<Suspense>` fallback | `<Suspense>` fallback | `<Suspense>` fallback | Loading template | `{#await}` then |
| Error fallback | `fallback` prop | Error boundary | Error boundary | Error boundary | Error boundary | `{#await}` catch |
| Boundary markers | Comment nodes ("lazy-start/end") | N/A | N/A | N/A | N/A | N/A |

---

## 5. Lifecycle & Cleanup

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| beforeMount | `hook:beforeMount` | `onMount` (before first effect) | `onBeforeMount` | `useLayoutEffect` | `ngOnInit` | `$effect` (pre-flush) |
| afterMount | `hook:afterMount` | `onMount` | `onMounted` | `useEffect` | `ngAfterViewInit` | `onMount` |
| beforeUpdate | `hook:beforeUpdate` | `on` effect | `onBeforeUpdate` | `useEffect` (prev) | `ngDoCheck` | `$effect.pre` |
| afterUpdate | `hook:afterUpdate` | effect re-run | `onUpdated` | `useEffect` | `ngAfterViewChecked` | `$effect` |
| beforeDestroy | `hook:beforeDestroy` | `onCleanup` | `onBeforeUnmount` | cleanup return | `ngOnDestroy` | `$effect` cleanup |
| afterDestroy | `hook:afterDestroy` | N/A | `onUnmounted` | N/A | `ngOnDestroy` | `onDestroy` |
| Auto-cleanup | **MutationObserver** (automatic) | Manual `onCleanup` | Component-scoped | Component-scoped | `DestroyRef` | Compiled auto |
| Effect scoping | `scope()` + component wrapper | Owner-based | Component instance | Component instance | Injector-scoped | Block-scoped |

> HellaJS uses MutationObserver to automatically detect when DOM nodes are removed and disposes associated effects and event handlers. This is unique — no other framework provides automatic cleanup based on DOM lifecycle.

### Hook Stacking

HellaJS allows **stacking multiple lifecycle hooks** of the same type on a single element. All hooks of a given type execute in registration order. Most other frameworks support only one hook per lifecycle event per component.

---

## 6. Error Handling

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Global handler | `onError()` (stacked) | `ErrorBoundary` component | `app.config.errorHandler` | `ErrorBoundary` class | `ErrorHandler` service | `onError` in boundary |
| Element-level config | `error:` prefix attributes | ErrorBoundary component | `onErrorCaptured` | ErrorBoundary component | `@HostBinding` try/catch | `<svelte:boundary>` |
| Fallback rendering | Automatic (replaceChildren) | Manual (fallback render) | Manual (template) | Manual (fallback render) | Manual | Manual (snippet) |
| Boundary lookup | DOM tree walk + cache | Component tree | Component tree | Component tree | Component tree | Component tree |
| Reset capability | `reset()` in ErrorContext | Manual | Manual | Manual (retry) | Manual | `reset()` function |
| Infinite loop prevention | WeakSet tracking | Manual | Manual | Manual | Manual | Auto (compiled) |
| Error categories | `error:category` attribute | Manual | Manual | Manual | Manual | Manual |

> HellaJS provides the most granular error boundary system — element-level configuration via `error:` prefix attributes, automatic fallback rendering, boundary caching for O(1) lookups, and built-in infinite loop prevention. No other framework offers this level of error handling granularity at the DOM element level.

---

## 7. Custom Elements / Web Components

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Web Component API | `element()` built-in | Solid Element | `defineCustomElement` | Manual (Lit) | `@customElement` decorator | `customElement` option |
| DOM mode | **Light DOM** | Shadow DOM | Shadow DOM | N/A | Shadow DOM | Shadow DOM |
| Reactive props | Proxy-based auto-access | Props declaration | Props declaration | Props | `@Input()` | `$props` rune |
| Slot support | Named + default slots | `<Slot>` | `<slot>` | `children` | `<ng-content>` | `{@render}` snippets |
| Disconnect cleanup | Automatic (scope dispose) | Manual | Manual | N/A | Automatic | Automatic |
| Reconnect behavior | Fresh re-render | Manual | Manual | N/A | Fresh re-render | Fresh re-render |

> HellaJS intentionally uses light DOM for custom elements. This allows reactive bindings to work transparently — no shadow DOM boundary to break signal propagation. Props are accessed via Proxy, so any attribute works without explicit declaration.

---

## 8. DOM References

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Single ref | `$ref(selector)` | `ref` directive | `ref="name"` / `useRef` | `useRef` | `@ViewChild()` | `bind:this` |
| Collection ref | `$collection(selector)` | Manual query | `ref` on v-for | Manual queryAll | `@ViewChildren()` | `bind:this` on each |
| Auto-watching | MutationObserver | N/A | N/A | N/A | N/A | N/A |
| Queued operations | Applied when element appears | N/A | N/A | N/A | N/A | N/A |
| Method chaining | `.bind().on().hooks()` | N/A | N/A | N/A | N/A | N/A |
| Reactive wrapper | Per-element DomWrapper | N/A | N/A | N/A | N/A | N/A |

> `$ref` and `$collection` are unique to HellaJS — they provide reactive references to existing DOM elements (not framework-rendered ones) with auto-watching via MutationObserver. Operations queue when elements don't exist and apply automatically when they appear. No other framework provides this for external/pre-existing DOM.

---

## 9. Performance Characteristics

| Aspect | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Initial render | Direct DOM creation | Direct DOM creation | VDOM → DOM | VDOM → DOM | Incremental DOM | Compiled DOM |
| Updates | Surgical (affected elements only) | Fine-grained (affected elements only) | VDOM diff + patch | VDOM reconciliation + commit | Component-level check | Compiled per-element |
| Memory overhead | Low (no VDOM) | Low (no VDOM) | Medium (VDOM tree) | Medium (fiber tree) | High (DI + Zone) | Low (no runtime) |
| GC pressure | Minimal (collection reuse) | Minimal | Medium (VDOM nodes) | Medium (fiber nodes) | Higher (DI/zone) | Minimal |
| Event memory | O(1) per type (global delegation) | O(n) handlers | O(n) handlers | O(n) handlers | O(n) handlers | O(n) handlers |
| Template caching | WeakMap (auto GC) | Compile-time | Compile-time | N/A | Compile-time | Compile-time |
| Fragment batching | DocumentFragment inserts | DocumentFragment inserts | Compile-time | Batched updates | Batched updates | Compiled |

### Performance Optimizations Unique to HellaJS

1. **Global event delegation**: Single listener per event type on `document.body` in capture phase. All other frameworks attach per-element handlers.
2. **MutationObserver auto-cleanup**: No manual cleanup needed — effects and handlers are disposed when DOM nodes are removed.
3. **Collection reuse in ForEach**: Maps and arrays are swapped (not reallocated) between render cycles.
4. **Char code attribute parsing**: First character code check for attribute prefix detection instead of string comparison.
5. **Comment marker stability**: Markers persist across updates rather than being recreated.
6. **Shallow AST cloning**: Only mutable parts of cached templates are cloned during interpolation.

---

## 10. Developer Experience

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Learning curve | Low (if familiar with signals) | Low (if React-familiar) | Low | Low | High | Low |
| TypeScript support | Full inference | Full inference | Full inference | Full inference | Full (required) | Full inference |
| No build step needed | Yes (with CDN) | No | Yes (browser build) | No | No | No |
| Hot module replacement | Via Vite plugin | Via Vite | Via Vite | Via Vite/webpack | Via CLI | Via Vite |
| DevTools | Browser DevTools | Solid DevTools | Vue DevTools | React DevTools | Angular DevTools | Svelte DevTools |
| SSR support | Planned | Yes | Yes | Yes | Yes | Yes (SvelteKit) |
| Hydration | Planned | Yes (lazy) | Yes | Yes | Yes | Yes |
| Testing utilities | Built-in flush/queue helpers | Solid Testing Library | Vue Test Utils | React Testing Library | Angular Testing | Svelte Testing Library |
| CSS-in-JS integration | Via `@hellajs/css` package | Via external libs | Scoped CSS in SFC | External (styled, etc) | Component CSS | Scoped CSS in SFC |

---

## 11. Ecosystem & Maturity

| Aspect | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Initial release | 2024 | 2021 | 2020 | 2013 | 2016 | 2024 (v5) |
| npm downloads/week | Growing | ~250K | ~5M | ~25M | ~3M | ~300K |
| GitHub stars | ~200 | ~33K | ~50K | ~235K | ~100K | ~82K |
| npm packages | 6 packages + 3 plugins | Solid ecosystem | Vue ecosystem | Massive | Angular ecosystem | Svelte ecosystem |
| Router | @hellajs/router | solid-router | vue-router | react-router | @angular/router | SvelteKit built-in |
| State management | @hellajs/store | Solid signals | Pinia | External (Zustand, etc) | NgRx / Signals | Built-in ($state) |
| CSS solution | @hellajs/css | External | Scoped SFC | External | Component CSS | Scoped SFC |
| Resource fetching | @hellajs/resource | solid-query | VueUse / TanStack | TanStack Query | HttpClient | External |
| Corporate backing | Independent | Independent | Independent | Meta | Google | Vercel |

---

## 12. Feature Matrix Summary

| Feature | HellaJS | Solid | Vue 3 | React | Angular | Svelte 5 |
|---|---|---|---|---|---|---|
| Surgical DOM updates | Yes | Yes | Partial (VDOM) | No (VDOM) | Partial | Yes (compiled) |
| No virtual DOM | Yes | Yes | No | No | No | Yes |
| Signal-based reactivity | Yes | Yes | Partial (ref) | No | Yes | Yes (compiled) |
| Global event delegation | Yes | No | No | No | No | No |
| Auto-cleanup (MutationObserver) | Yes | No | No | No | No | No |
| LIS list reconciliation | Yes | No (keyed map) | Yes | No (heuristic) | No | No (compiled) |
| Tagged template syntax | Yes | No | No | No | No | No |
| Error boundaries (element-level) | Yes | Component | Component | Component | Service | Component |
| Web Components (built-in) | Yes | Plugin | Plugin | No | Decorator | Option |
| Light DOM custom elements | Yes | No | No | N/A | No | No |
| Reactive DOM refs ($ref) | Yes | No | No | No | No | No |
| Lazy loading with boundaries | Yes | Suspense | Suspense | Suspense | Manual | {#await} |
| Portals (multi-mode) | Yes | Yes | Yes | Yes | Partial | No |
| Scope-based cleanup | Yes | Yes (owner) | Yes (instance) | Yes (instance) | Yes (injector) | Yes (block) |
| No build step | Yes | No | Optional | No | No | No |

---

## 13. Competitive Positioning

### HellaJS's Unique Strengths

1. **Smallest full-featured real-DOM library** at ~6.3 KB min+gzip (core + DOM). Only Svelte is smaller, but requires a compiler.
2. **Global event delegation** — unique among all frameworks. Reduces memory and setup costs proportionally to DOM size.
3. **Automatic MutationObserver cleanup** — the only framework that detects DOM removal and auto-disposes effects/handlers. Zero manual cleanup.
4. **Dual template syntax** — both JSX (via Babel plugin) and `html` tagged templates work without a build step.
5. **Element-level error boundaries** — most granular error handling in any framework, with boundary caching and reset.
6. **Reactive DOM refs** — `$ref` and `$collection` for manipulating existing DOM elements with auto-watching. Unique capability.
7. **Light DOM web components** — preserves reactivity transparency, no shadow DOM boundary issues.
8. **Modular package architecture** — use only what you need: core, dom, css, router, store, resource. Each independently versioned.

### Areas for Growth

1. **SSR/Hydration** — not yet available. Solid, Vue, React, Angular, and Svelte all support server-side rendering.
2. **DevTools** — no dedicated browser extension yet. All major competitors have one.
3. **Ecosystem size** — young ecosystem compared to React/Vue/Angular. Fewer third-party libraries.
4. **Community** — smaller community, fewer tutorials, Stack Overflow answers, and learning resources.
5. **Suspense/async orchestration** — Lazy loading exists but no unified Suspense boundary like React/Solid/Vue.
6. **Transitions/animations** — no built-in transition system. Vue and Svelte have first-class support.

### Where HellaJS Fits Best

- **Performance-critical apps** where bundle size and surgical updates matter (dashboards, data-heavy UIs, embedded widgets)
- **Progressive enhancement** over existing HTML — `$ref` and `$collection` work with server-rendered DOM
- **Micro-frontends** — small footprint, no VDOM, light DOM custom elements
- **Library authors** — use as a reactive DOM layer without imposing a framework
- **Projects avoiding build steps** — tagged templates work in browsers directly

---

*Data sources: Official documentation, source code analysis, npm package sizes (bundlephobia), and js-framework-benchmark. Bundle sizes are approximate and may vary by version. Last updated: June 2026.*

---

## 14. Critical Red Flags

An honest audit of architectural decisions that could cause real problems in production. These are ranked by severity.

---

### CRITICAL: Global MutationObserver on `document` with `subtree: true`

**File:** `registry.ts:171-219`

```ts
observer.observe(document, {
  childList: true,
  subtree: true
});
```

This observes **every DOM mutation in the entire page** — not just HellaJS-managed nodes. Every `appendChild`, `removeChild`, `innerHTML` change, third-party library mutation, or browser extension DOM manipulation fires this observer. The callback iterates all mutation records, adds nodes to Sets, and runs `setTimeout` callbacks.

**Why it's a problem:**
- In a page with third-party scripts (analytics, ads, chat widgets), this observer fires continuously for mutations HellaJS doesn't care about.
- The `mutationCallbacks` loop in the observer callback runs `checkMultiSelectors()` which calls `querySelectorAll()` for every registered `$collection` selector on **every DOM mutation**.
- No other major framework uses a global MutationObserver. Solid, Vue, React, Svelte, and Angular all use scoped/component-level cleanup.

**Impact:** Silent performance degradation in complex pages. Almost impossible to profile because it's deferred via `setTimeout`.

---

### CRITICAL: DOM Element Pollution with `__hella_*` Properties

**File:** `types/nodes.ts:92-108`

Every HellaJS-managed DOM element gets up to **10 internal properties**:

```
__hella_effects
__hella_handlers
__hella_mounted
__hella_hooks
__hella_component_scope
__hella_portal_cleanup
__hella_error_config
__hella_cached_boundary
__hella_original_node
__hella_direct_handlers
```

**Why it's a problem:**
- These properties persist on real DOM elements and survive serialization attempts (`outerHTML` won't show them, but `Object.keys(element)` will).
- `element.cloneNode(true)` does **not** clone expando properties, meaning cloned HellaJS elements are broken copies with missing state.
- Third-party libraries that iterate element properties or serialize DOM trees can encounter unexpected `__hella_*` keys.
- No other modern framework stores this much state directly on real DOM elements. Solid stores reactive graph nodes separately. Vue uses component instances. React uses fiber nodes. Svelte compiles away runtime state.

---

### CRITICAL: No SSR / Hydration

Every single competitor in this comparison supports server-side rendering. HellaJS does not. This means:

- **SEO-critical apps** cannot use HellaJS (search engines see empty `<div id="app">`).
- **Performance-critical initial loads** suffer — the browser must download JS, parse it, and render the entire UI before anything is visible.
- **No progressive enhancement** — without JS, the page is blank.
- The MutationObserver-based cleanup system is fundamentally a browser-only API. There's no path to SSR without rearchitecting the cleanup system.

---

### HIGH: HTML Parser Uses Regex

**File:** `html.ts:20-22`

```ts
const TOKEN_REGEX = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g;
const ATTR_REGEX = /(error:[\w-]+|e:[\w-]+|on:[\w-]+|bind:[\w-]+|hook:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g;
```

Parsing HTML with regex is a well-known anti-pattern. This will fail on:

- Attributes with `>` in values: `bind:title={"a > b"}`
- Nested quotes: `onclick="alert('hi')"`
- Multi-line attributes
- Attributes without quotes: `<div id=app>`
- HTML comments `<!-- -->`
- DOCTYPE declarations
- CDATA sections

Solid uses a proper Babel plugin for JSX transformation. Svelte and Vue have real parsers. React's JSX is compiled by Babel. HellaJS is the only framework parsing HTML-like syntax with regex at runtime.

---

### HIGH: ForEach Reference Equality Defeats Keyed Reconciliation

**File:** `ForEach.ts:80`

```ts
!node || oldItem !== item ? (node = resolveNode(element)) : 0;
```

If the item **reference** changes (even with the same key and identical data), the DOM node is destroyed and recreated. This means common patterns break:

```js
// Every item gets re-rendered because .map() creates new references
items().map(item => ({ ...item, checked: true }))

// Filter creates new array with same item references — this works
items().filter(item => item.active)

// Sort creates same references — this works
[...items()].sort((a, b) => a.id - b.id)
```

Solid's `<For>` only re-renders when the key changes, regardless of reference equality. Vue's `v-for` with `:key` works the same way. HellaJS's approach means developers must be extremely careful about reference stability, and the keyed reconciliation's LIS optimization is wasted if items are always new references.

---

### HIGH: Lazy Component Has No Cancellation

**File:** `Lazy.ts:27-46`

The `loader()` Promise has no `AbortController` or cancellation mechanism. If the parent element is removed while loading:

1. The `.then()` callback still executes
2. `start.parentNode?.insertBefore()` silently fails (parentNode is null)
3. The loaded component's effects are registered but never cleaned up (no parent in DOM for MutationObserver to track)
4. **Memory leak** — the component's reactive graph persists indefinitely

Solid's `<Suspense>` and Vue's `<Suspense>` both handle this through their component lifecycle. React's `React.lazy` with Suspense handles unmounting during load.

---

### HIGH: Portal Re-renders All Children on Every Update

**File:** `Portal.ts:23-53`

On every reactive update, Portal removes all previous nodes and re-creates them:

```ts
// Clean previous portal content
let i = 0, len = portalNodes.length;
while (i < len) {
  const node = portalNodes[i++]!;
  node.parentNode?.removeChild(node);
}
portalNodes = [];

// Render children and collect nodes
const fragment = document.createDocumentFragment();
```

This destroys and recreates the entire portal content tree on every signal change. If a portal renders a complex component tree, every update tears down and rebuilds the entire tree. No other framework's teleport/portal works this way — Vue's `<Teleport>` and React's `createPortal()` patch in place.

---

### HIGH: Global Singletons Prevent Multi-Instance Isolation

These are all module-level global state:

- `handlerCounts` (`counts.ts`) — global Map
- `globalListeners` (`events.ts`) — global Set
- `cleanupQueue`, `mountQueue`, `mutationCallbacks` (`registry.ts`) — global Sets
- `multiSelectors` (`$collection.ts`) — global Map
- `handlingBoundaries` (`error.ts`) — global WeakSet
- `templateCache` (`html.ts`) — global WeakMap
- `handlers` (`error.ts`) — global Set of error handlers

**Why it's a problem:**
- You **cannot** run two independent HellaJS apps on the same page. They share all global state.
- Testing requires careful manual cleanup (`onError(null)`, etc.) or tests bleed state into each other.
- A bug in one "app" can affect another — error handlers are global, event delegation is global.
- Every other framework supports multi-instance: Vue's `createApp()`, React's `createRoot()`, Angular's bootstrapping, Solid's `render()`.

---

### MEDIUM: `element()` Monkey-Patches Native DOM APIs

**File:** `element.ts:60-71`

```ts
this.setAttribute = (name: string, value: string) => {
  origSetAttribute(name, value);
  this._bumpVersion();
};
this.removeAttribute = (name: string) => {
  origRemoveAttribute(name);
  this._bumpVersion();
};
```

Overriding `setAttribute`/`removeAttribute` on HTMLElement instances means:

- Any third-party code calling `setAttribute()` on a HellaJS custom element triggers reactive updates. This is a side channel for unexpected reactivity.
- `element.setAttribute.length` changes from `2` to `0` (arrow function), which could break feature-detection code.
- The `this` context in the override captures the class instance, but if `getAttribute` is called on the prototype chain, behavior is inconsistent.

---

### MEDIUM: `isHellaNode` Duck-Typing is Fragile

**File:** `internal/utils.ts:9-10`

```ts
export const isHellaNode = (hellaNode: unknown): hellaNode is HellaNode =>
  isPlainObject(hellaNode) && (hellaNode as HellaNode).tag !== undefined;
```

Any plain object with a `tag` property is treated as a HellaNode:

```js
// These are all incorrectly identified as HellaNode:
{ tag: "div" }         // intentional — correct
{ tag: "my-component" } // intentional — correct  
{ tag: null }           // passes check — tag !== undefined
{ tag: "" }             // passes check — tag !== undefined
```

If a user accidentally passes an object with a `tag` property (e.g., a tagged union, a parsed HTML entity, a GraphQL node), HellaJS will try to create a DOM element with that tag. No other data validation occurs.

---

### MEDIUM: `setTimeout(fn, 0)` Creates Non-Deterministic Cleanup Timing

**Files:** `registry.ts:199,205`, `$collection.ts:137`

Both cleanup and mount processing use `setTimeout(fn, 0)` for deferred execution. This means:

- After removing an element, its effects continue running until the next macrotask.
- Signal updates between DOM removal and `setTimeout` callback will trigger effects on detached elements.
- Tests require manual flush helpers (`flushMount()`, `queueCleanup()`).
- In edge cases, a removed element's `beforeUpdate`/`afterUpdate` hooks fire after the element is no longer in the DOM.

Solid handles cleanup synchronously via its owner context. Vue synchronously invokes `onUnmounted`. React's cleanup runs synchronously in the commit phase.

---

### MEDIUM: Template Cloning on Every `html` Invocation

**File:** `html.ts:75-179`

Every call to `html` deeply clones the cached AST via `cloneWithValues()`. For a template with 50+ nodes and many attributes, this is:

1. Recursive function call per node
2. New object allocation per node
3. New object allocation per props/bind/on/hooks/error object
4. Array allocation for children

Solid compiles JSX to direct `createElement` calls — zero cloning overhead. Svelte compiles to imperative DOM construction code. Vue's SFC compiler generates render functions. HellaJS's runtime cloning is slower than all compiled approaches, and slower than Solid's direct DOM creation.

---

### MEDIUM: No Built-in Transitions or Animations

Vue has `<Transition>` and `<TransitionGroup>`. Svelte has `transition:`, `in:`, `out:`, and `animate:` directives. Angular has `@angular/animations`. React has `react-transition-group`.

HellaJS has nothing. No FLIP animations, no enter/leave transitions, no layout animation support. For any non-trivial UI, developers must implement animations from scratch using Web Animations API or CSS transitions.

---

### LOW: Comment Marker Accumulation

ForEach, Portal, Lazy, and reactive children all insert comment markers that persist in the DOM. An app with 20 conditional sections and 10 lists accumulates 60+ permanent comment nodes. These are benign but:

- They appear in `childNodes` counts, which can break third-party code that expects specific child counts.
- They appear in browser DevTools, cluttering the DOM inspector.
- They're not removed until the parent element is removed from the DOM.

---

### Summary: What This Means

| Severity | Issue | Competitor Handling |
|---|---|---|
| CRITICAL | Global MutationObserver | Solid/Vue/Svelte: scoped cleanup |
| CRITICAL | DOM element pollution | All: separate data structures |
| CRITICAL | No SSR | All competitors support SSR |
| HIGH | Regex HTML parser | All: proper parsers/compilers |
| HIGH | ForEach ref equality | Solid/Vue: key-only comparison |
| HIGH | Lazy no cancellation | Solid/Vue/React: lifecycle-aware |
| HIGH | Portal full re-render | Vue/React: in-place patching |
| HIGH | Global singletons | All: multi-instance support |
| MEDIUM | Monkey-patched DOM | N/A (unique to HellaJS elements) |
| MEDIUM | Fragile duck-typing | All: proper type guards |
| MEDIUM | setTimeout cleanup | All: synchronous cleanup |
| MEDIUM | Template cloning overhead | All compiled: zero runtime clone |
| MEDIUM | No transitions | Vue/Svelte/Angular: built-in |
| LOW | Comment marker accumulation | Minor, cosmetic |

The three most urgent issues are **SSR support**, **the global MutationObserver scope**, and **DOM element pollution**. Together they represent the gap between a "promising library" and a "production framework."

---

## 15. Proposed Solutions

Concrete, code-level solutions for each red flag. Ordered by implementation dependency — some solutions unlock others.

---

### Solution Architecture: The Element Map

**Solves:** DOM element pollution (CRITICAL), Global singletons (HIGH), SSR path (CRITICAL), Non-deterministic cleanup (MEDIUM)

This is the keystone change. Every other solution becomes easier once element state is externalized.

**Current state:** 10 `__hella_*` properties on DOM elements + 7 module-level global Maps/Sets.

**Proposed:** A single `WeakMap<Element, ElementState>` that holds all per-element state. This is the pattern used by Solid (its reactive graph is separate from DOM), Vue (component instances), and React (fiber nodes).

```ts
// New file: lib/internal/element-map.ts

interface ElementState {
  effects: Set<() => void>;
  handlers: Record<string, EventListener>;
  directHandlers: Map<string, EventListener>;
  hooks: HookStacks;
  mounted: boolean;
  componentScope?: () => void;
  portalCleanup?: () => void;
  errorConfig?: ErrorConfig;
  originalNode?: HellaNode;
  cachedBoundary?: Element;
}

const elementMap = new WeakMap<Element, ElementState>();

export function getState(el: Element): ElementState {
  let state = elementMap.get(el);
  if (!state) {
    state = {
      effects: new Set(),
      handlers: {},
      directHandlers: new Map(),
      hooks: { beforeMount: [], afterMount: [], beforeDestroy: [], afterDestroy: [], beforeUpdate: [], afterUpdate: [] },
      mounted: false,
    };
    elementMap.set(el, state);
  }
  return state;
}

export function deleteState(el: Element): void {
  elementMap.delete(el);
}
```

**What changes:**

| Current | Proposed |
|---|---|
| `element.__hella_effects?.forEach(fn => fn())` | `getState(element).effects.forEach(fn => fn())` |
| `element.__hella_handlers?.[type]` | `getState(element).handlers[type]` |
| `element.__hella_mounted` | `getState(element).isMounted` |
| `element.__hella_hooks?.afterMount` | `getState(element).hooks.afterMount` |
| 10 properties on DOM elements | 0 properties on DOM elements |

**Benefits:**
- `element.cloneNode(true)` produces a clean clone with no stale state.
- Third-party code never sees internal properties.
- The `WeakMap` is garbage-collected when elements are removed — no manual `delete` needed.
- `JSON.stringify(element)` is clean.
- **Opens the SSR path**: on the server, `ElementState` can exist without real DOM elements (using a lightweight virtual element or stub).

**Bundle impact:** `WeakMap` lookups are O(1) amortized. Negligible overhead vs. direct property access. The `getState()` function is the only new allocation path, and it only runs once per element.

---

### Solution: Scope-Aware Cleanup Instead of Global MutationObserver

**Solves:** Global MutationObserver (CRITICAL), Global singletons (HIGH), Non-deterministic cleanup (MEDIUM)

**Dependency:** Element Map (above)

**Current flow:**

```
DOM mutation → MutationObserver (ALL mutations) → setTimeout → processCleanupQueue → traverseDescendants → clean()
```

**Proposed flow (primary — scope-based):**

```
Component unmount → scope dispose → effects cleaned → handlers removed → children cleaned recursively
```

**Proposed flow (secondary — MutationObserver as safety net only):**

```
DOM mutation → MutationObserver (only HellaJS root containers) → synchronous cleanup
```

The core already has `scope()` (`scope.ts`) which collects effects and returns a dispose function. The `component()` function (`component.ts:13`) already attaches `result.__scope = dispose`. The problem is that scope disposal only cleans effects — not handlers, hooks, or child elements.

**Implementation:**

```ts
// Enhanced component scope in component.ts
export function component(fn: ComponentFn, props: unknown): HellaNode {
  let result!: HellaNode;
  try {
    const dispose = scope(() => result = fn(props as Record<string, unknown>) as HellaNode);
    result.__scope = () => {
      dispose(); // Existing: disposes all effects in scope
      // New: also clean up the mounted element and its descendants
      const el = mountNode(result) as HellaElement;
      cleanupSubtree(el);
    };
  } catch (e) {
    dispatchError(toError(e), { phase: 'render' });
    return { tag: '$', children: [] };
  }
  return result;
}

function cleanupSubtree(root: Element) {
  traverseDescendants(root, (node) => {
    const state = elementMap.get(node);
    if (!state) return;
    runHooks(state, "beforeDestroy");
    state.componentScope?.();
    state.portalCleanup?.();
    state.effects.forEach(fn => fn());
    removeDirectHandlers(node, state);
    decrementHandlerCounts(state.handlers);
    runHooks(state, "afterDestroy");
    elementMap.delete(node);
  });
}
```

**MutationObserver becomes opt-in / scoped:**

```ts
// Instead of observing document, observe only mount targets
export function mount(node, target = "#app") {
  const mountedNode = mountNode(node) as HellaElement;
  const container = typeof target === "string" ? document.querySelector(target) : target;
  container?.replaceChildren(mountedNode);

  // Observer only this container, not the entire document
  if (!observedContainers.has(container)) {
    observedContainers.add(container);
    containerObserver.observe(container, { childList: true, subtree: true });
  }
}
```

This reduces the observer from watching the entire `document` to watching only the specific mount targets the app uses. Third-party DOM mutations outside mount targets are invisible.

**What becomes synchronous:** When a component explicitly unmounts (conditional render removes it), cleanup is synchronous via scope disposal. The MutationObserver is a safety net for edge cases like external code removing DOM nodes.

**What about `$ref` / `$collection` auto-watching?** The MutationObserver for `$ref`/`$collection` should be a separate, independent observer that only watches the document when active `$ref`/`$collection` calls exist. It should observe lazily — start when the first `$ref` is created, stop when all are disposed. This already partially exists in `$collection.ts:145-158` (`ensureMutationWatching`/`cleanupMutationWatching`), but it piggybacks on the global observer instead of being independent.

---

### Solution: Replace `setTimeout` with Synchronous Batching

**Solves:** Non-deterministic cleanup (MEDIUM)

**Dependency:** Scope-aware cleanup (above)

Once cleanup is scope-driven (synchronous), `setTimeout` is only needed for:
1. `afterMount` hooks (deferred to allow DOM to settle)
2. MutationObserver safety-net processing

For `afterMount`, replace `setTimeout` with `queueMicrotask`:

```ts
// Current
setTimeout(processMountQueue, 0);

// Proposed
queueMicrotask(processMountQueue);
```

`queueMicrotask` runs before rendering (unlike `setTimeout` which runs after), so `afterMount` hooks fire before the browser paints. This is what Vue does (`nextTick` uses microtask) and React does (`useEffect` runs after paint but `useLayoutEffect` is synchronous).

For the MutationObserver safety net, synchronous processing is fine — MutationObserver callbacks are already microtasks. The `setTimeout` indirection is unnecessary when the observer only watches mount targets.

---

### Solution: ForEach Key-Only Reconciliation

**Solves:** ForEach reference equality (HIGH)

**File:** `ForEach.ts:80`

**Current:**
```ts
!node || oldItem !== item ? (node = resolveNode(element)) : 0;
```

**Proposed — key-only comparison with dirty checking:**
```ts
// Only re-render if:
// 1. No existing node for this key (new item)
// 2. Key was in old keys but node was replaced (node !== newKeyToNode)
// NOT: reference equality on item
let node = keyToNode.get(key);
const existingNode = node;
// Resolve the template — this is cheap (just creates HellaNode, not DOM)
const resolved = isHellaNode(element) ? element : element;
if (!node) {
  // New key — must create DOM node
  node = resolveNode(resolved);
} else {
  // Same key — reuse existing DOM node
  // If the user wants to update, bind: attributes will handle it reactively
}
newKeyToNode.set(key, node);
newKeyToItem.set(key, item);
```

The key insight: HellaJS already uses `bind:` reactive bindings for attribute updates. If a list item's data changes, the `bind:` effects inside the item template already re-run. Destroying and recreating the DOM node when the item reference changes is **redundant** — the reactive bindings handle the update.

This matches Solid's `<For>` behavior: same key = same DOM node, reactive expressions inside handle updates.

**Migration concern:** If users rely on reference changes to trigger full re-creation (e.g., they don't use `bind:` and instead compute everything in the `use` callback), this breaks. Solution: add a `recreate` prop to `ForEach` for opt-in reference-equality behavior:

```tsx
<ForEach each={items} use={ItemTemplate} recreate />
```

---

### Solution: Lazy Component Cancellation

**Solves:** Lazy no cancellation (HIGH)

**File:** `Lazy.ts`

**Current:** No way to cancel the loader Promise.

**Proposed — AbortController + scope-aware cleanup:**

```ts
export function Lazy(props: LazyProps): JSX.Element {
  const fn = ((parent: Element) => {
    const start = document.createComment("lazy-start");
    const end = document.createComment("lazy-end");
    parent.appendChild(start);
    parent.appendChild(end);

    let loadingNode: Node | null = null;
    if (props.loading) {
      loadingNode = resolveNode(props.loading);
      start.parentNode?.insertBefore(loadingNode, end);
    }

    const controller = new AbortController();
    let isCancelled = false;

    // Register cleanup — runs when parent element is removed
    const state = getState(parent as HellaElement);
    state.lazyCleanup = () => {
      isCancelled = true;
      controller.abort();
    };

    props.loader()
      .then(component => {
        if (isCancelled) return; // Parent was removed
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        const resolved = isFunction(component) ? component(props.props) : component;
        const mounted = mountNode(resolved as HellaNode);
        start.parentNode?.insertBefore(mounted, end);
      })
      .catch((err) => {
        if (isCancelled) return;
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        if (props.fallback) {
          const mounted = resolveNode(props.fallback);
          start.parentNode?.insertBefore(mounted, end);
        }
      });

  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
```

The `isCancelled` flag is the minimal approach. The `AbortController` is for passing to `fetch` calls inside the loader:

```ts
Lazy({
  loader: ({ signal }) => fetch('/api/component', { signal }).then(r => r.json()),
  loading: <Spinner />,
  fallback: <Error />
})
```

This requires changing the `LazyProps.loader` signature to accept an options object with `signal`. Backward compatible — the current `() => Promise<ComponentFn>` signature still works.

---

### Solution: Portal Diffing Instead of Full Re-render

**Solves:** Portal full re-render (HIGH)

**File:** `Portal.ts`

**Current:** Remove all children, re-create all children on every update.

**Proposed — reuse ForEach-like reconciliation for portal children:**

The portal children are typically static (defined once in JSX). The reactive part is the **content** of those children, not the children themselves. So the optimization is:

1. On first render, create portal children and cache them.
2. On subsequent renders, skip recreation — the children's `bind:` effects already handle updates.
3. Only recreate if the children array length or types change.

```ts
export function Portal(props: PortalProps): JSX.Element {
  const { to, type = "append", children = [] } = props;
  const childNodes = Array.isArray(children) ? children : [children];

  const fn = ((parent: Element) => {
    const marker = document.createComment("portal") as unknown as HellaElement;
    parent.appendChild(marker);

    let portalNodes: Node[] = [];
    let isFirstRender = true;

    registry.addEffect(marker, () => {
      const target = document.querySelector(to)!;

      if (isFirstRender) {
        // First render — create nodes
        const fragment = document.createDocumentFragment();
        let i = 0;
        const len = childNodes.length;
        while (i < len) {
          const node = resolveNode(resolveValue(childNodes[i++] as HellaChild), marker);
          portalNodes.push(node);
          fragment.appendChild(node);
        }
        const methods: Record<string, keyof Element> = {
          prepend: "prepend", replace: "replaceChildren",
          before: "before", after: "after"
        };
        (target[methods[type] || "appendChild"] as Function)(fragment);
        isFirstRender = false;
        return;
      }

      // Subsequent renders — children are already mounted
      // Their bind: effects handle content updates automatically
      // Only need to handle structural changes (children added/removed)
      // For now: no-op. The reactive bindings inside children already update.
    });

    marker.__hella_portal_cleanup = () => {
      let i = 0;
      const len = portalNodes.length;
      while (i < len) portalNodes[i++]?.parentNode?.removeChild(portalNodes[i - 1]!);
      portalNodes = [];
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
```

The key insight: portal children are defined declaratively (JSX/html template). Their reactive bindings (`bind:`) update in place. The portal only needs to re-render if the children array itself changes structurally — which is rare. The `isFirstRender` flag skips the expensive remove-all + recreate-all cycle.

For truly dynamic portal content (children that change based on state), the existing full-re-render behavior can be kept as a fallback path.

---

### Solution: Multi-Instance Support via App Context

**Solves:** Global singletons (HIGH)

**Dependency:** Element Map (above)

**Current:** All state is module-level. Two `mount()` calls share everything.

**Proposed — `createApp()` factory:**

```ts
// New file: lib/app.ts

export function createApp() {
  // Per-instance state
  const elementMap = new WeakMap<Element, ElementState>();
  const handlerCounts = new Map<string, number>();
  const globalListeners = new Set<string>();
  const errorHandlers = new Set<ErrorHandler>();
  const observedContainers = new Set<Element>();

  // Per-instance MutationObserver (only for this app's mount targets)
  const observer = new MutationObserver(/* ... */);

  return {
    mount(node, target) { /* ... */ },
    onError(handler) { /* ... */ },
    unmount(target) { /* ... */ },
  };
}
```

Each `createApp()` call produces an isolated context with its own:
- Element state map
- Event delegation handlers
- Error handlers
- MutationObserver (scoped to its mount targets)

**Backward compatibility:** Keep the existing module-level `mount()` as a default singleton app:

```ts
// lib/index.ts
const defaultApp = createApp();
export const mount = defaultApp.mount;
export const onError = defaultApp.onError;
```

Users who need multi-instance use `createApp()`. Everyone else uses the existing API unchanged.

---

### Solution: HTML Parser Hardening

**Solves:** Regex HTML parser (HIGH)

**File:** `html.ts`

This is the most nuanced solution. There are three approaches, ranked by effort:

**Approach A: Fix regex edge cases (low effort, partial fix)**

Add handling for the most common failures:

```ts
// Support single-quoted attributes
const ATTR_REGEX = /(error:[\w-]+|e:[\w-]+|on:[\w-]+|bind:[\w-]+|hook:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|'([^']*?)'|(__SLOT_\d+__)))?/g;

// Support unquoted attributes
// Support multi-line by removing line breaks before parsing
const cleaned = html.replace(/\n/g, ' ');
```

This doesn't fix the fundamental problem but handles 90% of real-world cases.

**Approach B: Babel plugin path (medium effort, proper fix)**

The Babel plugin (`plugins/babel`) already transforms JSX to `HellaNode` objects. Add a parallel transform for `html` tagged templates that runs at compile time:

```ts
// In Babel plugin:
// Transform: html`<div bind:class=${cls}>${content}</div>`
// Into:      [{ tag: "div", bind: { class: cls }, children: [content] }]
```

This eliminates the regex parser at runtime — the template is compiled to a plain HellaNode object at build time. The `html` function becomes a no-op passthrough at runtime.

This is exactly how Solid handles JSX (compile-time transformation) and how Svelte handles its syntax (full compiler). The runtime `html` function remains as a fallback for no-build-step usage, but the Babel plugin produces the AST directly.

**Approach C: Adopt a proper parser (high effort, complete fix)**

Use a lightweight HTML parser like `parse5` or a custom state-machine parser. This is overkill given that Approach B eliminates the problem at compile time.

**Recommendation:** Approach B for production, Approach A as a quick fix. The `html` tagged template is a DX feature — at build time, it should be compiled away.

---

### Solution: `element()` — AttributeChangedCallback Instead of Monkey-Patching

**Solves:** Monkey-patched DOM (MEDIUM)

**File:** `element.ts:60-71`

**Current:** Override `setAttribute`/`removeAttribute` on the element instance.

**Proposed:** Use `observedAttributes` + `attributeChangedCallback` — the standard Web Component API:

```ts
class HellaElement extends HTMLElement {
  private _version = signal(0);

  // Declare which attributes to observe — standard API
  static get observedAttributes() {
    // Return all known attribute names from props
    return this._observedAttrs || [];
  }

  // Standard lifecycle — called by browser when attributes change
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal !== newVal) {
      this._version(this._version() + 1);
      flush();
    }
  }

  // No setAttribute/removeAttribute override needed
}
```

**Problem:** `observedAttributes` requires knowing attribute names upfront. HellaJS elements allow any attribute via Proxy.

**Solution:** Use a `MutationObserver` scoped to just this element (lightweight, per-element):

```ts
class HellaElement extends HTMLElement {
  private _version = signal(0);
  private _attrObserver?: MutationObserver;

  connectedCallback() {
    if (this._isInitialized) return;
    this._isInitialized = true;

    // Observe only this element's attributes
    this._attrObserver = new MutationObserver((mutations) => {
      this._version(this._version() + 1);
      flush();
    });
    this._attrObserver.observe(this, { attributes: true });

    Promise.resolve().then(() => this._mount());
  }

  disconnectedCallback() {
    this._attrObserver?.disconnect();
    this._attrObserver = undefined;
    // ... rest of cleanup
  }
}
```

This is a per-element MutationObserver that only watches attribute changes on a single element. Much lighter than observing the entire document. No monkey-patching of native APIs.

---

### Solution: Stronger `isHellaNode` Type Guard

**Solves:** Fragile duck-typing (MEDIUM)

**File:** `internal/utils.ts:9-10`

**Current:**
```ts
export const isHellaNode = (hellaNode: unknown): hellaNode is HellaNode =>
  isPlainObject(hellaNode) && (hellaNode as HellaNode).tag !== undefined;
```

**Proposed — use a Symbol brand:**

```ts
// In types/nodes.ts
export const HELLA_NODE = Symbol('hella-node');

export interface HellaNode {
  [HELLA_NODE]: true;
  tag?: HTMLTagName;
  props?: HTMLAttributes<T>;
  // ... rest unchanged
}

// In internal/utils.ts
export const isHellaNode = (val: unknown): val is HellaNode =>
  isPlainObject(val) && (val as HellaNode)[HELLA_NODE] === true;
```

Every HellaNode created by `mountNode()`, `html()`, or JSX transformation gets the `[HELLA_NODE]` Symbol. Zero chance of collision with user data or third-party libraries. The Symbol doesn't appear in `Object.keys()`, `JSON.stringify()`, or `for...in` loops.

**Bundle impact:** Negligible. Symbol lookup is O(1).

**JSX transform change:** The Babel plugin adds `[HELLA_NODE]: true` to every generated HellaNode object literal. This is a one-line change in the plugin.

---

### Solution: SSR Foundation

**Solves:** No SSR (CRITICAL)

**Dependency:** Element Map, Scope-aware cleanup, Multi-instance support

This is the largest change but becomes tractable once the dependencies are in place.

**Phase 1: Render to string**

Create a `renderToString()` function that walks a HellaNode tree and produces HTML without touching the DOM:

```ts
// New file: lib/ssr.ts

export function renderToString(node: HellaNode | (() => HellaNode)): string {
  const resolved = resolveValue(node) as HellaNode;
  return renderNode(resolved);
}

function renderNode(node: HellaNode): string {
  if (node.tag === '$') {
    return (node.children || []).map(renderChild).join('');
  }

  const attrs = renderAttrs(node.props, node.bind);
  const children = (node.children || []).map(renderChild).join('');

  // Skip reactive bindings, event handlers, hooks — those are client-only
  return `<${node.tag}${attrs}>${children}</${node.tag}>`;
}
```

This requires no DOM — it produces a string. It naturally skips `on:`, `e:`, `hook:` (server-irrelevant) and `bind:` (renders initial value).

**Phase 2: Hydration**

The client receives the server-rendered HTML and "activates" it:

```ts
export function hydrate(node: HellaNode | (() => HellaNode), target: string | Element = "#app") {
  const container = typeof target === "string" ? document.querySelector(target)! : target;
  // Walk existing DOM and attach reactive bindings without recreating elements
  hydrateNode(resolveValue(node) as HellaNode, container as HellaElement);
}

function hydrateNode(node: HellaNode, existingEl: HellaElement) {
  // Don't call document.createElement — use existing element
  // Register bind: effects, on: handlers, hook: hooks on existing element
  // Match children by position (or by key for ForEach)
  // This is the "hydration" step
}
```

The Element Map solution is critical here — hydration needs to attach state to existing DOM elements without creating new ones. The current `__hella_*` properties would "work" but the WeakMap approach is cleaner for SSR because it doesn't pollute the serialized HTML.

**Phase 3: Streaming SSR**

Once `renderToString` works, streaming is a natural extension — yield HTML chunks as components resolve. `Lazy` components produce placeholder HTML and resolve client-side.

---

### Solution: Transition API

**Solves:** No transitions (MEDIUM)

This is a lower priority but straightforward to implement given the surgical update model.

```ts
// New file: lib/transition.ts

export interface TransitionOptions {
  enter?: string;     // CSS class added on enter
  leave?: string;     // CSS class added on leave
  duration?: number;  // ms
}

export function transition(options: TransitionOptions) {
  return (element: Element) => {
    if (options.enter) {
      element.classList.add(options.enter);
      setTimeout(() => element.classList.remove(options.enter!), options.duration ?? 300);
    }
  };
}
```

Usage via `hook:afterMount`:

```tsx
<div hook:afterMount={transition({ enter: "fade-in", duration: 200 })}>
  {content}
</div>
```

For FLIP animations (layout transitions), use the Web Animations API with position snapshots:

```ts
export function flipAnimate(element: Element, applyChange: () => void) {
  const first = element.getBoundingClientRect();
  applyChange();
  const last = element.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  element.animate([
    { transform: `translate(${dx}px, ${dy}px)` },
    { transform: 'translate(0, 0)' }
  ], { duration: 200, easing: 'ease-out' });
}
```

This is a v1. A more complete solution would include `<Transition>` and `<TransitionGroup>` components similar to Vue's, but the `transition()` utility + `hook:` prefix integration covers 80% of use cases with minimal code.

---

### Solution: Template Cloning Optimization

**Solves:** Template cloning overhead (MEDIUM)

**File:** `html.ts:75-179`

**Current:** Deep-clone entire AST on every `html` call.

**Proposed — lazy cloning with structural sharing:**

Only clone the parts of the AST that contain placeholders. Static subtrees are shared between invocations:

```ts
function cloneWithValues(node: unknown, values: unknown[]): unknown {
  if (typeof node !== 'object' || node === null) return node;

  if (Object.hasOwn(node, "__placeholder"))
    return values[(node as HtmlPlaceholder).__placeholder];

  // Optimization: if this subtree has no placeholders, return the cached node directly
  if (Object.hasOwn(node, "__static")) return node;

  // ... rest of cloning logic unchanged
}
```

During parsing, mark subtrees that contain no placeholders as static:

```ts
function parseHTML(html: string, placeholders: HtmlPlaceholder[]): HtmlInternalNode[] {
  // ... existing parsing ...
  // After parsing, walk the tree and mark static subtrees
  markStaticSubtrees(result);
}

function markStaticSubtrees(nodes: HtmlInternalNode[]): void {
  // If a node has no placeholder children and no placeholder attributes,
  // mark it as __static so cloneWithValues skips it entirely
}
```

This is a compile-time optimization within the template cache. Static subtrees (like `<div class="header"><span>Title</span></div>`) are created once and shared across all invocations of the same template. Only dynamic parts are cloned.

---

### Implementation Priority

| Priority | Solution | Effort | Unlocks |
|---|---|---|---|
| 1 | Element Map (WeakMap) | Medium | SSR, Multi-instance, Cleaner API |
| 2 | Scope-aware cleanup | Medium | Eliminates global MutationObserver |
| 3 | Synchronous batching (microtask) | Low | Deterministic cleanup |
| 4 | ForEach key-only reconciliation | Low | Correct list behavior |
| 5 | Lazy cancellation | Low | No memory leaks |
| 6 | Multi-instance (createApp) | Medium | Micro-frontends, testing |
| 7 | SSR renderToString | Large | SEO, initial load perf |
| 8 | Portal diffing | Low | Perf for portal-heavy apps |
| 9 | HTML parser hardening | Medium | Correctness |
| 10 | Symbol-branded type guard | Low | Type safety |
| 11 | element() MutationObserver | Low | No monkey-patching |
| 12 | SSR hydration | Large | Full SSR support |
| 13 | Template cloning optimization | Medium | Runtime perf |
| 14 | Transition API | Medium | DX feature parity |

**Recommended first PR:** Items 1-5. They are the foundation for everything else, have clear test cases, and can be done incrementally without breaking changes.
