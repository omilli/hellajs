# Comparison Targets

The libraries each HellaJS package is compared against in its `[package]-comparison.md`. To change a target, edit this file — the skill reads from here. Do not substitute targets mid-generation without user confirmation.

The principle: pick libraries that are either (a) the dominant market leader in the category, (b) the closest architectural sibling to the HellaJS package, or (c) a notable minimal-alternative. Every target should teach the reader something the others don't.

---

## @hellajs/core

**Category:** Reactive primitives — signals, computed, effects.

**Angle:** Framework-reactivity angle. Compare HellaJS core's standalone signal primitives against the built-in reactivity models of the major frameworks. This is the same set as dom, because core's signals are best understood through the lens of "how does each framework solve reactivity?"

| Target | Why |
|---|---|
| Solid | Fine-grained signals, closest direct sibling, per-binding computations |
| Svelte 5 | Runes (signal-based reactivity), compile-time analysis |
| React 19 | VDOM + hooks, proxy-based reactivity, the dominant baseline |
| Vue 3 | Proxy-based reactivity (`ref`/`reactive`), widely understood model |
| Angular | Zone.js + signals, the heaviest runtime in the group |

---

## @hellajs/dom

**Category:** DOM rendering — surgical updates, no virtual DOM.

**Status:** Already generated at `packages/dom/dom-comparison.md`. Re-run the skill only to update.

| Target | Why |
|---|---|
| Solid | Architectural sibling, fine-grained reactive DOM, no VDOM |
| Svelte 5 | Compiled direct DOM, the compiler-first counterpoint |
| React 19 | VDOM diff & reconcile, the dominant baseline |
| Vue 3 | VDOM diff & reconcile, proxy reactivity |
| Angular | VDOM + change detection, Zone.js, the heaviest runtime |

---

## @hellajs/css

**Category:** CSS-in-JS — runtime style generation, reference counting, reactive variables.

**Angle:** Cover both the runtime camp (where HellaJS lives) and the zero-runtime / build-time camp (the industry trend). Tailwind is intentionally excluded — it is utility-first CSS, a different category; including it would muddy the CSS-in-JS comparison.

| Target | Why |
|---|---|
| Emotion | Runtime CSS-in-JS leader, most adopted in the runtime camp |
| Styled Components | The original CSS-in-JS pioneer, still hugely popular |
| vanilla-extract | Zero-runtime CSS-in-TS, build-time extraction — the counterpoint to runtime |
| Panda CSS | Modern build-time CSS-in-JS (Chakra team), token-driven |

---

## @hellajs/resource

**Category:** Reactive async data fetching — caching, deduplication, abort control, mutations.

**Angle:** Cover the dominant data-fetching libraries plus the closest signal-based sibling and a Vue composable.

| Target | Why |
|---|---|
| TanStack Query | The dominant async data-fetching library (formerly React Query) |
| SWR | Vercel's stale-while-revalidate library, the other major contender |
| RTK Query | Redux Toolkit's built-in data fetching, integrated caching |
| Solid `createResource` | Signal-based async resource — closest architectural sibling |
| VueUse `useFetch` | Vue composable for reactive data fetching, lightweight |

---

## @hellajs/router

**Category:** Client-side routing — nested routes, lifecycle hooks, parameter inheritance.

**Angle:** Deliberately excludes React Router (too React-centric, already covered implicitly via React in other comparisons). Includes the framework routers that map to the dom comparison set, plus TanStack Router for its type-safety angle and Next.js for its full-stack paradigm.

| Target | Why |
|---|---|
| TanStack Router | Modern type-safe router, first-class TS support |
| Vue Router | Vue's official router, mature and widely adopted |
| Solid Router | `@solidjs/router` — signal-based, closest architectural sibling |
| Angular Router | Angular's official router, mature enterprise-grade routing |
| Next.js Router | App Router — full-stack framework routing, different paradigm |

---

## @hellajs/store

**Category:** Deeply reactive state management — granular signal conversion, snapshots, updates.

**Angle:** Cover the full spectrum of state management paradigms: hook-based, immutable, atomic, proxy-based, and deeply observable. MobX and Valtio are the closest architectural siblings (reactive/deep).

| Target | Why |
|---|---|
| Zustand | Popular hook-based state, minimal API |
| Redux Toolkit | Most adopted state management, immutable updates |
| Jotai | Atomic state management, composable primitives |
| Valtio | Proxy-based reactive state — closest architectural sibling |
| MobX | Deeply observable reactive state — most paradigm-similar |

---

## @hellajs/ssr

**Category:** SSR stringifier + hydration contract — HellaNode AST → HTML string with region markers.

**Angle:** Compare HellaJS ssr (the stringifier half of each framework's SSR) against the SSR renderers of the same framework cohort as dom, since each competitor's stringifier + hydration-marker model is the direct comparison surface. The marker decision (Vue-style `<!--[-->…<!--]-->`, verified from `vuejs/core` source) is the load-bearing differentiator to document.

| Target | Why |
|---|---|
| Solid `renderToString` | Architectural sibling — fine-grained reactive, zero-runtime SSR; attribute-based hydration keys (`data-hk`) + `<!--!$-->` separators (verified 1.9.x; the older `<!--#-->`/`<!--/-->` pair is no longer emitted) |
| Svelte 5 SSR | Compiled-to-string, the compiler-first counterpoint |
| React `renderToString` / `renderToPipeableStream` | The dominant baseline; `<!-- -->` text separators + `<!--$--><!--/$-->` segment markers |
| Vue 3 `renderToString` | Marker source verified this session (`<!--[-->`/`<!--]-->`); the format HellaJS adopted |
