<css-package-instructions>

Type-safe CSS-in-JS. `css()` generates rules from JS objects (global by default; `name` scopes to a class). `cssVars()` flattens nested objects into `--var-name` custom properties and returns a same-shaped `var()` proxy, with a static fast path and a reactive effect path. Reference-counted CSSOM injection with a textContent mirror; SSR-safe.

## Mental model

- Two style elements: `hella-css` (rules) and `hella-vars` (custom properties), each lazily created and independently reset.
- `css(obj)` injects globally and returns `""`; `css(obj, { name })` wraps in `.{name}` and returns `name`.
- `cssVars(vars)` flattens nested keys to `--a-b-c` and returns a same-shaped object of `var(--a-b-c)` strings.
- Static path (no function leaves) uses a hash cache + LRU; reactive path (any function leaf) creates one effect per vars object reference.
- Multiple `cssVars()` calls to the same scope **merge** keys; `cssVarsRemove` removes only the caller's keys.

## Files

| File | Responsibility |
|---|---|
| `css.ts` | `css()` + private `process()`. Hash-cache lookup, traversal, rule splitting, CSSOM injection, refCount increment. Throws on non-object. |
| `cssRemove.ts` | `cssRemove()` — decrement refCount; at zero drops CSSOM rules + cache entry. No-op for unknown. Throws on non-object. |
| `cssReset.ts` | `cssReset()` — clears the 4 css-side maps + resets `hella-css` sheet. Does **not** touch vars state. |
| `cssVars.ts` | `cssVars()` + private `flattenVars()` / `buildResult()`. Routes static vs reactive. Throws on non-object. |
| `cssVarsRemove.ts` | `cssVarsRemove()` — reactive-first (by ref) then static (by hash) lookup; at zero disposes effect + removes scope keys. No-op for unknown. Throws on non-object. |
| `cssVarsReset.ts` | `cssVarsReset()` — disposes all vars effects, clears vars maps, resets `hella-vars` sheet, replaces reactive WeakMaps. |
| `types.d.ts` | `CSSOptions` (`name?`), `CSSVarsOptions` (`scoped?`, `prefix?`), `CSSObject`, `CSSVarLeaf`, `CSSVarInputObject`, `CSSVars<T>`. Uses `csstype`. |
| `internal/core.ts` | Re-exports `effect`, `isFunction`, `isPlainObject`, `isObject`, `hasDocument` from `@hellajs/core`. |
| `internal/cssStore.ts` | css-side state: `STYLE_ID="hella-css"`, `refCounts`, `inlineCache`, `cssRulesMap`, `ruleCounts`, `hashKey()`, `syncTextContent()`. |
| `internal/varsStore.ts` | vars-side state + logic: `VARS_ID="hella-vars"`, `scopedVarsRulesMap`, `cache`, `CACHE_MAX=100`, `DOT_REGEX`, `VarsEntry`, `varsRegistryStatic`, `varsRegistryReactive` (WeakMap), `varsResultReactive` (WeakMap), `applyRules()`, `removeFromScope()`, `resetReactiveRegistries()`. |
| `internal/sheet.ts` | CSSOM helper shared by both sheets: lazy `getSheet()` (creates `<style id>`), `upsertRule()` (skips no-op, try/catch for invalid rules), `removeRule()`, `resetSheet()`. |
| `internal/reactive.ts` | `activeEffects` (lazily-allocated `Set`), `createVarsEffect()` (wraps `effect()`, tracks cleanup), `cleanupVarsEffects()` (bulk dispose). |
| `internal/shared.ts` | `stringify()` (recursive, key-sorting) + `hash()` (DJB2 → base36). |
| `index.ts` | Re-exports the 6 functions + types. |

## State

**css-side** (`cssStore.ts`):

| Map | Type | Purpose |
|---|---|---|
| `refCounts` | `Map<string, number>` | usage count per hash key |
| `inlineCache` | `Map<string, string>` | hashKey → returned name (or `""`) |
| `cssRulesMap` | `Map<string, string>` | hashKey → full cssText; **source for textContent rebuild** |
| `ruleCounts` | `Map<string, number>` | hashKey → count of split top-level rules |

**vars-side** (`varsStore.ts`):

| Map | Type | Purpose |
|---|---|---|
| `scopedVarsRulesMap` | `Map<scope, Map<varName, value>>` | per-scope accumulated vars (merge target) |
| `cache` | `Map<hash, {flattened, result}>` | static-path cache; LRU-ordered by insertion/access |
| `varsRegistryStatic` | `Map<hash, VarsEntry>` | per-static-call registry for removal |
| `varsRegistryReactive` | `WeakMap<object, VarsEntry>` | per-reactive-call registry, keyed by vars reference |
| `varsResultReactive` | `WeakMap<object, CSSVars>` | cached result returned for repeat reactive calls |
| `activeEffects` | `Set<() => void> \| undefined` | lazily allocated; bulk-disposal target for `cssVarsReset` |

`VarsEntry = { flatKeys, scope, prefix, refCount, cleanup? }`.

## css() flow

1. `isPlainObject(obj)` guard — throws `[css] css: expected a CSS object, received …`.
2. `key = hashKey(obj, options)` = `${stringify(obj)}:${options.name || ""}`.
3. `inlineCache` hit → `refCounts++`, return cached name.
4. Miss → `process(obj, selector, isGlobal)` builds cssText; split into top-level rules at brace-depth 0; `ruleCounts.set(key, rules.length)`.
5. For each split rule → `upsertRule(STYLE_ID, ${key}:${i}, rule)`; mirror full cssText in `cssRulesMap`; `syncTextContent()`.
6. `refCounts` (existing+1); cache `name || ""` in `inlineCache`; return it.

### process() — value handling

| Input | Output |
|---|---|
| `null` / `undefined` value | skipped |
| nested obj under conditional `@`-rule | inherits parent selector when scoped (`.{name}{…}` inside the block); empty selector in global mode |
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
2. Single `flattenVars()` pass → `{ flat, hasFns }`: nested objects become dot-keys; function leaves are **called once** synchronously and `hasFns` is flagged.
3. **Static** (`!hasFns`): `h = hash(stringify(vars) + stringify(options))`.
   - cache hit → promote (delete + re-set), `varsRegistryStatic.refCount++`, re-`applyRules`, return cached result.
   - miss → `applyRules(flat)`, `buildResult(flat)`, LRU enforce (`cache.size >= 100` → drop oldest = `keys().next().value`), store cache + registry entry (`scope = scoped || ":root"`, `prefix = prefix ? `${prefix}-` : ""`), `refCount = 1`.
4. **Reactive** (`hasFns`):
   - same `vars` ref seen before → `refCount++`, re-`applyRules`, return the **same** result object (`varsResultReactive`).
   - new ref → `applyRules(flat)` (already resolved synchronously), `buildResult(flat)`, create `run = () => { flattenVars(vars); applyRules(flat, options) }`, `cleanup = createVarsEffect(run)`, store registry + result entries, `refCount = 1`.
5. Result is populated immediately in both paths (no effect await).

`applyRules(flat, { scoped, prefix })`: `scope = scoped || ":root"`, `fullPrefix = prefix ? `${prefix}-` : ""`; merge each flat key into `scopedVarsRulesMap[scope]` as `${fullPrefix}${key}`; rebuild `${scope}{--${k.replace(DOT_REGEX,"-")}:${v};…}` and `upsertRule(VARS_ID, scope, …)`.

`buildResult(flat, options)`: reconstructs the nested shape from dot-keys; every leaf → `var(--${fullPrefix}${key with dots→hyphens})`.

## Performance

- **Inline cache** — `inlineCache` gives O(1) return for repeat `css()` calls; refCount still increments on hits.
- **Reference counting** — inject once, remove from CSSOM at zero refs.
- **Static fast path** — `hasFns === false` skips effect creation entirely.
- **LRU (static vars)** — `cache` capped at 100; access promotes via delete+set (protects from eviction); insertion at capacity evicts the oldest key.
- **Deterministic keys** — `stringify` sorts keys recursively so key-order-independent objects collide; DJB2 → base36 hash.
- **Surgical CSSOM** — `upsertRule` early-returns when the existing rule's `cssText` is unchanged; `indexMap` avoids full-sheet rewrites.
- **While-loops with cached length** throughout hot paths.
- **Dual-write** — CSSOM is the live sheet; `syncTextContent()` rebuilds `textContent` from `cssRulesMap` (css) / `scopedVarsRulesMap` (vars) for DevTools + test assertions. If `insertRule` throws (e.g. unsupported rule under happy-dom), CSSOM skips it but the mirror still carries it.

## Behaviors

- **Global default** — `css(obj)` injects unwrapped and returns `""`. `name: ""` is also global (`!name`).
- **Scoped** — `css(obj, { name })` wraps direct props in `.{name}{…}`, plain nested keys become `.{name} ${key}` descendants, `&` substitutes the parent (all occurrences).
- **Conditional at-rules inherit scope** — under a `name`, `@media`/`@container`/`@supports`/`@starting-style` bodies are processed with the parent selector.
- **Definitional at-rules stay global** — `@keyframes`, `@font-face`, `@layer`, etc. never pick up `.{name}`, even when `name` is provided.
- **cssVars default scope `:root`** — `scoped` overrides to any selector; `prefix` appends `${prefix}-` (trailing hyphen auto-inserted).
- **Dots → hyphens** — `colors.primary` → `--colors-primary`.
- **Scope accumulation** — multiple `cssVars()` to one scope merge; `cssVarsRemove` removes only that call's flatKeys; the scope rule is dropped entirely when its map empties.
- **Reactive keyed by reference** — repeat `cssVars(sameRef)` returns the same result object and bumps refCount; static keyed by hash.
- **`cssVarsRemove` no-op for unknown** input; reactive removal disposes the effect (later signal writes don't touch the sheet).
- **SSR-safe** — `hasDocument()` guards every DOM write; in-memory state still updates and results still return.
- **Throws** — css/cssRemove: `[css] css…: expected a CSS object, received …`; cssVars/cssVarsRemove: `[css] cssVars…: expected a plain object, received …` (note the wording differs between the two families).
- **Reset isolation** — `cssReset` touches only css-side state; `cssVarsReset` touches only vars-side state (effects + maps + sheet + replaces the two reactive WeakMaps, since WeakMap entries can't be enumerated).
- **Lazy style elements** — `<style id="hella-css"|"hella-vars">` created by `getSheet()` on first write.

## Testing

- Import from `@hellajs/css/bundle`; `beforeEach` runs `resetTestState()` + `cssReset()` + `cssVarsReset()`.
- Assert via `document.getElementById('hella-css' | 'hella-vars')?.textContent`.
- `css.test.ts` — global/scoped, `&` (incl. multiple `&`), descendants, every `@`-rule with the conditional-vs-definitional split, null/undefined skip, array join, number values, `content` auto-quote, ref counting, cache reuse, `cssRemove` no-op, `cssReset`, `test.each` input validation.
- `cssvars.test.ts` — static caching, deep nesting, signal/computed/batched updates, mixed static+reactive, multi-call accumulation, independent reactive updates, effect cleanup on reset, **LRU eviction + promotion-on-access**, compile-time type rejections (boolean / Date / boolean-returning fn), input validation.
- `cssvars-scoped.test.ts` — class/ID selectors, prefix, scoped+prefix, multi-scope accumulation, reactive scoped, options-hash caching.
- `cssvars-remove.test.ts` — static removal, ref counting (3 calls → 3 removes), reactive effect disposal, shared-scope partial removal, scoped/prefixed removal, reactive refCount (2 calls → 1 remove leaves effect active), no-op unknown, input validation.
- `ssr.test.ts` — unsets `globalThis.document`; css/cssVars still return correct results; `cssReset`/`cssVarsReset` don't throw.

</css-package-instructions>
