<css-package-instructions>

Type-safe CSS-in-JS. `css()` generates rules from JS objects (global by default; `name` scopes to a class). `cssVars()` flattens nested objects into `--var-name` custom properties and returns a same-shaped `var()` proxy, with a static fast path and a reactive effect path. Platform-dependent return: on the client, `css()`/`cssVars()` inject into the CSSOM and return the class name / proxy; on the server (no DOM), both return the CSS text directly with zero state mutation. The CSSOM is the only write path — no textContent mirror; rules live in `el.sheet` (whose identity stays stable) and text is the identity key for dedup and reference counting (`injectedMap` in `internal/injection.ts`).

## Mental model

- Two style elements: `hella-css` (rules) and `hella-vars` (custom properties), each lazily created and independently reset. The `<style>` element is never removed, only cleared (rules deleted, textContent emptied).
- `css(obj)` injects globally and returns `""`; `css(obj, { name })` wraps in `.{name}` and returns `name`. On the server (no DOM), both return the CSS text directly (stateless — no `injectedMap` mutation).
- `cssVars(vars)` flattens nested keys to `--a-b-c` and returns a same-shaped object of `var(--a-b-c)` strings.
- Static path (no function leaves) is hash-cached + LRU; reactive path (any function leaf) creates one effect per vars object **reference**.
- Multiple `cssVars()` calls to the same scope **merge** keys; `removeCssVars` removes only the caller's keys.

## Files

| File | Responsibility |
|---|---|
| `css.ts` | `css()` + `process()` (exported `@internal`). Platform-dependent return: client injects + dedup via `injectedMap`; server returns text. Brace-depth-0 rule splitting, CSSOM injection, refCount increment. Throws on non-object; throws on function property values at any nesting depth (reactive leaves belong to `cssVars`); throws on direct declarations inside a selector-less conditional at-rule body. |
| `removeCss.ts` | `removeCss()` — re-derives text via `process()`, decrements `injectedMap` count; at zero drops CSSOM rules + entry. No-op for unknown. No-op on server (`!hasDocument()`). Throws on non-object. |
| `resetCss.ts` | `resetCss()` — clears `injectedMap` + resets `hella-css` sheet. Does **not** touch vars state. No-op on server. |
| `cssVars.ts` | `cssVars()` + private `flattenVars()` / `buildResult()`. Platform-dependent return: server early-returns text (inline `buildVarsText` logic); client routes static vs reactive. Throws on non-object. |
| `removeCssVars.ts` | `removeCssVars()` — reactive-first (by ref) then static (by hash) lookup; at zero disposes effect + removes scope keys. No-op for unknown. No-op on server. Throws on non-object. |
| `resetCssVars.ts` | `resetCssVars()` — disposes all vars effects, clears vars maps, resets `hella-vars` sheet, replaces reactive WeakMaps. |
| `types.d.ts` | `CSSOptions` (`name?`), `CSSVarsOptions` (`scoped?`, `prefix?`), `CSSObject`, `CSSValue`, `CSSSelector`, `CSSVarLeaf`, `CSSVarInputObject`, `CSSVars<T>`. Uses `csstype`. |
| `internal/core.ts` | Re-exports `effect`, `isFunction`, `isPlainObject`, `isObject`, `hasDocument` from `@hellajs/core`. |
| `internal/injection.ts` | css-side state: `STYLE_ID="hella-css"`, `InjectedEntry` (`{ count, ruleCount }`), `injectedMap: Map<cssText, InjectedEntry>` (1 map: dedup + refCount). |
| `internal/vars.ts` | vars-side state + logic: `VARS_ID="hella-vars"`, `scopedVarsRulesMap`, `cache`, `CACHE_MAX=100`, `DOT_REGEX`, `VarsEntry`, `varsRegistryStatic`, `varsRegistryReactive` / `varsResultReactive` (reassignable `let` WeakMaps), `resolveVarsOptions()` (single scope/prefix derivation), `applyRules(flat, resolved)`, `removeFromScope()`, `resetReactiveRegistries()`, exported `serializeDecls()`. |
| `internal/sheet.ts` | CSSOM helper shared by both sheets: module-private `indexMap` + `sheets`, lazy `getSheet()` (creates `<style id>`), `upsertRule()` (skips no-op, try/catch for invalid/unparseable rules), `removeRule()`, `resetSheet()`. |
| `internal/reactive.ts` | `activeEffects` (lazily-allocated `Set`), `createVarsEffect()` (wraps `effect()`; returns a cleanup that disposes + self-removes), `cleanupVarsEffects()` (bulk dispose). |
| `internal/shared.ts` | `stringify()` (recursive, key-sorting) + `hash()` (DJB2 → base36). |
| `index.ts` | Re-exports the 6 functions + `export type *`. |

## State

**css-side** (`injection.ts`):

| Map | Type | Purpose |
|---|---|---|
| `injectedMap` | `Map<cssText, { count, ruleCount }>` | text → ref count + split-rule count; dedup (`has(text)`), refCount (`count`) |

**vars-side** (`vars.ts`):

| Map | Type | Purpose |
|---|---|---|
| `scopedVarsRulesMap` | `Map<scope, Map<varName, value>>` | per-scope accumulated vars (merge target); rule serialization source |
| `cache` | `Map<hash, {flattened, result}>` | static-path cache; LRU-ordered by insertion/access |
| `varsRegistryStatic` | `Map<hash, VarsEntry>` | per-static-call registry for removal |
| `varsRegistryReactive` | `WeakMap<object, VarsEntry>` | per-reactive-call registry, keyed by vars reference |
| `varsResultReactive` | `WeakMap<object, CSSVars>` | cached result returned for repeat reactive calls |
| `activeEffects` | `Set<() => void> \| undefined` | lazily allocated; bulk-disposal target for `resetCssVars` |

`VarsEntry = { flatKeys, scope, fullPrefix, refCount, cleanup? }`. `fullPrefix` is the resolved form from `resolveVarsOptions` (trailing hyphen included).

## css() flow

1. `isPlainObject(obj)` guard — throws `[css] css: expected a CSS object, received …`.
2. `cssText = process(obj, selector, isGlobal)` — builds the CSS text (always; text is the identity).
3. `if (!hasDocument()) return cssText` — server: pure text, zero state.
4. `injectedMap.get(cssText)` hit → `count++`, return `name || ""`.
5. Miss → split into top-level rules at brace-depth 0; `upsertRule(STYLE_ID, ${cssText}:${i}, rule)` per split rule.
6. `injectedMap.set(cssText, { count: 1, ruleCount: rules.length })`; return `name || ""`.

### process() — value handling

| Input | Output |
|---|---|
| `null` / `undefined` value | skipped (`== null`) |
| nested obj under conditional `@`-rule | inherits the active parent selector (`.{name}` scope or the nested key it sits under) |
| nested obj under conditional `@`-rule, no selector in scope | **throws** if the body has direct declarations (null-only bodies pass) |
| nested obj under definitional `@`-rule | always empty selector (global) — even with `name`; direct declarations emit bare (`@font-face{…}`) |
| nested obj, key starts with `&` | `&` → parent selector (all occurrences) |
| nested obj, plain key, non-empty `selector` | descendant: `${selector} ${key}` (scoped `.{name}` or any nested global key) |
| nested obj, plain key, empty `selector` (top-level global) | key unwrapped |
| array value | joined with `", "` |
| number value | appends `px` unless the key is unitless (`UNITLESS_PROPERTIES` in `css.ts`) or `--`-prefixed |
| camelCase key | kebab-case (`fontSize` → `font-size`) |
| `--`-prefixed key | preserved verbatim |
| `content` string value | auto-wrapped in `"…"` unless already `"…"` / `'…'` |

**Conditional at-rules** (`CONDITIONAL_AT_RULES` in `css.ts`): `@media`, `@container`, `@supports`, `@starting-style`. **Definitional** (every other `@` key — `@keyframes`, `@font-face`, `@layer`, `@import`, …): always processed with an empty selector, even when `name` is provided.

## cssVars() dual path

1. `isPlainObject(vars)` guard — throws `[css] cssVars: expected a plain object, received …`.
2. `if (!hasDocument())` → build `${scope}{${serializeDecls(prefixed entries)}}` (no-space CSSOM form) and return it as text — server: zero state, zero effects. Return type stays `CSSVars<T>` (cast); narrow with `typeof` in isomorphic code.
3. Single `flattenVars()` pass → `{ flat, hasFns }`: nested objects become dot-keys; function leaves are **called once** synchronously (per flatten) and `hasFns` is flagged.
4. **Static** (`!hasFns`): `h = hash(stringify(vars) + stringify(options))`.
   - cache hit → promote (delete + re-set), `varsRegistryStatic.refCount++`, re-`applyRules`, return cached result.
   - miss → `applyRules(flat)`, `buildResult(flat)`, LRU enforce (`cache.size >= 100` → drop oldest = `keys().next().value`), store cache + registry entry (`scope = scoped || ":root"`, `prefix = prefix ? `${prefix}-` : ""`), `refCount = 1`.
5. **Reactive** (`hasFns`):
   - same `vars` ref seen before → `refCount++`, re-`applyRules`, return the **same** result object (`varsResultReactive`).
   - new ref → `applyRules(flat)`, `buildResult(flat)`, `run = () => { const { flat } = flattenVars(vars); applyRules(flat, options) }` (fresh flat each run), `cleanup = createVarsEffect(run)`, store registry + result entries, `refCount = 1`.
6. Result is populated immediately in both paths (no effect await).

**Why the reactive result is stable** — `buildResult` only reads the flat **keys** (structure) to emit `var(--…)` strings; live **values** reach the sheet only via `applyRules` writing into `scopedVarsRulesMap`. The returned proxy therefore never mutates; signal writes update the CSSOM/scope map, not the object.

`applyRules(flat, resolved)` — takes `resolveVarsOptions(options)` output (`{ scope, fullPrefix }`); merge each flat key into `scopedVarsRulesMap[scope]` as `${fullPrefix}${key}`; rebuild `${scope}{--${k.replace(DOT_REGEX,"-")}:${v}}` and `upsertRule(VARS_ID, scope, …)` (no space after `:`).

`buildResult(flat, fullPrefix)`: reconstructs the nested shape from dot-keys; every leaf → `var(--${fullPrefix}${key with dots→hyphens})`.

Server return (inline in `cssVars`): `${scope}{--${prefixed key with dots→hyphens}:${value};…}` (no-space CSSOM form, no trailing `;`) — built inline before the static/reactive routing.

## Non-obvious behaviors

Highest-signal gotchas; verify any change against these:

- **Two style elements, one write path** — `hella-css` and `hella-vars` are separate `<style>` elements, but neither is textContent-managed in steady state: all writes go through `upsertRule`/`removeRule` against `el.sheet`. `resetSheet` is the only place that clears `textContent` (reset-to-pristine).
- **insertRule can silently no-op** — `upsertRule` wraps `insertRule`/`deleteRule`/cssText-access in try/catch; unsupported rules (e.g. `@layer` under happy-dom) are skipped in the CSSOM entirely — there is no textContent mirror, so a skipped rule is invisible to sheet-reading tests (assert such compositions via the server text return instead). A failed `insertRule` formerly left a phantom `indexMap` entry, causing subsequent rules to be injected at a stale index and corrupting the sheet; now `indexMap.set` runs only on successful `insertRule`. Both the new-rule and update paths follow the same discipline — `indexMap.delete(ruleKey)` clears before the `deleteRule`/`insertRule` try-chain and `indexMap.set` re-runs only inside the successful-`insertRule` try, so a rejected update leaves no stale entry.
- **Static writes sync, reactive writes scheduled** — `css()` writes the sheet synchronously; `cssVars()` reactive leaves are core effects, so writes inside `batch()` update the sheet when the batch flushes (use bare `flush()` in tests).
- **Reactive keyed by reference, static by hash** — repeat `cssVars(sameRef)` returns the same result object and bumps refCount; structurally-equal static objects collide by hash. `removeCssVars` checks reactive (by ref) **first**, then static (by hash).
- **Reactive repeat-ref + differing options throws** — a second `cssVars(sameRef, {scoped|prefix})` whose resolved scope/prefix differs from the first throws `[css] cssVars: …` before any stray scope rule is written; reactive entries are one-per-object-reference. The static path remains keyed by `hash(vars+options)` and supports differing options across distinct calls.
- **Global default** — `css(obj)` injects unwrapped and returns `""`; `name: ""` is also global (`!name`).
- **Conditional at-rules inherit any active selector** — under a `name`, `@media`/`@container`/`@supports`/`@starting-style` bodies use that selector; nested under a plain selector, they compose with it. With no selector in scope, a body containing direct declarations throws; null-only bodies emit an empty at-rule. `&` and descendant composition work inside them.
- **Definitional at-rules stay global** — `@keyframes`, `@font-face`, `@layer`, `@import` never pick up `.{name}`, even when `name` is set.
- **cssVars default scope `:root`** — `scoped` overrides to any selector; `prefix` appends `${prefix}-` (trailing hyphen auto-inserted).
- **Dots → hyphens** — `colors.primary` → `--colors-primary` (`DOT_REGEX = /\./g` on both apply and result paths).
- **Scope accumulation** — multiple `cssVars()` to one scope merge; `removeCssVars` removes only that call's flatKeys; the scope rule is dropped entirely when its map empties.
- **`removeCssVars` no-op for unknown** input; reactive removal disposes the effect (later signal writes don't touch the sheet).
- **SSR-safe / platform-dependent return** — `css()`/`cssVars()` return CSS text on the server (no DOM) with zero state mutation; the client path injects into the CSSOM and returns the class name / proxy. `removeCss`/`removeCssVars` are no-ops on server (`!hasDocument()` early return).
- **Throws wording differs by family** — css/removeCss: `[css] <fn>: expected a CSS object, received …`; cssVars/removeCssVars: `[css] <fn>: expected a plain object, received …`; both families additionally share process()'s conditional-at-rule throw: `[css] conditional at-rule "<key>" contains declarations with no selector — nest selectors under it or use the name option` and function-value throw: `[css] function values are not supported in css objects — use cssVars() for reactive values, key: <key>` (both fire in `css` and `removeCss`, client and server).
- **Reset isolation** — `resetCss` touches only css-side state (4 maps + `hella-css` sheet); `resetCssVars` touches only vars-side state (effects + maps + `hella-vars` sheet + replaces the two reactive WeakMaps, since WeakMap entries can't be enumerated).
- **Lazy style elements** — `<style id="hella-css"|"hella-vars">` created by `getSheet()` on first write; `resetSheet` clears content but leaves the element in the DOM.

## Performance

- **Text-keyed dedup** — `injectedMap.get(cssText)` gives O(1) return for repeat `css()` calls; `count` still increments on hits. `process()` always runs (text is the identity), replacing the former `stringify`+`hash` cacheKey.
- **Reference counting** — inject once, remove from CSSOM at zero refs.
- **Static fast path** — `hasFns === false` skips effect creation entirely.
- **LRU (static vars)** — `cache` capped at 100; access promotes via delete+set (protects from eviction); insertion at capacity evicts the oldest key.
- **Deterministic keys** — `stringify` sorts keys recursively so key-order-independent objects collide; DJB2 → base36 hash.
- **Surgical CSSOM** — `upsertRule` early-returns when the existing rule's `cssText` is unchanged; `indexMap` (keyed `${id}:${key}`) avoids full-sheet rewrites.
- **While-loops with cached length** throughout hot paths.

## Testing

- Import from `@hellajs/css/bundle`; `beforeEach` runs `resetTestState()`.
- Assert via `getStylesheet('hella-css' | 'hella-vars')` from `@utils/test-helpers.js` — the live `sheet.cssRules` joined and squeezed to the no-space form the package inserts (vars included: `--k:v`). When patching `globalThis.document` for server-text asserts, capture the return value and restore the global **before** asserting — a throwing `expect` must not leak the patch into sibling tests.
- happy-dom rejects or under-serializes some at-rules (`@layer`/`@starting-style` rejected, `@font-face` serialized as an empty block) — assert those compositions via the server text return (same `process()` derivation), not the CSSOM.
- `css.test.ts` — global/scoped, `&` (incl. multiple `&`), descendants, null/undefined skip, array join, number values, `content` auto-quote, ref counting, cache reuse, `removeCss` no-op, `resetCss`, `test.each` input validation.
- `css-at-rules.test.ts` — every `@`-rule with the conditional-vs-definitional split (scoped `@media`/`@container`/`@supports`/`@starting-style` inherit; `@keyframes`/`@font-face`/`@layer` stay global even with `name`).
- `cssvars.test.ts` — static caching, deep nesting, signal/computed/batched updates, mixed static+reactive, multi-call accumulation, independent reactive updates, effect cleanup on reset, **LRU eviction + promotion-on-access**, input validation.
- `cssvars-scoped.test.ts` — class/ID selectors, prefix, scoped+prefix, multi-scope accumulation, reactive scoped, options-hash caching.
- `cssvars-flatten.test.ts` — static flatten, nested fn resolution, mixed deep nesting, dot→hyphen keys.
- `cssvars-types.test.ts` — compile-time type rejections (boolean / Date / boolean-returning fn); acceptance of string/number/string-fn/nested; leaf type is `string`.
- `cssvars-remove.test.ts` — static removal, ref counting (3 calls → 3 removes), reactive effect disposal, shared-scope partial removal, scoped/prefixed removal, reactive refCount (2 calls → 1 remove leaves effect active), no-op unknown, input validation.
- `ssr.test.ts` — platform-dependent return: unsets `globalThis.document` (save in `beforeEach`, restore in `afterEach`); css/cssVars return CSS text on server, no DOM injection, `removeCss`/`removeCssVars` no-ops, `resetCss`/`resetCssVars` don't throw.

Run with `bun coverage css`.

Follow `guides/code.md` for source and `guides/tests.md` for tests; both supersede any style hint here.
