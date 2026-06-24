---
applyTo: "packages/css/**"
---

<css-package-instructions>

Type-safe CSS-in-JS. `css()` generates rules from JS objects (global by default; `name` scopes to a class). `cssVars()` flattens nested objects into `--var-name` custom properties and returns a same-shaped `var()` proxy, with a static fast path and a reactive effect path. Reference-counted CSSOM injection with a textContent mirror; SSR-safe. `css()` is also the runtime target of the babel plugin's `<style>` → `css(...)` transform (`plugins/babel/src/transformers/style.mjs`) — changing its signature/return affects that transform.

## Mental model

- Two style elements: `hella-css` (rules) and `hella-vars` (custom properties), each lazily created and independently reset. The `<style>` element is never removed, only cleared (rules deleted, textContent emptied).
- `css(obj)` injects globally and returns `""`; `css(obj, { name })` wraps in `.{name}` and returns `name`.
- `cssVars(vars)` flattens nested keys to `--a-b-c` and returns a same-shaped object of `var(--a-b-c)` strings.
- Static path (no function leaves) is hash-cached + LRU; reactive path (any function leaf) creates one effect per vars object **reference**.
- Multiple `cssVars()` calls to the same scope **merge** keys; `cssVarsRemove` removes only the caller's keys.

## Files

| File | Responsibility |
|---|---|
| `css.ts` | `css()` + private `process()`. Hash-cache lookup, traversal, brace-depth-0 rule splitting, CSSOM injection, refCount increment. Throws on non-object. |
| `cssRemove.ts` | `cssRemove()` — decrement refCount; at zero drops CSSOM rules + cache entry. No-op for unknown. Throws on non-object. |
| `cssReset.ts` | `cssReset()` — clears the 4 css-side maps + resets `hella-css` sheet. Does **not** touch vars state. |
| `cssVars.ts` | `cssVars()` + private `flattenVars()` / `buildResult()`. Routes static vs reactive. Throws on non-object. |
| `cssVarsRemove.ts` | `cssVarsRemove()` — reactive-first (by ref) then static (by hash) lookup; at zero disposes effect + removes scope keys. No-op for unknown. Throws on non-object. |
| `cssVarsReset.ts` | `cssVarsReset()` — disposes all vars effects, clears vars maps, resets `hella-vars` sheet, replaces reactive WeakMaps. |
| `types.d.ts` | `CSSOptions` (`name?`), `CSSVarsOptions` (`scoped?`, `prefix?`), `CSSObject`, `CSSValue`, `CSSSelector`, `CSSVarLeaf`, `CSSVarInputObject`, `CSSVars<T>`. Uses `csstype`. |
| `internal/core.ts` | Re-exports `effect`, `isFunction`, `isPlainObject`, `isObject`, `hasDocument` from `@hellajs/core`. |
| `internal/cssStore.ts` | css-side state: `STYLE_ID="hella-css"`, `refCounts`, `inlineCache`, `cssRulesMap`, `ruleCounts`, `hashKey()`, exported `syncTextContent()`. |
| `internal/varsStore.ts` | vars-side state + logic: `VARS_ID="hella-vars"`, `scopedVarsRulesMap`, `cache`, `CACHE_MAX=100`, `DOT_REGEX`, `VarsEntry`, `varsRegistryStatic`, `varsRegistryReactive` / `varsResultReactive` (reassignable `let` WeakMaps), `applyRules()`, `removeFromScope()`, `resetReactiveRegistries()`, **private** `syncTextContent()` (distinct from cssStore's). |
| `internal/sheet.ts` | CSSOM helper shared by both sheets: module-private `indexMap` + `sheets`, lazy `getSheet()` (creates `<style id>`), `upsertRule()` (skips no-op, try/catch for invalid/unparseable rules), `removeRule()`, `resetSheet()`. |
| `internal/reactive.ts` | `activeEffects` (lazily-allocated `Set`), `createVarsEffect()` (wraps `effect()`; returns a cleanup that disposes + self-removes), `cleanupVarsEffects()` (bulk dispose). |
| `internal/shared.ts` | `stringify()` (recursive, key-sorting) + `hash()` (DJB2 → base36). |
| `index.ts` | Re-exports the 6 functions + `export type *`. |

## State

**css-side** (`cssStore.ts`):

| Map | Type | Purpose |
|---|---|---|
| `refCounts` | `Map<string, number>` | usage count per hash key |
| `inlineCache` | `Map<string, string>` | hashKey → returned name (or `""`) |
| `cssRulesMap` | `Map<string, string>` | hashKey → full cssText; **textContent source** |
| `ruleCounts` | `Map<string, number>` | hashKey → count of split top-level rules |

**vars-side** (`varsStore.ts`):

| Map | Type | Purpose |
|---|---|---|
| `scopedVarsRulesMap` | `Map<scope, Map<varName, value>>` | per-scope accumulated vars (merge target); **textContent source** |
| `cache` | `Map<hash, {flattened, result}>` | static-path cache; LRU-ordered by insertion/access |
| `varsRegistryStatic` | `Map<hash, VarsEntry>` | per-static-call registry for removal |
| `varsRegistryReactive` | `WeakMap<object, VarsEntry>` | per-reactive-call registry, keyed by vars reference |
| `varsResultReactive` | `WeakMap<object, CSSVars>` | cached result returned for repeat reactive calls |
| `activeEffects` | `Set<() => void> \| undefined` | lazily allocated; bulk-disposal target for `cssVarsReset` |

`VarsEntry = { flatKeys, scope, prefix, refCount, cleanup? }`. Stored `prefix` already includes the trailing hyphen (`${prefix}-`).

## css() flow

1. `isPlainObject(obj)` guard — throws `[css] css: expected a CSS object, received …`.
2. `key = hashKey(obj, options)` = `${stringify(obj)}:${options.name || ""}`.
3. `inlineCache` hit → `refCounts++`, return cached name.
4. Miss → `process(obj, selector, isGlobal)` builds cssText; split into top-level rules at brace-depth 0; `ruleCounts.set(key, rules.length)`.
5. `if (hasDocument())` → `upsertRule(STYLE_ID, ${key}:${i}, rule)` per split rule. `cssRulesMap.set` + `syncTextContent()` run regardless (the mirror has its own DOM guard).
6. `refCounts++`; cache `name || ""` in `inlineCache`; return it.

### process() — value handling

| Input | Output |
|---|---|
| `null` / `undefined` value | skipped (`== null`) |
| nested obj under conditional `@`-rule, scoped | inherits parent selector (`.{name}{…}` inside the block) |
| nested obj under conditional `@`-rule, global | empty selector |
| nested obj under definitional `@`-rule | always empty selector (global) — even with `name` |
| nested obj, key starts with `&` | `&` → parent selector (all occurrences) |
| nested obj, scoped, plain key | descendant: `${selector} ${key}` |
| nested obj, global, plain key | key unwrapped |
| array value | joined with `", "` |
| camelCase key | kebab-case (`fontSize` → `font-size`) |
| `--`-prefixed key | preserved verbatim |
| `content` string value | auto-wrapped in `"…"` unless already `"…"` / `'…'` |

**Conditional at-rules** (`CONDITIONAL_AT_RULES` in `css.ts`): `@media`, `@container`, `@supports`, `@starting-style`. **Definitional** (every other `@` key — `@keyframes`, `@font-face`, `@layer`, `@import`, …): always processed with an empty selector, even when `name` is provided.

## cssVars() dual path

1. `isPlainObject(vars)` guard — throws `[css] cssVars: expected a plain object, received …`.
2. Single `flattenVars()` pass → `{ flat, hasFns }`: nested objects become dot-keys; function leaves are **called once** synchronously (per flatten) and `hasFns` is flagged.
3. **Static** (`!hasFns`): `h = hash(stringify(vars) + stringify(options))`.
   - cache hit → promote (delete + re-set), `varsRegistryStatic.refCount++`, re-`applyRules`, return cached result.
   - miss → `applyRules(flat)`, `buildResult(flat)`, LRU enforce (`cache.size >= 100` → drop oldest = `keys().next().value`), store cache + registry entry (`scope = scoped || ":root"`, `prefix = prefix ? `${prefix}-` : ""`), `refCount = 1`.
4. **Reactive** (`hasFns`):
   - same `vars` ref seen before → `refCount++`, re-`applyRules`, return the **same** result object (`varsResultReactive`).
   - new ref → `applyRules(flat)`, `buildResult(flat)`, `run = () => { const { flat } = flattenVars(vars); applyRules(flat, options) }` (fresh flat each run), `cleanup = createVarsEffect(run)`, store registry + result entries, `refCount = 1`.
5. Result is populated immediately in both paths (no effect await).

**Why the reactive result is stable** — `buildResult` only reads the flat **keys** (structure) to emit `var(--…)` strings; live **values** reach the sheet only via `applyRules` writing into `scopedVarsRulesMap`. The returned proxy therefore never mutates; signal writes update the CSSOM/scope map, not the object.

`applyRules(flat, { scoped, prefix = "" })`: `scope = scoped || ":root"`, `fullPrefix = prefix ? `${prefix}-` : ""`; merge each flat key into `scopedVarsRulesMap[scope]` as `${fullPrefix}${key}`; rebuild `${scope}{--${k.replace(DOT_REGEX,"-")}:${v}}` and `upsertRule(VARS_ID, scope, …)` (no space after `:`).

`buildResult(flat, options)`: reconstructs the nested shape from dot-keys; every leaf → `var(--${fullPrefix}${key with dots→hyphens})`.

## Non-obvious behaviors

Highest-signal gotchas; verify any change against these:

- **Vars textContent ≠ vars CSSOM format** — `applyRules` upserts CSSOM rules as `:root{--k:v}` (no spaces), but the vars-side **private** `syncTextContent()` mirrors as `:root{--k: v;}` (space after colon, trailing `;`). Tests assert against the **mirror** — always expect `--k: v;`. The css-side has no such split: its `syncTextContent()` joins `cssRulesMap` values verbatim (same no-space format as the CSSOM).
- **Two `syncTextContent` functions** — `cssStore.ts` exports one (joins `cssRulesMap`); `varsStore.ts` has a private one (reformats `scopedVarsRulesMap` with spaces). Unrelated despite the shared name.
- **insertRule can silently no-op** — `upsertRule` wraps `insertRule`/`deleteRule`/cssText-access in try/catch; unsupported rules (e.g. `@layer` under happy-dom) are skipped in CSSOM but still carried by the textContent mirror. Tests asserting only on `textContent` pass even when the live sheet rejected the rule.
- **Static writes sync, reactive writes scheduled** — `css()` writes the sheet synchronously; `cssVars()` reactive leaves are core effects, so writes inside `batch()` update the sheet when the batch flushes (use bare `flush()` in tests).
- **Reactive keyed by reference, static by hash** — repeat `cssVars(sameRef)` returns the same result object and bumps refCount; structurally-equal static objects collide by hash. `cssVarsRemove` checks reactive (by ref) **first**, then static (by hash).
- **Global default** — `css(obj)` injects unwrapped and returns `""`; `name: ""` is also global (`!name`).
- **Conditional at-rules inherit scope** — under a `name`, `@media`/`@container`/`@supports`/`@starting-style` bodies use the parent selector; `&` and descendant composition work inside them.
- **Definitional at-rules stay global** — `@keyframes`, `@font-face`, `@layer`, `@import` never pick up `.{name}`, even when `name` is set.
- **cssVars default scope `:root`** — `scoped` overrides to any selector; `prefix` appends `${prefix}-` (trailing hyphen auto-inserted).
- **Dots → hyphens** — `colors.primary` → `--colors-primary` (`DOT_REGEX = /\./g` on both apply and result paths).
- **Scope accumulation** — multiple `cssVars()` to one scope merge; `cssVarsRemove` removes only that call's flatKeys; the scope rule is dropped entirely when its map empties.
- **`cssVarsRemove` no-op for unknown** input; reactive removal disposes the effect (later signal writes don't touch the sheet).
- **SSR-safe** — `hasDocument()` guards every DOM write; in-memory state still updates and results still return.
- **Throws wording differs by family** — css/cssRemove: `[css] css…: expected a CSS object, received …`; cssVars/cssVarsRemove: `[css] cssVars…: expected a plain object, received …`.
- **Reset isolation** — `cssReset` touches only css-side state (4 maps + `hella-css` sheet); `cssVarsReset` touches only vars-side state (effects + maps + `hella-vars` sheet + replaces the two reactive WeakMaps, since WeakMap entries can't be enumerated).
- **Lazy style elements** — `<style id="hella-css"|"hella-vars">` created by `getSheet()` on first write; `resetSheet` clears content but leaves the element in the DOM.

## Performance

- **Inline cache** — `inlineCache` gives O(1) return for repeat `css()` calls; refCount still increments on hits.
- **Reference counting** — inject once, remove from CSSOM at zero refs.
- **Static fast path** — `hasFns === false` skips effect creation entirely.
- **LRU (static vars)** — `cache` capped at 100; access promotes via delete+set (protects from eviction); insertion at capacity evicts the oldest key.
- **Deterministic keys** — `stringify` sorts keys recursively so key-order-independent objects collide; DJB2 → base36 hash.
- **Surgical CSSOM** — `upsertRule` early-returns when the existing rule's `cssText` is unchanged; `indexMap` (keyed `${id}:${key}`) avoids full-sheet rewrites.
- **While-loops with cached length** throughout hot paths.

## Testing

- Import from `@hellajs/css/bundle`; `beforeEach` runs `resetTestState()` + `cssReset()` + `cssVarsReset()` (the css package's module-level maps aren't cleared by `resetTestState` alone).
- Assert via `document.getElementById('hella-css' | 'hella-vars')?.textContent` — and use the **vars mirror format** (`--k: v;`) when constructing vars expectations.
- `css.test.ts` — global/scoped, `&` (incl. multiple `&`), descendants, null/undefined skip, array join, number values, `content` auto-quote, ref counting, cache reuse, `cssRemove` no-op, `cssReset`, `test.each` input validation.
- `css-at-rules.test.ts` — every `@`-rule with the conditional-vs-definitional split (scoped `@media`/`@container`/`@supports`/`@starting-style` inherit; `@keyframes`/`@font-face`/`@layer` stay global even with `name`).
- `cssvars.test.ts` — static caching, deep nesting, signal/computed/batched updates, mixed static+reactive, multi-call accumulation, independent reactive updates, effect cleanup on reset, **LRU eviction + promotion-on-access**, compile-time type rejections (boolean / Date / boolean-returning fn), input validation.
- `cssvars-scoped.test.ts` — class/ID selectors, prefix, scoped+prefix, multi-scope accumulation, reactive scoped, options-hash caching.
- `cssvars-flatten.test.ts` — static flatten, nested fn resolution, mixed deep nesting, dot→hyphen keys.
- `cssvars-types.test.ts` — compile-time rejection of boolean/Date/boolean-returning fn; acceptance of string/number/string-fn/nested; leaf type is `string`.
- `cssvars-remove.test.ts` — static removal, ref counting (3 calls → 3 removes), reactive effect disposal, shared-scope partial removal, scoped/prefixed removal, reactive refCount (2 calls → 1 remove leaves effect active), no-op unknown, input validation.
- `ssr.test.ts` — unsets `globalThis.document` (save in `beforeEach`, restore in `afterEach`); css/cssVars still return correct results; `cssReset`/`cssVarsReset` don't throw.

Follow `guides/code.md` for source and `guides/tests.md` for tests; both supersede any style hint here.
