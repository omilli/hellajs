# HellaJS @hellajs/css vs. Emotion / Styled Components / vanilla-extract / Panda CSS

A ground-up comparison based on the actual source code of `@hellajs/css` v2. Every HellaJS claim below was verified against `packages/css/lib/` (including `lib/internal/`). Competitor facts were sourced this session from each project's official docs (emotion.sh, styled-components.com, vanilla-extract.style, panda-css.com) and from the bundlephobia size API.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS css | Emotion | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|
| Styling approach | Runtime, object-only, CSSOM surgical | Runtime, string + object | Runtime, tagged templates | Build-time extraction (zero-runtime) | Build-time codegen (near-zero runtime) |
| Class names | User-chosen (`name`) or global | Auto-hashed (`css-…`) | Auto-hashed (unique per component) | Auto-hashed (`styles_x__1hiof570`) | Atomic utilities + `@layer` |
| Global by default | Yes — empty string return, no wrapper | No — always class-scoped | No — always class-scoped | No — always locally scoped | No — utilities/recipes |
| Reactive CSS vars | First-class (`cssVars()` + signals) | Manual `--var` + theme context | Manual, via props/theme | `createVar` / `createTheme` (static) | Token-driven (static at runtime) |
| Memory model | Ref counting, DOM cleanup at zero | Inject-and-leave, cache only | Inject-and-leave, automatic critical CSS | Build-time; nothing at runtime | Build-time; static CSS shipped |
| SSR | No-op DOM writes, no extraction | Zero-config SSR (React), manual (`@emotion/css`) | Via babel/SWC plugin, extract to HTML | Bundler CSS output (static) | Static CSS file output |
| Type safety | `csstype` properties + recursive `CSSVars<T>` | Template literals; object styles typed via `@emotion/serialize` | Template literals; TS via generic props | Full TS, `.css.ts` authoring | Full TS via codegen, token autocomplete |
| Gzipped size | ~2.3 KB (bundle) / ~0.97 KB (css only) | ~5.4 KB (`@emotion/styled`) | ~11.1 KB | 0 KB runtime | ~0.6 KB runtime + static CSS |
| External deps | `csstype` + core peer | 8+ (`@emotion/*`, `@babel/runtime`) | 6+ (`stylis`, `tslib`, `shallowequal`) | Build-only (`css-what`, `lru-cache`, etc.) | Build-only (codegen pipeline) |
| Framework coupling | None | React-primary, framework-agnostic subset | React + React DOM (peer) | None (bundler-coupled) | None (works with most frameworks) |

HellaJS sits in the runtime camp alongside Emotion and Styled Components, but with a fundamentally different default mode (global, user-named), a memory model none of the runtime competitors offer (reference counting with DOM cleanup), and a first-class reactive-variable primitive that wires signals directly into CSS custom properties. Against vanilla-extract and Panda it trades the zero-runtime property for a dependency-light, no-build-step authoring model with live reactivity.

---

## 2. Style Generation Strategy

### HellaJS

HellaJS is a runtime CSS-in-JS library with no template-literal parser and no CSS preprocessing dependency. `css()` walks a plain JavaScript object in a single `while` loop (`lib/css.ts`), accumulating property strings and recursing into nested selectors. CamelCase keys convert to kebab-case via a single regex replace (`lib/css.ts`); keys starting with `--` are preserved as custom properties (`lib/css.ts`); `content` values are auto-quoted unless already quoted (`lib/css.ts`); array values join with `", "` (`lib/css.ts`); `null`/`undefined` values are skipped entirely (`lib/css.ts`). The `&` token is replaced with the parent selector via `AMP_REGEX` (`lib/css.ts`), and `@`-rules process their content with an empty selector so that nested `@media`/`@keyframes`/`@container`/`@supports`/`@layer`/`@font-face` blocks do not accidentally nest under a class (`lib/css.ts`).

The resulting CSS text is split into individual top-level rules at brace-depth boundaries (`lib/css.ts`), and each rule is inserted into the stylesheet via `sheet.ts`'s `upsertRule` (`lib/css.ts`). `upsertRule` uses `CSSStyleSheet.insertRule` for O(1) per-rule insertion and an `indexMap` keyed by `id:key` to skip no-op writes when the existing rule's `cssText` already matches (`lib/sheet.ts`). This is surgical CSSOM mutation — no full-text `textContent` rewrite on update. A `textContent` mirror is maintained on the `hella-css` element purely for DevTools visibility and test assertions (`lib/css.ts`). All DOM writes are guarded by `hasDocument()` so the same code path runs under SSR without touching `document` (`lib/sheet.ts`, `lib/css.ts`, `lib/css.ts`).

### Emotion

Emotion is a runtime CSS-in-JS library that accepts both tagged-template strings and object styles. It depends on `stylis` (via `@emotion/serialize`) for CSS preprocessing — handling nesting, vendor prefixing, and minification at runtime. The framework-agnostic entry (`@emotion/css`) returns hashed class names from a `css` tag; `cx` composes them. The React entry (`@emotion/react`) adds a `css` prop, theme context, and zero-config SSR; `@emotion/styled` provides the `styled.div`...`` factory. Production relies on heavy caching to amortize the stylis parse cost. Per the official docs, a Babel plugin is optional but enables optimizations and source maps.

### Styled Components

Styled Components is a runtime CSS-in-JS library built around tagged template literals and the React component model. Each `styled.tagname`...`` call returns a React component; stylis (bundled) parses the template at runtime, handling SCSS-like nesting, `&` self-references, and `&&` precedence boosts. The library tracks which components are rendered and injects only their styles ("automatic critical CSS"), generating unique hashed class names per component instance. Per the official docs, vendor prefixing is disabled by default in v6+ (opt-in via `StyleSheetManager`), and a Babel or SWC plugin is recommended for legible class names, smaller bundles, and SSR compatibility. It has the heaviest runtime of the four competitors.

### vanilla-extract

vanilla-extract is a zero-runtime CSS-in-TypeScript system. Styles are authored in `.css.ts` files; a bundler integration (Vite, webpack, esbuild, Next, Parcel, Rollup, Gatsby) extracts the CSS at build time and emits a static stylesheet. `style({ padding: 10 })` runs once at build time, produces a locally-scoped hashed class name (e.g. `styles_container__1hiof570`), and exports that string for use in markup. The browser ships zero styling JS — only the resolved class name strings. The build-time bundle (`@vanilla-extract/css@1.17.0`) is ~70.9 KB / ~22.2 KB gzip but runs only in the bundler; runtime cost is 0 KB. Dynamic values flow through `createVar`/`createTheme` (CSS variables generated at build time).

### Panda CSS

Panda CSS is a build-time, type-safe CSS-in-JS system from the Chakra team. A codegen pipeline (`@pandacss/dev`) AST-scans source files and emits a `styled-system/` directory containing static CSS (cascade layers via `@layer`, CSS variables, atomic utility classes — the Tailwind-inspired JIT strategy) plus small TypeScript helpers. `css({ fontSize: 'lg', color: 'red.400' })` returns a class string resolved against a token config; recipes and variants (Stitches-inspired) encode multi-variant components. Runtime JS is minimal (~0.6 KB gzip for the entry, per the bundlephobia API); the bulk of styling work is the static CSS file. Works with most JS frameworks because output is plain CSS + class strings.

**Verdict:** HellaJS, Emotion, and Styled Components share the runtime camp; vanilla-extract and Panda are the build-time counterpoint. HellaJS is the only runtime library that skips the CSS preprocessor dependency entirely (no stylis, no `css-what`, no parsing of template literals) — it walks a plain object once and talks to the CSSOM directly. That makes its runtime the smallest of the runtime camp (~2.3 KB gzip full bundle vs. Emotion's ~5.4 KB and Styled Components' ~11.1 KB), at the cost of supporting object styles only (no template literals).

---

## 3. Bundle Size & Dependencies

|  | HellaJS (css only, min) | HellaJS (bundle, min) | HellaJS (+ core peer) | Emotion (`@emotion/styled`) | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|---|---|
| Min+gzip | ~0.97 KB (css module) | ~2.29 KB | ~2.3 KB + ~3 KB core | ~5.4 KB | ~11.1 KB | 0 KB runtime | ~0.6 KB runtime + static CSS |

Sizes for competitors are from the bundlephobia API fetched this session: `@emotion/styled@11.13.5` reports 12,175 B min / 5,366 B gzip with 8 dependencies; `styled-components@6.1.18` reports 29,613 B min / 11,142 B gzip with 9 dependencies; `@vanilla-extract/css@1.17.0` reports 70,915 B / 22,188 B gzip (build-only). HellaJS figures are from `packages/css/dist/sizes.json`: css module 1.89 KB min / 0.97 KB gzip; full bundle 5.61 KB min / 2.29 KB gzip.

- `@hellajs/css` declares exactly one runtime dependency (`csstype`, type-only) and one peer dependency (`@hellajs/core`) (`package.json:26-31`). No `stylis`, no `tslib`, no `shallowequal`, no `@emotion/*` packages.
- The package is split into individually-published modules (`dist/css.js`, `dist/vars.js`, `dist/sheet.js`, `dist/reactive.js`, `dist/shared.js`) so consumers can tree-shake to just the `css` module if reactive variables are unused.
- vanilla-extract and Panda ship zero (or near-zero) runtime JS, but move all the work into a bundler plugin and a static CSS artifact. HellaJS keeps the work at runtime but pays for it in less than 2.5 KB gzip including reactivity.

---

## 4. Scoping Model

HellaJS inverts the default of every competitor here. `css()` is **global by default**: when no `name` option is provided, `isGlobal = !name` is true, the selector is the empty string, and the function returns `""` (`lib/css.ts`, `lib/css.ts`). Top-level keys are treated as raw CSS selectors — `body`, `*`, `.card`, `@media (…)` — and injected unwrapped (`lib/css.ts`). Passing `{ name: 'card' }` opts into scoping: the selector becomes `.card`, the function returns `"card"` for use in `class` attributes, and descendant keys compose against the parent (`.card .child`, `.card span`) unless they start with `&`, in which case `&` is replaced with the parent selector verbatim (`lib/css.ts`, `lib/css.ts`).

This is a deliberate split: global styles (resets, `@keyframes`, `@font-face`, `@layer`) go through unnamed calls, and component-scoped styles go through named calls. The class names are **user-chosen, not hashed** — `name: 'btn'` produces `.btn`, not `.css-a1b2c3`. That makes the generated stylesheet legible in DevTools and stable across rebuilds, at the cost of requiring the author to avoid collisions (HellaJS will not synthesize uniqueness).

Emotion and Styled Components hash every class by default and expose globals only through a separate `<Global>` / `createGlobalStyle` API. vanilla-extract hashes locally-scoped identifiers (`styles_container__1hiof570`) — the author writes `style({…})` and receives an opaque string; global styles go through a separate `globalStyle` API. Panda emits atomic utility classes and recipe classes under `@layer`. None of the four lets the author write `name: 'btn'` and get back `.btn` in the stylesheet the way HellaJS does.

**Verdict:** HellaJS's global-default + user-named-scoped model is the closest of any competitor to writing plain CSS by hand, and the only one that produces human-readable class names without a build step. The trade-off is the author owns namespace hygiene — there is no automatic uniqueness, and a duplicated `name` across two `css()` calls merges into the same selector (deduplicated via reference counting, `lib/css.ts`).

---

## 5. Reactive Variables

This is HellaJS's clearest differentiator. `cssVars()` takes an object — possibly nested, possibly containing signal functions — and produces two things in one call: a set of `--var-name` CSS custom properties written to the `hella-vars` style element, and a proxy object whose leaf values are pre-built `var(--var-name)` references for use in `css()` calls (`lib/vars.ts`).

A single-pass flattener, `flattenVars`, walks the input, dot-joins nested keys (`colors.primary` → `colors.primary`), resolves function values immediately, and sets a `hasFns` flag if any function was encountered (`lib/vars.ts`). That flag routes the call:

- **Static path** (no functions): the input is hashed via a DJB2 hash of its deterministically-sorted stringification (`lib/vars.ts`, `lib/shared.ts`), checked against an LRU cache capped at 100 entries (`lib/vars.ts`, `lib/vars.ts`), and the cached result proxy is returned on hit (`lib/vars.ts`). Cache access promotes the entry to most-recently-used, protecting it from eviction (`lib/vars.ts`).
- **Reactive path** (functions present): `applyRules` + `buildResult` run synchronously first so the returned proxy is populated immediately (`lib/vars.ts`), then `createVarsEffect(run)` registers a reactive effect that re-flattens and re-applies on signal change (`lib/vars.ts`, `lib/reactive.ts`).

Dots in keys become hyphens in the output custom-property names (`colors.primary` → `--colors-primary`) via `DOT_REGEX` (`lib/vars.ts`, applied at `lib/vars.ts`, `lib/vars.ts`, `lib/vars.ts`, `lib/vars.ts`). Multiple `cssVars()` calls to the same scope accumulate rather than overwrite — the `scopedVarsRulesMap` (`lib/vars.ts`) is a `Map<scope, Map<varName, value>>`, and `applyRules` merges into the existing scope map before re-emitting the merged scope rule (`lib/vars.ts`). Scoping to `.card` or `#main` and prefixing with a namespace are both first-class options (`lib/types.d.ts`).

No competitor wires signal reactivity directly into CSS variable generation. Emotion and Styled Components handle dynamic values via component props / theme context (re-running the style function on every render or prop change). vanilla-extract's `createVar` and `createTheme` produce variables at build time — dynamic updates require the consumer to write the `var(--…)` value somewhere and mutate it via a separate mechanism. Panda's tokens are static at runtime. HellaJS's `cssVars()` is the only API here that says "give me an object of signals, I'll keep a CSS custom property in sync with each one for you."

**Verdict:** For reactive theming driven by signals, HellaJS is the only one of the five that makes CSS custom properties a first-class reactive primitive rather than a manual wiring exercise.

---

## 6. Memory Management

HellaJS is the only library in this comparison with explicit, symmetrical reference counting on both style rules and CSS variables. Every `css()` call increments a per-hash-key `refCount` — including cache hits (`lib/css.ts`, `lib/css.ts`). `cssRemove(obj, options)` decrements; only when the count reaches zero are the individual CSSOM rules removed from the sheet, the inline cache entry cleared, and the `textContent` mirror refreshed (`lib/css.ts`). Removing one reference of a multi-referenced style is a pure decrement — the rule stays injected and the cache entry is preserved (`lib/css.ts`).

`cssVars()` mirrors this with two parallel registries: `varsRegistryStatic` (a `Map<string, VarsEntry>` keyed by hash) for static var sets, and `varsRegistryReactive` (a `WeakMap<object, VarsEntry>` keyed by the original vars object reference) for reactive var sets (`lib/vars.ts`). Each `VarsEntry` tracks `flatKeys`, `scope`, `prefix`, `refCount`, and an optional reactive `cleanup` disposer (`lib/vars.ts`). `cssVarsRemove()` decrements; at zero, reactive entries dispose their effect via the stored cleanup (so subsequent signal updates no longer mutate the stylesheet) and call `removeFromScope`, which deletes only that call's keys from the shared scope map, re-emits the merged scope rule if other calls still contribute to it, or removes the scope rule entirely if the scope is now empty (`lib/vars.ts`). Reactive removal also re-resolves the original object reference, so the caller must pass the same object they passed to `cssVars()` (documented behavior, `lib/vars.ts`).

Bulk disposal is provided by `cssReset()` and `cssVarsReset()`. `cssVarsReset()` calls `cleanupVarsEffects()`, which iterates the lazily-allocated `activeEffects` Set and disposes every registered effect before clearing it (`lib/reactive.ts`, `lib/reactive.ts`), then clears all maps, registries, and the sheet (`lib/vars.ts`). Two separate style elements — `hella-css` for rules and `hella-vars` for custom properties (`lib/css.ts`, `lib/vars.ts`) — keep the two concerns independently clearable.

Emotion and Styled Components inject styles and rely on cache hits for subsequent renders; neither removes styles from the DOM when components unmount (Styled Components' "automatic critical CSS" tracks what's rendered, but does not decrement-and-remove on unmount). vanilla-extract and Panda are build-time — there is no runtime removal because there is no runtime injection. HellaJS's model is the only one that treats style injection as a resource with a lifecycle the caller controls.

**Verdict:** The reference-counting model is unique in this group. It costs the caller a `cssRemove()`/`cssVarsRemove()` call per `css()`/`cssVars()` call (or a bulk `cssReset()`/`cssVarsReset()`), and in return gives deterministic DOM cleanup that the runtime competitors don't offer at all.

---

## 7. Type Safety

HellaJS uses `csstype` for full CSS property coverage (`lib/types.d.ts`). `CSSObject` is the intersection of a selector-keyed map (tag names, at-rules, pseudo-classes, arbitrary strings) and `CSS.Properties` keyed with values allowing arrays and primitives (`lib/types.d.ts`). `CSSVars<T>` is a recursive conditional type that transforms an input object's leaves to `string` while preserving nesting (`lib/types.d.ts`), so `cssVars({ colors: { primary: '…' } })` returns `{ colors: { primary: 'var(--colors-primary)' } }` with the original shape intact and the leaves typed as `string`.

Emotion types object styles via `@emotion/serialize`; template-literal styles are typed at the tagged-template level. Styled Components types via generic component props (`styled.button<{ $primary?: boolean }>`) and does not validate CSS property names inside template literals. vanilla-extract is TypeScript-first and full-type-safe at author time in `.css.ts` files. Panda generates type definitions from the user's token config, giving autocomplete on token paths (`color: 'red.400'`).

HellaJS matches vanilla-extract and Panda on compile-time CSS property validation (via `csstype`) and is the only one of the runtime libraries that does so without a Babel plugin or codegen step. The gap is that `cssVars()` does not type-check that a value is a signal or function returning a string — it accepts `unknown` leaves to support the reactive path (`lib/types.d.ts`).

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Emotion | Styled Components | vanilla-extract | Panda CSS |
|---|---|---|---|---|---|
| Object styles | Yes (`lib/css.ts`) | Yes | Via `css` helper | Yes (`style()`) | Yes (`css()`) |
| Template-literal styles | No | Yes | Yes | No | No |
| Nested selectors (`&`) | Yes (`lib/css.ts`) | Yes (stylis) | Yes (stylis) | Yes | Yes |
| `@media` / `@keyframes` / `@font-face` / `@container` / `@supports` / `@layer` | Yes, all (`lib/css.ts`) | Yes | Yes | Yes (`keyframes`, `fontFace`, `layer`, `createContainer`) | Yes (`@layer`-native) |
| Reactive CSS variables (signal-driven) | Yes (`lib/vars.ts`) | Manual | Manual | Static only (`createVar`) | Static only (tokens) |
| Reference counting + DOM cleanup | Yes (`lib/css.ts`, `lib/vars.ts`) | No | No | N/A (build-time) | N/A (build-time) |
| Global styles as default mode | Yes (`lib/css.ts`) | Separate `<Global>` | Separate `createGlobalStyle` | Separate `globalStyle` | Separate utilities/recipes |
| User-chosen class names | Yes (`lib/css.ts`) | No (hashed) | No (hashed) | No (hashed) | No (atomic/hashed) |
| Deterministic caching (sorted-key hash) | Yes (`lib/shared.ts`) | Yes (`@emotion/hash`) | Yes | Build-time dedupe | Build-time dedupe |
| Bounded cache (LRU eviction) | Yes, 100 entries (`lib/vars.ts`, `lib/vars.ts`) | No eviction | No eviction | N/A | N/A |
| SSR-safe (no throw without `document`) | Yes (`lib/sheet.ts`, `lib/css.ts`) | Yes (React), partial (`@emotion/css`) | Yes (with plugin) | N/A (static) | N/A (static) |
| SSR critical-CSS extraction to HTML | No | Yes (React zero-config) | Yes (babel/SWC plugin) | Yes (bundler CSS) | Yes (static CSS file) |
| Theming primitive | `cssVars()` only | `ThemeProvider` context | `ThemeProvider` context | `createTheme` / `createThemeContract` | Token config + semantic tokens |
| Source maps | No | Yes | Yes | N/A (static) | N/A (static) |
| Vendor prefixing | No | Yes (stylis) | Opt-in v6+ (`StyleSheetManager`) | N/A (post-build) | N/A (post-build) |

### Notable HellaJS differentiators

- **Signal-driven reactive CSS custom properties** — `cssVars()` detects function values in a single flatten pass and creates a reactive effect that re-writes the `--var-name` declarations on signal change (`lib/vars.ts`, `lib/reactive.ts`). No competitor integrates signals into CSS variable generation.
- **Symmetrical reference counting with DOM cleanup at zero** — `cssRemove()` and `cssVarsRemove()` decrement per-call ref counts and remove the actual CSSOM rules / scope rules only at zero (`lib/css.ts`, `lib/vars.ts`).
- **Global-by-default with user-chosen scoped class names** — no hashed class names; `name: 'btn'` produces `.btn` and returns `"btn"` (`lib/css.ts`, `lib/css.ts`).
- **CSSOM surgical updates, no textContent rewrite** — each rule is upserted individually via `CSSStyleSheet.insertRule` with an index map that skips no-op writes (`lib/sheet.ts`).
- **LRU-bounded static-var cache** — 100-entry cap with access-order promotion prevents unbounded growth (`lib/vars.ts`, `lib/vars.ts`, `lib/vars.ts`).
- **Single-pass reactive detection** — `flattenVars` returns a `hasFns` flag from the same traversal that resolves initial values, so the static/reactive routing decision costs no extra walk (`lib/vars.ts`).
- **No CSS preprocessor dependency** — `process()` walks the object directly (`lib/css.ts`); the package has zero runtime deps beyond types (`package.json:26-31`).

---

## 9. Ergonomics & Syntax

```tsx
import { signal, batch } from '@hellajs/core';
import { css, cssVars } from '@hellajs/css';

// Global styles — returns ""
css({
  body: { margin: 0, fontFamily: 'system-ui, sans-serif' },
  '*': { boxSizing: 'border-box' },
  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
});

// Scoped styles — returns the name for class=""
const btn = css({
  padding: '0.75rem 1.5rem',
  borderRadius: '0.5rem',
  backgroundColor: theme.colors.primary,   // var(--colors-primary)
  '&:hover': { transform: 'translateY(-1px)' },
}, { name: 'btn' });
// <button class={btn}>…</button>

// Reactive CSS variables — signal updates propagate to the stylesheet
const dark = signal(false);
const theme = cssVars({
  colors: {
    primary: '#3b82f6',
    background: () => dark() ? '#1a1a1a' : '#ffffff',  // reactive leaf
  },
});
// theme.colors.primary === 'var(--colors-primary)'

batch(() => dark(true));   // hella-vars element now shows --colors-background: #1a1a1a
```

The API shape is two functions (`css`, `cssVars`) plus their remove/reset pairs. Emotion and Styled Components center on `styled.tagname`...`` factories that return React components — a different ergonomic: you get a component, not a class name, and props drive dynamic values. HellaJS returns strings and leaves component composition to the view layer, so the same `css()` output works in JSX, `html\`\`` templates, raw DOM, or any string-based markup. vanilla-extract and Panda return class-name strings too, but require a `.css.ts` file (vanilla-extract) or a generated `styled-system/` directory (Panda) and a configured bundler. HellaJS's authoring model is the closest to writing inline styles — no separate file, no build step, no framework.

---

## Bottom Line

Architecturally, HellaJS css is a runtime CSS-in-JS library in the Emotion / Styled Components family, but with three structural choices none of them make: it defaults to global styles with user-chosen class names (no hashed identifiers, no mandatory class wrapper), it reference-counts every style and variable and removes them from the DOM at zero refs, and it wires signal reactivity directly into CSS custom property generation via a dedicated `cssVars()` primitive. Against vanilla-extract and Panda it trades the zero-runtime property for a no-build, no-bundler authoring model with live reactivity in under 2.5 KB gzip including the core peer.

What sets HellaJS apart — and no single competitor matches all of:

1. **Signal-reactive CSS variables as a first-class primitive** — `cssVars()` flattens nested objects, detects functions in one pass, and creates effects that re-write CSS custom properties on signal change (`lib/vars.ts`).
2. **Reference-counted DOM cleanup** — both rules and vars track per-call ref counts and remove themselves from the stylesheet at zero (`lib/css.ts`, `lib/vars.ts`).
3. **Global-by-default with user-chosen scoped names** — `name: 'btn'` produces `.btn`, not a hash; global styles need no wrapper API (`lib/css.ts`).
4. **No CSS preprocessor dependency** — a single `process()` walk talks to the CSSOM directly; the only runtime dep is `csstype` (types-only) (`package.json:26-31`, `lib/css.ts`).
5. **Smallest runtime in the runtime camp** — ~2.29 KB gzip full bundle vs. Emotion's ~5.4 KB and Styled Components' ~11.1 KB.

Its gaps are the predictable ones: no SSR critical-CSS extraction (Emotion React and Styled Components both stream used styles into server HTML; vanilla-extract and Panda ship a static CSS file), no build-time / zero-runtime mode, no vendor prefixing, no source maps, no `styled()` component factory (returns class strings — the consumer wires up `class` attributes), no token-system theming primitive beyond `cssVars()`, and a much smaller ecosystem with no dedicated devtools or framework-specific integrations.
