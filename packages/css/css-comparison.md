# HellaJS @hellajs/css vs. Emotion / Styled Components / vanilla-extract / Panda CSS

A ground-up comparison based on the actual source code of `@hellajs/css` v3. Every claim below was verified against `packages/css/lib/` (including `lib/internal/`). Competitor versions researched this session: Emotion 11.14 (`@emotion/css` 11.13.5, `@emotion/react` 11.14.0, `@emotion/styled` 11.14.1), styled-components 6.5.3, vanilla-extract 1.21.2, Panda CSS 1.12.0 — facts sourced from each project's official docs and npm registry manifests.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS css | Emotion | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|
| Styling approach | Runtime, object-only, surgical CSSOM | Runtime, string + object (stylis) | Runtime, tagged templates (stylis) | Build-time extraction, zero runtime | Build-time codegen, near-zero runtime |
| Class names | Content-hashed (`style()` → `h-{label}-{hash}`), or global via `css()` | Auto-hashed (`css-…`) | Unique generated per component | Hashed local scopes | Atomic utilities + recipes, `@layer` |
| Global by default | Yes — unnamed call, returns `""` | Separate `<Global>` API | Separate `createGlobalStyle` | Separate `globalStyle` | Utilities/recipes model |
| Reactive CSS vars | First-class — `vars()` + signals | Theme context / props | Theme / props | `createTheme` (build-time, static) | Tokens (build-time, static) |
| Memory model | Reference counting, DOM removal at zero | Inject-and-cache | Inject-and-cache (rendered components only) | N/A — static CSS artifact | N/A — static CSS artifact |
| SSR | Class/empty-string/proxy returns on both platforms + `cssText()` collector | Zero-config (`@emotion/react`), manual (`@emotion/css`) | Via plugin, extract to HTML | Bundler CSS artifact | Static CSS artifact |
| Type safety | `csstype` + recursive `CSSVars<T>` | Object styles typed; templates unvalidated | Generic props; templates unvalidated | Full TS (`.css.ts` authoring) | Full TS via codegen + token autocomplete |
| Runtime deps | 1 (`csstype` — types-only) | 8 (`@emotion/react`) | 4 (`stylis`, …) | 11 (build-only) | 11 (build-only) |
| Framework coupling | None | React-primary; `@emotion/css` agnostic | React + React DOM peers | None (bundler-coupled) | None |

HellaJS sits in the runtime camp alongside Emotion and Styled Components, but with three structural choices neither of them makes: it separates global styles (`css()`) from content-hashed scoped styles (`style()`, no wrapper API), it reference-counts every rule and variable and removes them from the DOM at zero refs, and it wires signal reactivity directly into CSS custom-property generation. Against vanilla-extract and Panda it trades the zero-runtime property for a no-build, no-bundler authoring model with live reactivity.

---

## 2. Style Generation Strategy

### HellaJS

HellaJS generates styles with no CSS parser and no template-literal preprocessing — a plain-object walk produces CSS text, and the text drives surgical CSSOM insertion. The mechanism:

- `css()` walks a plain JavaScript object in one pass — `process()` accumulates property strings and recurses into nested selectors in a single `while` loop (`lib/css.ts`). CamelCase keys convert via one regex replace, `--`-prefixed keys pass through verbatim, `content` strings auto-quote unless quoted, array values join with `", "`, and `null`/`undefined` values drop out entirely (`lib/css.ts`).
- Nesting is two-rule: a key starting with `&` substitutes the parent selector at every occurrence (`&&:hover` → `.btn.btn:hover`), any other nested key composes as a descendant (`{selector} {key}`); at top level in a global call the key is a raw, unwrapped selector (`lib/css.ts`).
- At-rules split by category (`CONDITIONAL_AT_RULES` in `lib/css.ts`): conditional rules (`@media`, `@container`, `@supports`, `@starting-style`) inherit the active selector — under a scope, their bodies re-scope to that class — while a selector-less conditional body containing direct declarations throws instead of emitting a block the browser would drop; definitional rules (`@keyframes`, `@font-face`, `@layer`, `@import`, …) always process with an empty selector so they never nest under a class (`lib/css.ts`).
- The produced CSS text splits into top-level rules at brace-depth boundaries, and each rule is inserted individually through `upsertRule` — `CSSStyleSheet.insertRule`/`deleteRule` against `el.sheet`, with an `indexMap` keyed `id:key` that early-returns when the existing rule's `cssText` is unchanged (`lib/css.ts`, `lib/internal/sheet.ts`). The CSSOM is the only write path: there is no `textContent` mirror and no full-sheet rewrite on update (`lib/internal/sheet.ts`).
- CSS text is the identity: `injectedMap` maps `cssText → { count, ruleCount }`, giving O(1) dedup for repeat calls (`lib/internal/injection.ts`). Registration runs on both platforms; only the sheet write is DOM-gated — the server path registers the same state and returns the same value as the client (`""` from `css()`, the hashed class from `style()`), with `cssText()` collecting what would have been injected (`lib/internal/injection.ts`, `lib/style.ts`, `lib/cssText.ts`).

### Emotion

Emotion is a runtime library accepting both tagged-template strings and object styles, compiled at runtime by `stylis` (a dependency of `@emotion/cache`, which every entry pulls in) for nesting, vendor prefixing, and minification. Three entries share the core: `@emotion/css` (framework-agnostic `css`/`cx`, hashed class names, no setup required, SSR "requires additional work"), `@emotion/react` (`css` prop, theme context, zero-config SSR, theming out of the box), and `@emotion/styled` (the `styled.div`…`` factory). Heavy caching amortizes the stylis parse cost, and an optional Babel plugin adds source maps and labels (per emotion.sh docs).

### Styled Components

Styled Components is built on tagged template literals and the React component model — each `styled.tagname`…`` call returns a React component. It tracks which components are rendered and injects only their styles ("automatic critical CSS"), generates unique class names per component, and adapts styles via props or theme without manual class juggling. Vendor prefixing is opt-in through `StyleSheetManager` (legacy browser support on demand), and a Babel or SWC plugin is recommended for legible class names, smaller output, and SSR extraction (per styled-components.com docs, researched at 6.5.3; a v7 alpha is published alongside).

### vanilla-extract

vanilla-extract is a zero-runtime system: styles are authored in `.css.ts` files, and a bundler integration (official plugins for webpack, esbuild, Vite, and Next.js) executes those files at build time, emitting a static stylesheet. `style({ … })` returns a locally-scoped class name; `createTheme` returns a `[themeClass, vars]` pair backed by type-safe token contracts. The browser ships zero styling JS — only resolved class-name strings (per vanilla-extract.style).

### Panda CSS

Panda CSS runs a codegen pipeline: the CLI AST-scans source files and emits a `styled-system/` directory containing static CSS (cascade layers via `@layer`, CSS variables, atomic utility classes — the Tailwind-inspired JIT strategy) plus small TypeScript helpers. `css({ fontSize: 'lg' })` resolves against the generated class map at runtime; recipes and variants (Stitches-inspired) encode multi-variant components, and design tokens support simultaneous themes. The bulk of styling work is the static artifact; the runtime is class-string resolution (per the Panda README and docs, researched at 1.12.0).

**Verdict:** HellaJS, Emotion, and Styled Components share the runtime camp; vanilla-extract and Panda are the build-time counterpoint. HellaJS is the only runtime library in this group that ships no CSS preprocessor — no stylis, no `css-what`, no template parsing — a plain object walk talks to the CSSOM directly, which also means its runtime dependency footprint is one types-only package. The trade is that it accepts object styles only: no template literals, and no runtime vendor prefixing (modern browsers handle the unprefixed properties it emits).

---

## 3. Dependencies

Bundle/byte-size numbers are intentionally excluded — they are point-in-time and drift faster than any other claim in this doc. Dependency facts come from each package's `package.json` (npm registry manifests fetched this session).

| | HellaJS (css) | Emotion (`@emotion/react`) | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|
| Runtime deps | 1 — `csstype` | 8 — `@emotion/*`, `@babel/runtime`, `hoist-non-react-statics`, … | 4 — `stylis`, `csstype`, `css-to-react-native`, `@emotion/is-prop-valid` | 11 — `@emotion/hash`, `css-what`, `lru-cache`, `media-query-parser`, … | 11 — `cac`, `@clack/prompts`, 8× `@pandacss/*` |
| Peer deps | `@hellajs/core` | `react` ≥ 16.8 | `react`, `react-dom` | none | none |

- `@hellajs/css` declares exactly one runtime dependency, `csstype`, and consumes it exclusively through `import type` (`lib/types.d.ts`) — the package's own published files are declaration-only (`"main": ""`), so nothing beyond type information ships to the browser. The reactivity it needs arrives through a single peer, `@hellajs/core`, which the application already carries when it renders.
- The package exposes per-function subpath exports over `lib/` (`./css`, `./style`, `./cva`, `./cx`, `./vars`, `./keyframes`, `./cssText`, their remove/reset pairs, and a pre-bundled `./bundle`) so consumers tree-shake to just the modules they call (`package.json`).
- Emotion's framework-agnostic entry, `@emotion/css`, is the closest dependency shape to HellaJS (5 deps, no peers), but every entry pays for `stylis` compilation at runtime — and, curiously, carries `@emotion/babel-plugin` as a regular runtime dependency. Styled Components bundles `stylis` in the browser plus React/React DOM peers.
- vanilla-extract's and Panda's eleven dependencies apiece run only inside the bundler/CLI — the browser cost is the static CSS artifact itself. That is the zero-runtime trade: tooling complexity moves to the build, and dynamic styling needs a separate mechanism at runtime.

---

## 4. Scoping Model

HellaJS inverts the default of every competitor here. `css(obj)` with no options is a **global** call: the selector is the empty string, top-level keys are raw CSS selectors (`body`, `*`, `.card`, `nav a`, `@media (…)`), rules inject unwrapped, and the return value is `""` on both platforms (`lib/css.ts`). Scoping lives in `style(obj, { label })`: the declarations hash into a `h-{label}-{hash}` class (`h-{hash}` unlabeled), nested keys compose against it (`.h-card-… .child`, `.h-card-… span`), `&` substitutes it, conditional at-rules inherit it, and the function returns the class for `class` attributes (`lib/style.ts`, `lib/internal/identity.ts`). `cva()` layers typed variants over the same mechanism — each variant selection derives its own hashed class on first resolution (`lib/cva.ts`).

The class name is **content-hashed with a readable label** — `style(obj, { label: 'card' })` produces `.h-card-r4k2q`, legible in DevTools and deterministic across rebuilds, platforms, and renders (the hash covers the object alone; the label never participates, so the same object under two labels yields two classes with identical rule bodies — documented, not deduped, `lib/internal/identity.ts`). Collisions are impossible by construction — two different objects can never derive the same class — so there is no namespace-hygiene burden and no collision detection to need. The split makes the two authoring modes explicit: resets, `@font-face`, and `@layer` go through global `css()` calls (definitional at-rules never pick up a scope, `lib/css.ts`), component styles go through `style()`, and `keyframes()` gives animation definitions their own hashed `h-kf-{hash}` names (`lib/keyframes.ts`).

`vars()` scopes independently of `css()`: variables default to `:root`, and `scoped: '.card'` / `prefix: 'app'` / `media: '(prefers-color-scheme: dark)'` resolve through a single options-resolution point (`resolveVarsOptions` in `lib/internal/vars.ts`). Multiple `vars()` calls targeting one scope+media bucket accumulate into a merged rule rather than overwriting each other (`scopedVarsRulesMap`, `lib/internal/vars.ts`); the same scope under different media conditions coexists as separate rules.

`style()`, `css()`, and `vars()` also accept `host` — a per-call insertion point (most commonly a `ShadowRoot`) that redirects the generated `<style>` elements into that node instead of `document.head` (`lib/internal/sheet.ts`). Every registry keyed by text or scope is host-qualified, so the same styles in two hosts inject into both with independent reference counting, and N web component instances get N independent sheets with no module-global configuration. Emotion and Styled Components can reach a shadow root only through render-layer configuration (an Emotion cache `insertionPoint`, a Styled Components `StyleSheetManager target`); vanilla-extract and Panda, as build-time systems, emit static files and have no runtime insertion story at all.

Emotion and Styled Components hash every class and route globals through a dedicated API (`<Global>`, `createGlobalStyle`). vanilla-extract hashes locally-scoped identifiers and exposes globals via `globalStyle`; `createTheme` scopes variables under a generated theme class. Panda emits atomic utilities and recipe classes under `@layer`, keyed by token paths rather than author-chosen names. None of the four lets the author request a readable class segment the way a `style()` label does, and none makes global styles the no-ceremony default — HellaJS's model is the closest of the group to writing plain CSS by hand.

**Verdict:** For teams that want stylesheet output they can read and debug without source maps, labeled hashed classes deliver both halves at once — a readable `h-card-…` segment in DevTools and hash-guaranteed uniqueness with no collision surface to manage.

---

## 5. Reactive Variables

This is HellaJS's clearest differentiator. `vars(vars)` takes a nested object — leaves may be plain values or functions (signals, computeds, plain getters) — and produces two things in one call: `--var-name` custom properties written to the `hella-vars` style element, and a same-shaped result object whose leaves are pre-built `var(--var-name)` references for use inside `css()` / `style()` calls (`lib/vars.ts`).

A single-pass flattener, `flattenVars`, dot-joins nested keys, calls each function leaf a single time to resolve its initial value, and sets a `hasFns` flag from the same traversal — the static/reactive routing decision costs no extra walk (`lib/vars.ts`):

- **Static path** (no functions): the input is hashed — DJB2 over a recursively key-sorted stringification, so key order can't split the cache (`lib/internal/shared.ts`) — and checked against an LRU cache capped at 100 entries (`lib/internal/vars.ts`). Hits promote the entry (delete + re-set) and bump the registry refCount; misses apply rules, build the result, and evict the oldest key at capacity (`lib/vars.ts`).
- **Reactive path** (any function leaf): rules and result are built synchronously so the returned object is populated immediately, then one effect per vars-object **reference** re-flattens the live object and re-applies on dependency change (`lib/vars.ts`, `lib/internal/reactive.ts`). The result object never mutates after that: `buildResult` emits `var()` strings from the flat keys only, and live values reach the stylesheet exclusively through `applyRules` writing into the scope map (`lib/vars.ts`).

Dots fold to hyphens on both paths (`colors.primary` → `--colors-primary`, `DOT_REGEX` in `lib/internal/vars.ts`). On the server, `vars()` returns the same proxy and registers the initial-value declarations state-only — zero effects, function leaves resolved once — with `cssText()` carrying the rule text (`lib/vars.ts`, `lib/cssText.ts`).

No competitor wires signal reactivity into CSS variable generation. Emotion and Styled Components handle dynamic values through theme context and props — the style function re-runs on render or prop change, and the consumer re-renders to see it. vanilla-extract's `createTheme` and `createVar` produce variables at build time; runtime updates require hand-written `var(--…)` consumption plus a separate mutation mechanism. Panda's tokens are build-time artifacts. HellaJS is the only one of the five where "give me an object of signals, I'll keep a CSS custom property in sync with each one" is a single API call, updating through the same batch/flush scheduling the rest of the application uses.

**Verdict:** For signal-driven theming, HellaJS is the only library here that treats CSS custom properties as a reactive primitive rather than a manual wiring exercise.

---

## 6. Memory Management

HellaJS is the only library in this comparison with explicit, symmetrical reference counting on both style rules and CSS variables. Every `css()` / `style()` / `keyframes()` call — including dedup hits — increments a per-text `count` (`lib/css.ts`, `lib/style.ts`, `lib/keyframes.ts`, `lib/internal/injection.ts`). `removeCss(obj, options)` re-derives the CSS text through the same deterministic `process()` transform, decrements, and only at zero removes each CSSOM rule by its recorded key — rebasing every stored index above each deleted rule so interleaved removals of multi-rule styles stay surgical — before dropping the entry (`lib/removeCss.ts`, `lib/internal/sheet.ts`). `removeStyle()` mirrors it through the shared `resolveStyle` derivation (decrementing registration state on both platforms — server collection stays exact, `lib/removeStyle.ts`), and `removeKeyframes()` re-derives the hashed name the same way (`lib/removeKeyframes.ts`). A structurally equal object locates the entry; the same reference is not required. `removeCss()` and `removeVars()` are client-only (no-ops without a DOM); `removeStyle()` and `removeKeyframes()` decrement on both platforms.

`vars()` mirrors this with two registries — `varsRegistryStatic` (a `Map` keyed by hash) and `varsRegistryReactive` (a `WeakMap` keyed by the original object reference, so reactive entries GC with their owners) (`lib/internal/vars.ts`). `removeVars()` checks the reactive registry first, then static (`lib/removeVars.ts`). At zero, a reactive entry disposes its effect — subsequent signal writes stop touching the stylesheet — and `removeFromScope` deletes only that call's flat keys from the shared scope map, re-emitting the merged rule for surviving contributors or removing the scope rule entirely when the scope empties (`lib/internal/vars.ts`). One subtlety the code handles explicitly: an LRU eviction drops the cache entry but not the registry entry, so a re-registration joins the surviving refCount instead of resetting it (`lib/vars.ts`).

Bulk disposal is split along the same seam: `resetCss()` clears the css-side registration state on both platforms (the sheet reset is DOM-only) and `resetVars()` disposes every registered effect, clears the vars maps, resets the `hella-vars` sheet, and swaps in fresh WeakMaps (they cannot be enumerated) (`lib/resetCss.ts`, `lib/resetVars.ts`, `lib/internal/reactive.ts`). Two separate style elements — `hella-css` and `hella-vars`, each lazily created — keep the two systems independently clearable (`lib/internal/injection.ts`, `lib/internal/vars.ts`).

Emotion and Styled Components inject and cache; neither documents a removal API, and Styled Components' rendered-component tracking governs injection, not disposal. vanilla-extract and Panda have no runtime memory question at all — the static artifact is the memory model. HellaJS's approach costs the caller one `removeCss()`/`removeVars()` per `css()`/`vars()` call (or a bulk reset) and returns deterministic DOM cleanup that the runtime competitors do not offer. One honest limitation: rules a platform refuses to parse (an `insertRule` throw for e.g. `@layer` under some DOM implementations) are skipped with a warning — the rule is absent from the stylesheet, and a `console.warn` names the dropped rule text (`lib/internal/sheet.ts`).

**Verdict:** Style injection as a resource with a caller-controlled lifecycle is unique here; it is the feature that makes hot-reload-safe and island-style usage cheap, and it has no counterparty in either camp.

---

## 7. Type Safety

HellaJS uses `csstype` for full CSS property coverage (`lib/types.d.ts`). `CSSObject` intersects a selector-keyed map (tag names, at-rules, pseudo-classes, arbitrary strings) with `CSS.Properties` keyed values allowing primitives and arrays (`lib/types.d.ts`). `CSSVarLeaf` restricts variable leaves to `string | number | (() => string | number)` — `boolean` and `Date` values are compile-time rejections, and `CSSVars<T>` is a recursive conditional type that preserves the input's nesting while widening every leaf to `string`, so `vars({ colors: { primary: '…' } })` returns `{ colors: { primary: string } }` carrying `'var(--colors-primary)'` at runtime (`lib/types.d.ts`).

Emotion types object styles through `@emotion/serialize` and theme generics; template-literal CSS is not property-validated. Styled Components types the component's props (`styled.button<{ $primary?: boolean }>`) but does not validate CSS inside templates. vanilla-extract is TypeScript-first end to end — `.css.ts` authoring with token-contract checking against `createTheme`. Panda generates type definitions from the token config, giving autocomplete on token paths (`color: 'red.400'`).

HellaJS matches the build-time pair on compile-time CSS property validation with zero codegen, and out-types the runtime pair. Its gaps are honest: `CSSVarLeaf` cannot distinguish a signal from a plain getter — any function leaf takes the reactive path and creates an effect even when it closes over no signals (`lib/vars.ts`) — and `css()` itself evaluates eagerly, so a function passed as a property value throws rather than stringifies (reactive values must travel through `vars()`, `lib/css.ts`).

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Emotion | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|
| Object styles | Yes (`lib/css.ts`) | Yes | Via `css` helper | Yes (`style()`) | Yes (`css()`) |
| Template-literal styles | No | Yes | Yes | No | No |
| Nested selectors (`&`) | Yes (`lib/css.ts`) | Yes (stylis) | Yes (stylis) | Yes (`selectors: { '&…' }`) | Yes |
| `@media` / `@keyframes` / `@font-face` / `@container` / `@supports` / `@layer` | Yes, all — conditional-vs-definitional scoping rules in `css()` plus a hashed `keyframes()` primitive (`lib/css.ts`, `lib/keyframes.ts`) | Yes | Yes | Yes (`keyframes`, `fontFace`, `layer`, `@container`) | Yes (`@layer`-native) |
| Signal-reactive CSS variables | Yes (`lib/vars.ts`) | Manual (theme/props) | Manual (theme/props) | Static only (`createTheme`) | Static only (tokens) |
| Reference counting + DOM cleanup | Yes, rules, keyframes, and vars (`lib/removeCss.ts`, `lib/removeKeyframes.ts`, `lib/removeVars.ts`) | No | No | N/A (build-time) | N/A (build-time) |
| Global styles as default mode | Yes (`lib/css.ts`) | Separate `<Global>` | Separate `createGlobalStyle` | Separate `globalStyle` | Utilities/recipes |
| Shadow DOM / custom insertion point | Yes — per-call `host` on `css()` / `style()` / `vars()` (`lib/internal/sheet.ts`) | Via cache `insertionPoint` | Via `StyleSheetManager target` | No | No |
| Readable class names | Labels on hashed classes — `h-card-…` (`lib/internal/identity.ts`) | No (hashed) | No (unique generated) | No (hashed) | No (atomic/token-keyed) |
| Scoped CSS-variable scopes | `:root` default, any selector, prefix (`lib/internal/vars.ts`) | Manual | Manual | `createTheme` class | Token scopes |
| Bounded cache (LRU eviction) | Yes, 100 entries (`lib/internal/vars.ts`) | Unbounded cache | Unbounded cache | N/A | N/A |
| Deterministic identity | Sorted-key hash + text identity (`lib/internal/shared.ts`, `lib/internal/injection.ts`) | `@emotion/hash` | Content-based | Build-time dedup | Build-time dedup |
| SSR without DOM | Yes — class/empty-string/proxy returns + `cssText()` collector (`lib/style.ts`, `lib/keyframes.ts`, `lib/vars.ts`, `lib/cssText.ts`) | Yes (React), manual (`@emotion/css`) | Yes (with plugin) | N/A (static) | N/A (static) |
| Theming primitive | `vars()` (reactive) | `ThemeProvider` context | `ThemeProvider` context | `createTheme` contracts | Tokens + semantic tokens |
| Vendor prefixing | No | Yes (stylis) | Opt-in via `StyleSheetManager` | Post-build pipeline | Post-build pipeline |
| Source maps | No | Yes (Babel plugin) | Yes (plugin) | N/A (static) | N/A (static) |
| Works without framework or bundler | Yes | `@emotion/css` only | No | No | No |

### Notable HellaJS differentiators

- **Signal-driven reactive CSS custom properties** — `flattenVars` detects function leaves in the same pass that resolves initial values, and one effect per object reference rewrites the declarations on signal change (`lib/vars.ts`, `lib/internal/reactive.ts`).
- **Symmetrical reference counting with DOM cleanup at zero** — `removeCss()`/`removeStyle()`/`removeKeyframes()` re-derive text deterministically; `removeVars()` disposes effects and removes only the caller's keys from shared scopes (`lib/removeCss.ts`, `lib/removeStyle.ts`, `lib/removeKeyframes.ts`, `lib/removeVars.ts`, `lib/internal/vars.ts`).
- **Unified registration, platform-independent returns** — `css()`/`style()`/`keyframes()`/`vars()` register rule text on both platforms (sheet writes are the only DOM-gated step) and return `""`/the class name/the animation name/the `var()` proxy everywhere; `cssText()` peeks the registration for the server's `<style>` (`lib/style.ts`, `lib/keyframes.ts`, `lib/vars.ts`, `lib/cssText.ts`).
- **Content-hashed scoped classes** — `style(obj, { label })` derives `h-{label}-{hash}` from the object alone: deterministic across platforms and renders, no collisions by construction (`lib/internal/identity.ts`, `lib/style.ts`).
- **Hashed keyframes — no hand-authored animation names** — `keyframes(obj)` derives `h-kf-{hash}` from the canonicalized step definitions: collision-free by construction, one rule per distinct animation regardless of key order, and the same name on client and server for `animation` shorthands (`lib/keyframes.ts`).
- **Runtime-lazy variant recipes** — `cva()` resolves typed variant props, per-recipe responsive `media`, and compounds to composed class strings, generating each selection's class on first resolution so uncalled variants ship no CSS (`lib/cva.ts`, `lib/internal/identity.ts`).
- **Surgical CSSOM writes with no preprocessor** — `upsertRule` inserts per-rule via `insertRule` and skips no-op writes via an index map; the package parses no CSS strings at runtime (`lib/internal/sheet.ts`, `lib/css.ts`).
- **LRU-bounded static-var cache with refCount-preserving eviction** — 100-entry cap, access-order promotion, and registry entries that survive cache eviction so re-registration joins outstanding counts (`lib/internal/vars.ts`, `lib/vars.ts`).

---

## 9. Ergonomics & Syntax

```tsx
import { signal } from '@hellajs/core';
import { css, vars, keyframes, style } from '@hellajs/css';

const dark = signal(false);

// Global styles — raw selector keys, returns ""
css({
  body: { margin: 0 },
});

// Hashed keyframes — collision-free animation name
const spin = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

// Reactive CSS variables — one function leaf makes the set live
const theme = vars({
  colors: { background: () => dark() ? '#1a1a1a' : '#ffffff' },
});
// theme.colors.background === 'var(--colors-background)'

// Scoped styles — content-hashed class, identical on client and server
const card = style({
  animation: `${spin} 1s linear infinite`,
  background: theme.colors.background,
  borderRadius: '0.5rem',
  '&:hover': { opacity: 0.8 },
}, { label: 'card' });
// card === "h-card-…"

dark(true);  // hella-vars rule rewrites to #1a1a1a when the effect flushes
```

The API is thirteen functions — `css`, `style`, `cva`, `cx`, `vars`, `keyframes`, `cssText`, and their remove/reset pairs — returning strings and plain objects. `cva()` adds a variant layer on top of the class-string core: typed variant props, per-recipe responsive `media`, and `compoundVariants`, with each selection's class generated lazily on first resolution so only resolved variants ever produce CSS (`lib/cva.ts`); `cx()` is the clsx-compatible joiner (`lib/cx.ts`). Emotion and Styled Components center on `styled.tagname`…`` factories that return React components: dynamic values arrive through props, and the styling is coupled to the component model. HellaJS returns class names, animation names, and `var()` strings, so the same output drops into JSX, tagged templates, raw DOM manipulation, or any string-based markup, with reactivity attached at the variable layer rather than the component layer. vanilla-extract and Panda also return class strings, but the authoring contract is a `.css.ts` file or a generated `styled-system/` directory plus a configured bundler; HellaJS's contract is a function call at module scope with no configuration file, no plugin, and no framework — the closest of the five to inline styling ergonomics with real CSS power.

---

## Bottom Line

Architecturally, HellaJS css is a runtime CSS-in-JS library in the Emotion / Styled Components family, built on three choices neither runtime competitor makes: global-by-default injection with labeled content-hashed classes, reference-counted cleanup of both rules and variables, and a dedicated reactive-variable primitive that drives CSS custom properties from signals. Against vanilla-extract and Panda it concedes the zero-runtime property and keeps what they cannot have — live reactivity and a no-build authoring model in a package whose only runtime dependency is types.

What sets HellaJS apart — and no single competitor matches all of:

1. **Signal-reactive CSS variables as a first-class primitive** — `vars()` flattens nested objects, detects functions in one pass, and creates effects that rewrite custom properties on dependency change, batch-scheduled with the rest of the app (`lib/vars.ts`).
2. **Reference-counted DOM cleanup on both sides** — rules and vars track per-call counts and remove themselves from the stylesheet at zero, with partial-removal semantics on shared variable scopes (`lib/removeCss.ts`, `lib/removeVars.ts`, `lib/internal/vars.ts`).
3. **Global-by-default with labeled hashed classes and no build step** — `css()` makes globals the no-ceremony default, `style(obj, { label: 'btn' })` produces the readable, collision-free `h-btn-…` class, and there is no bundler, plugin, or codegen to configure (`lib/css.ts`, `lib/internal/identity.ts`).
4. **No CSS preprocessor in the runtime** — a single object walk produces text and talks to the CSSOM directly; the only runtime dependency is `csstype`, which is types-only (`lib/css.ts`, `lib/types.d.ts`).
5. **Unified server path** — registration runs identically without a DOM; `cssText()` exposes the generated CSS for SSR as one collector call rather than a pipeline (`lib/cssText.ts`, `lib/vars.ts`).

Its gaps are the predictable ones: no zero-runtime or build-time mode, object styles only (no template literals), no vendor prefixing, no source maps, and no `styled()` component factory — the consumer wires `class` attributes themselves. There is no structured design-token layer (Panda-style semantic tokens or vanilla-extract theme contracts); reactive theming rides entirely on `vars()` plus signals. Platform-rejected rules are skipped from the CSSOM with a warning and no text fallback (`lib/internal/sheet.ts`), and the ecosystem — devtools, framework integrations, community recipes — is a fraction of what Emotion, Styled Components, and the build-time tools have accumulated.
