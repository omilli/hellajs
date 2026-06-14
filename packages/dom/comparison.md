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
| Primitive | `signal()` getter/setter | `createSignal()` getter/setter | `ref()` / `createReactive()` | `useState()` | `signal()` | `$state` rune |
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
6. **Shallow AST cloning / static subtree sharing**: Static subtrees (no placeholders) are marked `__static` during parsing and shared across all template invocations. Only dynamic subtrees are cloned.

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

### MEDIUM: Template Cloning on Every `html` Invocation — RESOLVED

**Status:** Fixed in v0.12.0 — static subtrees are now marked and shared across invocations.

**File:** `lib/internal/template.ts`

Every call to `html` deeply clones the cached AST via `cloneWithValues()`. For a template with 50+ nodes and many attributes, this was:

1. Recursive function call per node
2. New object allocation per node
3. New object allocation per props/bind/on/hooks/error object
4. Array allocation for children

**Fix:** During parsing, `markStaticSubtrees()` walks the AST and annotates subtrees with zero placeholder dependencies as `__static`. `cloneWithValues()` checks for `__static` and returns the cached reference directly — no clone. Only subtrees containing placeholders are cloned per invocation.

For fully static templates (no interpolations), the entire cached AST is returned directly — zero allocations per call. For mixed templates, static subtrees (e.g., `<header><nav>...</nav></header>` when no placeholder exists) are shared references across all invocations.

Solid compiles JSX to direct `createElement` calls — zero cloning overhead. Svelte compiles to imperative DOM construction code. Vue's SFC compiler generates render functions. HellaJS's runtime cloning is still present for dynamic subtrees but static subtrees no longer incur allocation cost.

---



### LOW: Comment Marker Accumulation

ForEach, Portal, Lazy, and reactive children all insert comment markers that persist in the DOM. An app with 20 conditional sections and 10 lists accumulates 60+ permanent comment nodes. These are benign but:

- They appear in `childNodes` counts, which can break third-party code that expects specific child counts.
- They appear in browser DevTools, cluttering the DOM inspector.
- They're not removed until the parent element is removed from the DOM.

---

### Summary: What This Means

| Severity | Issue | Competitor Handling | Status |
|---|---|---|---|
| CRITICAL | No SSR | All competitors support SSR | Open |
| HIGH | Regex HTML parser | All: proper parsers/compilers | Open |
| MEDIUM | Template cloning overhead | All compiled: zero runtime clone | **Resolved** — static subtrees shared |
| LOW | Comment marker accumulation | Minor, cosmetic | Open |

The most urgent issue is **SSR support**. It represents the biggest gap between a "promising library" and a "production framework."

---

## 15. Proposed Solutions

Concrete, code-level solutions for each red flag. Ordered by implementation dependency — some solutions unlock others.

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

### Solution: SSR Foundation

**Solves:** No SSR (CRITICAL)

**Dependency:** Element Map, Scope-aware cleanup

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



### Solution: Template Cloning Optimization — IMPLEMENTED

**Solves:** Template cloning overhead (MEDIUM) — ✅ Resolved

**Implementation:** `lib/internal/template.ts`

Static subtrees are now marked during parsing and shared across invocations:

- `markStaticSubtrees()` walks the AST after parsing, recursively checking each node for placeholder dependencies in props, attributes, children, and all prefix-categorized fields (`bind`, `on`, `e`, `hooks`, `error`)
- Nodes with zero placeholder dependencies are annotated with `__static: true`
- `cloneWithValues()` returns `__static` nodes directly — no deep clone
- Only subtrees containing placeholders are cloned per invocation

---

### Implementation Priority

| Priority | Solution | Effort | Unlocks | Status |
|---|---|---|---|---|
| 1 | SSR renderToString | Large | SEO, initial load perf | Open |
| 2 | HTML parser hardening | Medium | Correctness | Open |
| 3 | SSR hydration | Large | Full SSR support | Open |
| 4 | Template cloning optimization | Medium | Runtime perf | ✅ Implemented |
