<css-package-instructions>

Type-safe CSS-in-JS. `css()` generates global rules from JS objects (`name` scopes to a class); `style()` generates scoped rules and returns a content-hashed class (`h-{label}-{hash}` / `h-{hash}`) — identical on client and server. `vars()` flattens nested objects into `--var-name` custom properties and returns a same-shaped `var()` proxy on BOTH platforms, with a static fast path and a reactive effect path; `keyframes()` registers a content-hashed `@keyframes` rule and returns its animation name everywhere. Registration state runs on BOTH platforms — `css()`/`style()`/`keyframes()`/`vars()` register everywhere and return `""`/the class/the name/the proxy everywhere; only sheet mutation is DOM-gated (no-op without a document). `cssText()` collects the registered text — css-side rules in call order, then the vars contribution — the server-side `<style>` source. The CSSOM is the only write path — no textContent mirror; rules live in `el.sheet` (whose identity stays stable) and text is the identity key for dedup and reference counting (`injectedMap` in `internal/injection.ts`).

## Mental model

- Two style elements: `hella-css` (rules) and `hella-vars` (custom properties), each lazily created and independently reset. The `<style>` element is never removed, only cleared (rules deleted, textContent emptied). A per-call `host` (e.g. a `ShadowRoot`) redirects both into the host: one `<style>` per sheet id inside it (no id attribute), registered weakly per host.
- `css(obj)` injects globally and returns `""`; `css(obj, { name })` wraps in `.{name}` and returns `name` — on both platforms (server registration is state-only).
- `style(obj, { label?, host? })` derives a content-hashed class and registers `.{class}` rules; `style(base, override)` composes (string base prefixes verbatim, object base deep-merges into one class). Same class on client and server.
- `cva(config)` builds a variant recipe returning `(props) => class string`: `base` → variants in config order → matching compounds, space-joined. Per-selection classes generate lazily on first resolution (cached per recipe), every resolution re-registers so refcounts stay exact; responsive `{ initial, [bp] }` props emit un-wrapped + `@media`-wrapped registrations of the selection's class.
- `cx(...args)` joins class fragments (clsx parity): falsy drops, objects contribute truthy-valued keys, arrays recurse. Pure — touches no state.
- `cssText()` peeks css-side `injectedMap` keys (default-host only) in first-registration order, then appends the default-host vars buckets — never drains.
- `vars(vars)` flattens nested keys to `--a-b-c` and returns a same-shaped object of `var(--a-b-c)` strings — on both platforms.
- `keyframes(obj)` returns a content-hashed `h-kf-{hash}` animation name; structurally equal objects (any key order — the derivation canonicalizes) register one rule under one name.
- Static path (no function leaves) is hash-cached + LRU; reactive path (any function leaf) creates one effect per vars object **reference**.
- Multiple `vars()` calls to the same scope+media bucket **merge** keys; `removeVars` removes only the caller's keys.

## Files

| File | Responsibility |
|---|---|
| `css.ts` | `css()` + `process()` (exported `@internal`). Registers via `registerText` on both platforms; returns `name || ""` everywhere. `host` option threads into the registration key + `upsertRule` target. Throws on non-object; throws on function property values at any nesting depth (reactive leaves belong to `vars`); throws on direct declarations inside a selector-less conditional at-rule body. |
| `style.ts` | `style()` (2 public overloads) + `@internal resolveStyle()` + `ResolvedStyle`. `resolveStyle` normalizes the (obj | base, override?, options?) overloads — a second plain object is an options bag only when every own key is `label` (string) / `host` (object), mirroring overload assignability — validates, deep-merges object bases (`mergeStyles`: plain objects recurse, arrays/scalars replace), and derives class + rule text via `scopedRule(obj, options)` (the full options bag forwards; `host` is ignored by derivation — placement happens at registration). `registerText` registers; returns `classList` (string base prefixes verbatim). |
| `cva.ts` | `cva()` — variant recipes. Validates config shape at creation (`config`/`variants` plain objects, `base` string-or-plain-object, `media` plain object) and props per call. Per-recipe `Map<string, ScopedRule>` cache keyed `variant:value[:bp]` / `base` / `compound:{i}` — first resolution derives via `scopedRule` (labels `{variant}-{value}`, base `base`, compound label from its stated selections e.g. `size-lg-tone-danger` / `size-md-lg`), every resolution re-registers via `registerText` so refcounts stay exact. Resolution: base (string verbatim) → variants in config order (`initial` slot + bp slots; `defaultVariants` fills a missing `initial`) → compounds whose stated slots all equal resolved. String variant/compound values pass through verbatim (no registration). Unknown variant values / breakpoints throw at resolution — lazy validation surfaces config mistakes at first use. Module-level pure helpers: `resolveSelection`, `matchesCompound`, `compoundLabel`, `appendClass` (dedupes the class attribute while both rules still register). |
| `cx.ts` | `cx()` — clsx-parity class joiner: strings/numbers join (numbers stringified), falsy drops, objects contribute truthy-valued keys, arrays recurse via local `appendValue`. Pure — no registration, no state, no DOM. |
| `removeStyle.ts` | `removeStyle()` (2 public overloads) — re-derives via `resolveStyle("removeStyle", …)`, decrements `injectedMap` count under the same host-qualified key; at zero drops CSSOM rules + entry. No-op for unknown. Decrements on BOTH platforms (sheet ops no-op on server). Throws on non-object. |
| `cssText.ts` | `cssText()` — joins `injectedMap` keys in insertion order, skipping host-qualified keys (`/^#\d/` test — host serials are `#`+digits, and valid CSS text never starts with `#`+digit), then appends `varsText()` (default-host vars buckets in insertion order). Peek, never drains. Identical on both platforms. |
| `removeCss.ts` | `removeCss()` — re-derives text via `process()`, decrements `injectedMap` count under the same host-qualified key; at zero drops CSSOM rules + entry. No-op for unknown. No-op on server (`!hasDocument()`). Throws on non-object. |
| `resetCss.ts` | `resetCss()` — clears `injectedMap` (both platforms) + resets `hella-css` sheet (DOM-only). Does **not** touch vars state. |
| `vars.ts` | `vars()` + private `flattenVars()` / `buildResult()`. Returns the proxy on BOTH platforms: server registers the initial-value rule text state-only (via `applyRules`; no effects, `hasFns` ignored, fn leaves resolved once) and returns `buildResult(flat)`; client routes static vs reactive. `host` threads into `applyRules` (sheet placement), the static hash input (+`hostQualifier(host)`), and `VarsEntry`. Throws on non-object. |
| `keyframes.ts` | `keyframes()` + `@internal keyframesRule()` + private `canonicalSteps()`. `keyframesRule` canonicalizes (recursive key-sort — keyframes steps/declarations are order-insensitive, keeping the emitted text in bijection with the content hash), derives `h-kf-{hash(stringify)}` + `@keyframes {name}{process(obj, "", true)}`; `keyframes()` registers via `registerText` and returns the name on both platforms. Throws on non-object. |
| `removeKeyframes.ts` | `removeKeyframes()` — re-derives via `keyframesRule()`, decrements `injectedMap` count; at zero drops the CSSOM rule + entry. No-op for unknown. Decrements on BOTH platforms (sheet ops no-op on server; mirrors `removeStyle`). Throws on non-object. |
| `removeVars.ts` | `removeVars()` — reactive-first (by ref) then static (by hash + host qualifier) lookup; at zero disposes effect + removes scope keys. No-op for unknown. No-op on server. Throws on non-object. |
| `resetVars.ts` | `resetVars()` — disposes all vars effects, clears vars maps, resets `hella-vars` sheet, replaces reactive WeakMaps. |
| `types.d.ts` | `CSSOptions` (`name?`, `host?`), `StyleOptions` (`label?`, `host?`), `CSSObject`, `StyleObject`, `CSSValue`, `CSSSelector`, `KeyframesObject`, `CVAVariants`, `CVAMedia`, `CVAPropValue`, `CVAProps`, `CVAVariantMatch`, `CVAConfig`, `CXArg`, `CSSVarLeaf`, `CSSVarInputObject`, `CSSVars<T>`, `VarsOptions` (+ deprecated `CSSVarsOptions` alias, dies in unit 06). Uses `csstype`. |
| `internal/core.ts` | Re-exports `effect`, `isFunction`, `isPlainObject`, `isObject`, `isString`, `hasDocument` from `@hellajs/core`. |
| `internal/identity.ts` | `scopedClassName(obj, label?)` — `h-{label}-{hash}` / `h-{hash}`; label sanitized to `[a-zA-Z0-9-]` (invalid → `-`, leading/trailing hyphens trimmed, empty-after-sanitize → absent); hash covers the object only (`stringify` + `hash` from `shared.ts`). `scopedRule(obj, { label?, media?, host? }) → { cls, cssText }` — shared derivation for `style()` and `cva()`: the class plus `process(obj, "." + cls, false)`, with `media` wrapping the whole text as `@media {q}{ … }`; `host` sits in the bag for one-argument forwarding and plays no part in derivation. Pure, deterministic, platform-free. |
| `internal/injection.ts` | css-side state + shared registration flow: `STYLE_ID="hella-css"`, `InjectedEntry` (`{ count, ruleCount }`), `injectedMap: Map<hostQualifiedCssText, InjectedEntry>` (key is `${hostQualifier(host)}${cssText}` — `""` on the default path), `registerText(cssText, host?)` (dedup → count++ on hit; miss → brace-depth-0 split → `upsertRule` per rule → set entry). Runs on both platforms — the server's `upsertRule` no-ops through the `getSheet` gate. |
| `internal/vars.ts` | vars-side state + logic: `VARS_ID="hella-vars"`, `scopedVarsRulesMap` (values are `VarsBucket` — `{ scope, media, host, vars: Map }`, the placement traveling with the bucket so `varsText()` serializes without parsing the composite key), `cache`, `CACHE_MAX=100`, `DOT_REGEX`, `VarsEntry` (carries `host`), `varsRegistryStatic`, `varsRegistryReactive` / `varsResultReactive` (reassignable `let` WeakMaps), `resolveVarsOptions()` (single scope/prefix/media/host derivation), `varsBucketKey()` (composite, host-qualified bucket key), `applyRules(flat, resolved)`, `removeFromScope(flatKeys, resolved)`, `varsText()` (default-host bucket serialization for `cssText()`), `resetReactiveRegistries()`, exported `serializeDecls()` / `varsRuleText()`. |
| `internal/sheet.ts` | CSSOM helper shared by both sheets: module-private `indexMap` + `sheets` (document sheets, unqualified keys), `hostIds` (stable per-host serial WeakMap — never reset), `hostQualifier()` (@internal, `""` / `#n`), `sheetKey()` (`${id}#${n}`), `hostSheets` (per-id `WeakMap<ParentNode, CSSStyleSheet>`), lazy `getSheet(id, host?)` (hosted path skips `getElementById`, creates id-less `<style>` per sheet id in the host), `upsertRule()`/`removeRule()` (host param → qualified indexMap keys; skips platform-rejected rules with a `console.warn`, try/catch for invalid/unparseable rules; every successful `deleteRule` calls module-private `rebaseIndexes(qid, i)` — decrements same-sheet `${qid}:`-prefixed entries above `i`, so stored indexes never go stale), `resetSheet()` (drops that id's host WeakMap — hosted sheets are abandoned, not enumerated; lazily re-created). |
| `internal/reactive.ts` | `activeEffects` (lazily-allocated `Set`), `createVarsEffect()` (wraps `effect()`; returns a cleanup that disposes + self-removes), `cleanupVarsEffects()` (bulk dispose). |
| `internal/shared.ts` | `stringify()` (recursive, key-sorting) + `hash()` (DJB2 → base36). |
| `index.ts` | Re-exports the 13 functions (`css`, `style`, `cva`, `cx`, `vars`, `keyframes`, `cssText`, `removeCss`, `removeStyle`, `removeVars`, `removeKeyframes`, `resetCss`, `resetVars`) + `export type *`. |

## State

**css-side** (`injection.ts`):

| Map | Type | Purpose |
|---|---|---|
| `injectedMap` | `Map<hostQualifiedCssText, { count, ruleCount }>` | `${hostQualifier}${cssText}` → ref count + split-rule count; dedup (`has(key)`), refCount (`count`); the `""` qualifier keeps the default path byte-identical |

**vars-side** (`vars.ts`):

| Map | Type | Purpose |
|---|---|---|
| `scopedVarsRulesMap` | `Map<bucketKey, VarsBucket>` | per scope+media bucket accumulated vars (merge target); rule serialization source. `VarsBucket = { scope, media, host?, vars: Map<varName, value> }` — placement carried with the bucket for `varsText()` |
| `cache` | `Map<hash, {flattened, result}>` | static-path cache; LRU-ordered by insertion/access |
| `varsRegistryStatic` | `Map<hash, VarsEntry>` | per-static-call registry for removal |
| `varsRegistryReactive` | `WeakMap<object, VarsEntry>` | per-reactive-call registry, keyed by vars reference |
| `varsResultReactive` | `WeakMap<object, CSSVars>` | cached result returned for repeat reactive calls |
| `activeEffects` | `Set<() => void> \| undefined` | lazily allocated; bulk-disposal target for `resetVars` |

`VarsEntry = { flatKeys, scope, fullPrefix, media, host, refCount, cleanup? }`. `fullPrefix`/`media` are the resolved forms from `resolveVarsOptions` (trailing hyphen included; `""` when no media); `host` is the raw host node (sheet placement + re-derived qualifier).

## css() flow

1. `isPlainObject(obj)` guard — throws `[css] css: expected a CSS object, received …`.
2. `cssText = process(obj, selector, isGlobal)` — builds the CSS text (always; text is the identity).
3. `registerText(cssText, host)` — dedup → count++ on hit; miss → brace-depth-0 split → `upsertRule` per split rule → set entry. Runs on BOTH platforms (server `upsertRule` no-ops via the `getSheet` gate).
4. Return `name || ""` — both platforms.

## style() flow

1. `resolveStyle("style", base, overrideOrOptions?, optionsArg?)` — overload normalization (option-bag heuristic), validation (`[css] style: expected a CSS object, received …`), merge (object base) or prefix (string base), `scopedRule(obj, options)` → `{ cls, cssText }`.
2. `registerText(text, host)` — same flow as `css()`.
3. Return `classList` (`${base} ${cls}` for a string base) — both platforms.

`removeStyle()` mirrors it: `resolveStyle("removeStyle", …)` re-derives the same identity deterministically, then decrements.

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

## vars() dual path

1. `isPlainObject(vars)` guard — throws `[css] vars: expected a plain object, received …`.
2. `if (!hasDocument())` → `applyRules(flat, resolved)` (registers the initial-value rule text into the vars-side state; sheet ops no-op) and return `buildResult(flat, fullPrefix)` — server: state-only registration, zero effects (`hasFns` ignored; fn leaves were already resolved once by `flattenVars`), proxy return identical to the client's.
3. Single `flattenVars()` pass → `{ flat, hasFns }`: nested objects become dot-keys; function leaves are **called once** synchronously (per flatten) and `hasFns` is flagged.
4. **Static** (`!hasFns`): `h = hash(stringify(vars) + stringify(options) + hostQualifier(host))`.
   - cache hit → promote (delete + re-set), `varsRegistryStatic.refCount++`, re-`applyRules`, return cached result.
   - miss → `applyRules(flat)`, `buildResult(flat)`, LRU enforce (`cache.size >= 100` → drop oldest = `keys().next().value`), store cache + registry entry (`scope`/`fullPrefix`/`media`/`host` from `resolveVarsOptions`; `media` and `host` are part of the options hash, so same-vars/different-media or different-host dedups into separate entries), `refCount = 1`.
5. **Reactive** (`hasFns`):
   - same `vars` ref seen before → `refCount++`, re-`applyRules`, return the **same** result object (`varsResultReactive`). A differing resolved `scope`/`prefix`/`media`/`host` throws before any stray rule is written.
   - new ref → `applyRules(flat)`, `buildResult(flat)`, `run = () => { const { flat } = flattenVars(vars); applyRules(flat, options) }` (fresh flat each run), `cleanup = createVarsEffect(run)`, store registry + result entries, `refCount = 1`.
6. Result is populated immediately in both paths (no effect await).

**Why the reactive result is stable** — `buildResult` only reads the flat **keys** (structure) to emit `var(--…)` strings; live **values** reach the sheet only via `applyRules` writing into `scopedVarsRulesMap`. The returned proxy therefore never mutates; signal writes update the CSSOM/scope map, not the object.

`applyRules(flat, resolved)` — takes `resolveVarsOptions(options)` output (`{ scope, fullPrefix, media, host }`); merge each flat key into the `varsBucketKey(scope, media, host)` bucket as `${fullPrefix}${key}`; rebuild via `varsRuleText(scope, media, …)` and `upsertRule(VARS_ID, bucketKey, …, host)` (no space after `:`).

`buildResult(flat, fullPrefix)`: reconstructs the nested shape from dot-keys; every leaf → `var(--${fullPrefix}${key with dots→hyphens})`.

Server branch (in `vars`): the same `applyRules` + `buildResult` as the client — the only difference is that `upsertRule` no-ops without a document. `varsText()` (in `internal/vars.ts`) serializes default-host buckets for `cssText()` — `varsRuleText(bucket.scope, bucket.media, serializeDecls(bucket.vars))`, media-wrapped when set, in bucket insertion order.

## Non-obvious behaviors

Highest-signal gotchas; verify any change against these:

- **Two style elements, one write path** — `hella-css` and `hella-vars` are separate `<style>` elements, but neither is textContent-managed in steady state: all writes go through `upsertRule`/`removeRule` against `el.sheet`. `resetSheet` is the only place that clears `textContent` (reset-to-pristine).
- **Rejected rules skip with a console.warn** — `upsertRule` wraps `insertRule`/`deleteRule`/cssText-access in try/catch; a rule the platform refuses to insert (e.g. `@layer` under happy-dom) is skipped from the CSSOM with `` console.warn(`[css] rule rejected by the platform and skipped: ${rule}`) `` — only the two `insertRule` catches warn; `deleteRule`/cssText catches are recovery paths and stay silent. There is no textContent mirror, so a skipped rule is still invisible to sheet-reading tests (assert such compositions via the server text return instead). A failed `insertRule` formerly left a phantom `indexMap` entry, causing subsequent rules to be injected at a stale index and corrupting the sheet; now `indexMap.set` runs only on successful `insertRule`. Both the new-rule and update paths follow the same discipline — `indexMap.delete(ruleKey)` clears before the `deleteRule`/`insertRule` try-chain and `indexMap.set` re-runs only inside the successful-`insertRule` try, so a rejected update leaves no stale entry. Every successful `deleteRule` then rebases: `rebaseIndexes(qid, index)` decrements each same-sheet entry above the removed index (scope is the qualified `${qid}:` prefix — the other sheet id and other hosts never shift), keeping multi-rule `removeCss` and interleaved removals exact; a throwing `deleteRule` shifted nothing, so its catch skips the rebase. The update path rebases a rejected re-insert iff its `deleteRule` succeeded — the delete left a hole the failed insert never refilled (unreachable via the public API under happy-dom; the sole uncovered pair in `bun coverage css`).
- **Static writes sync, reactive writes scheduled** — `css()` writes the sheet synchronously; `vars()` reactive leaves are core effects, so writes inside `batch()` update the sheet when the batch flushes (use bare `flush()` in tests).
- **Reactive keyed by reference, static by hash** — repeat `vars(sameRef)` returns the same result object and bumps refCount; structurally-equal static objects collide by hash. `removeVars` checks reactive (by ref) **first**, then static (by hash).
- **Reactive repeat-ref + differing options throws** — a second `vars(sameRef, {scoped|prefix|media|host})` whose resolved scope/prefix/media/host differs from the first throws `[css] vars: …` before any stray scope rule is written; reactive entries are one-per-object-reference. The static path remains keyed by `hash(vars+options+hostQualifier)` and supports differing options across distinct calls.
- **Global default** — `css(obj)` injects unwrapped and returns `""`; `name: ""` is also global (`!name`).
- **Conditional at-rules inherit any active selector** — under a `name`, `@media`/`@container`/`@supports`/`@starting-style` bodies use that selector; nested under a plain selector, they compose with it. With no selector in scope, a body containing direct declarations throws; null-only bodies emit an empty at-rule. `&` and descendant composition work inside them.
- **Definitional at-rules stay global** — `@keyframes`, `@font-face`, `@layer`, `@import` never pick up `.{name}`, even when `name` is set.
- **vars default scope `:root`** — `scoped` overrides to any selector; `prefix` appends `${prefix}-` (trailing hyphen auto-inserted); `media` interpolates verbatim (no validation, matching `scoped`'s permissive contract).
- **Composite scope+media buckets** — `scopedVarsRulesMap` keys and CSSOM rule keys are the composite `@media …|scope` (`varsBucketKey`): the same scope under different `media` coexists as separate rules, each bucket merging/accumulating independently. With no `media` the emitted rule text is byte-identical to the pre-media form — the option is invisible to no-media callers.
- **Host-qualified registries, per-id hosted sheets** — every registry keyed by cssText or scope embeds `hostQualifier(host)` (`injectedMap` key prefix, `varsBucketKey` prefix, static-vars hash suffix, `indexMap` via `sheetKey`), so the same text/scope in two hosts never dedups into one sheet. The `""` default keeps every no-host key byte-identical. Hosted `<style>` elements are one per sheet id inside the host (css and vars indexes never share a `cssRules` list), carry no id attribute, and live in per-id `WeakMap<ParentNode, CSSStyleSheet>` registries — `resetSheet(id)` drops that id's registry entry (hosted sheets are **abandoned**, not cleared: their `<style>` elements keep their rules; the registry is lazily re-created on the next hosted call) and deletes all `${id}#` indexMap entries. `hostIds` serials are never reset, so a host re-registered after a reset reuses its key space; a discarded host's WeakMap entries drop automatically.
- **`:root` is inert inside a shadow root** — a hosted `vars()` still defaults to `:root`, which matches nothing inside a `ShadowRoot`; pair `host` with `scoped: ':host'` (the documented pattern). A reactive vars object is one-per-reference across hosts too: re-registering the same reference under a different `host` throws (same class as differing `scoped`/`prefix`/`media`).
- **Dots → hyphens** — `colors.primary` → `--colors-primary` (`DOT_REGEX = /\./g` on both apply and result paths).
- **Scope accumulation** — multiple `vars()` to one scope+media bucket merge; `removeVars` removes only that call's flatKeys; the bucket rule is dropped entirely when its map empties.
- **`removeVars` no-op for unknown** input; reactive removal disposes the effect (later signal writes don't touch the sheet).
- **Unified registration / platform-independent returns** — `css()`/`style()`/`keyframes()`/`vars()` register on both platforms (sheet writes are the only DOM-gated step) and return `name || ""` / the class / the animation name / the `var()` proxy everywhere; `cssText()` collects default-host text for the server's `<style>` (css-side rules first, then the vars contribution). `removeStyle`/`removeKeyframes` decrement registration on the server too (sheet ops no-op); `removeCss`/`removeVars` keep their full `!hasDocument()` no-op.
- **Keyframes identity is canonicalized** — `keyframesRule` key-sorts the object recursively before hashing and processing, so structurally equal definitions in any key order register ONE rule under ONE name (the hash is order-independent by `stringify`; without canonicalization the emitted text would be insertion-ordered and the same name could carry two rules).
- **Throws wording differs by family** — css/removeCss/keyframes/removeKeyframes: `[css] <fn>: expected a CSS object, received …`; vars/removeVars: `[css] <fn>: expected a plain object, received …`; both families additionally share process()'s conditional-at-rule throw: `[css] conditional at-rule "<key>" contains declarations with no selector — nest selectors under it or use the name option` and function-value throw: `[css] function values are not supported in css objects — use vars() for reactive values, key: <key>` (both fire in `css` and `removeCss`, client and server).
- **Reset isolation** — `resetCss` touches only css-side state (4 maps + `hella-css` sheet; includes keyframes registrations); `resetVars` touches only vars-side state (effects + maps + `hella-vars` sheet + replaces the two reactive WeakMaps, since WeakMap entries can't be enumerated).
- **Lazy style elements** — `<style id="hella-css"|"hella-vars">` created by `getSheet()` on first write; `resetSheet` clears content but leaves the element in the DOM.

## Performance

- **Text-keyed dedup** — `injectedMap.get(qualifiedText)` gives O(1) return for repeat `css()`/`style()` calls; `count` still increments on hits. `process()` always runs (text is the identity), replacing the former `stringify`+`hash` cacheKey. The `style()` class hash is a separate, cheaper derivation (`scopedClassName` hashes the object only, not the emitted text).
- **Reference counting** — inject once, remove from CSSOM at zero refs.
- **Static fast path** — `hasFns === false` skips effect creation entirely.
- **LRU (static vars)** — `cache` capped at 100; access promotes via delete+set (protects from eviction); insertion at capacity evicts the oldest key.
- **Deterministic keys** — `stringify` sorts keys recursively so key-order-independent objects collide; DJB2 → base36 hash.
- **Surgical CSSOM** — `upsertRule` early-returns when the existing rule's `cssText` is unchanged; `indexMap` (keyed `${id}:${key}`) avoids full-sheet rewrites; delete-time rebasing (cold O(entries) walk) keeps stored indexes exact so removals stay surgical without sheet rebuilds.
- **While-loops with cached length** throughout hot paths.

## Testing

- Import from `@hellajs/css/bundle`; `beforeEach` runs `resetTestState()`.
- Assert via `getStylesheet('hella-css' | 'hella-vars')` from `@utils/test-helpers.js` — the live `sheet.cssRules` joined and squeezed to the no-space form the package inserts (vars included: `--k:v`). When patching `globalThis.document` for server-text asserts, capture the return value and restore the global **before** asserting — a throwing `expect` must not leak the patch into sibling tests.
- happy-dom rejects or under-serializes some at-rules (`@layer`/`@starting-style` rejected, `@font-face` serialized as an empty block) — assert those compositions via the server text return (same `process()` derivation), not the CSSOM. Rejected inserts warn (the behavior `sheet-warn.test.ts` pins); `css-at-rules.test.ts` runs the whole file under `suppressConsole()` to keep that noise out of test output.
- `css.test.ts` — global/scoped, `&` (incl. multiple `&`), descendants, null/undefined skip, array join, number values, `content` auto-quote, ref counting, cache reuse, `removeCss` no-op, multi-rule/interleaved `removeCss` exact-form removal, `resetCss`, `test.each` input validation.
- `style.test.ts` — hashed class + exact-form injection, determinism (key-order independence, label vs no-label), label sanitization (invalid chars, empty-after-sanitize), refcount + `removeStyle` (above zero / at zero / unknown), nesting under the class (`&` all occurrences, descendants, conditional at-rules inherit, `@keyframes` stays global), value semantics spot-checks, function-leaf throw, `test.each` input validation, string-base non-object throw.
- `style-compose.test.ts` — string base prefixes verbatim; object base deep-merges into one class (override wins, nested merge, array replace).
- `cva.test.ts` — recipe basics: creation injects nothing (laziness), base-only / no-base resolution, config-order join, defaultVariants fill + override, compound match (incl. `{ initial }`-stated + string-css compounds) vs partial non-match, compile-time compound-key rejection (`@ts-expect-error`), verbatim string base/variants, first-call exact injection, repeat-call dedup + identical string, server parity (try/finally document patch — classes + `cssText` captured before restore), `removeStyle` symmetry, config/props/value validation throws.
- `cva-responsive.test.ts` — `media` config: `{ initial, [bp] }` emits un-wrapped + `@media`-wrapped (exact rule forms), same value at initial+bp emits one class + both rules, default fills a missing initial, bp-stated compound match/unmet skip, unknown-breakpoint throw (runtime + `@ts-expect-error` compile probe wrapped in `toThrow()`).
- `cx.test.ts` — string/number join, falsy drop, truthy-keyed objects (incl. `{}`), nested-array flatten (incl. objects in arrays), empty → `""`. Pure — no `resetTestState` needed.
- `csstext.test.ts` — empty before any call, css globals + style rules in call order, full composition (css + style + keyframes + vars, css-side order then vars), media-wrapped vars, `resetVars` clears only the vars contribution, hosted exclusion (css + vars), `resetCss` clears, peek-never-drains.
- `helpers.ts` — `createShadowHost()` (shared by `style.test.ts` + `style-host.test.ts`).
- `css-at-rules.test.ts` — every `@`-rule with the conditional-vs-definitional split (scoped `@media`/`@container`/`@supports`/`@starting-style` inherit; `@keyframes`/`@font-face`/`@layer` stay global even with `name`); failed-insertRule phantom-indexMap regression pair (file runs under `suppressConsole()`).
- `sheet-warn.test.ts` — platform-rejection warn surface: a happy-dom-rejected `@layer` insert warns with the rule text (mocked `console.warn`), an accepted insert does not warn, `removeCss` of a rejected rule stays silent.
- `keyframes.test.ts` — hashed `h-kf-` name, exact rule injection (percent steps via CSSOM), from/to exact form via `cssText()` + the happy-dom `from`→`0%` CSSOM re-serialization, key-order-independent repeat call (one rule, same name), `style({ animation })` composition, `removeKeyframes` refcount/zero-drop/unknown no-op, input validation.
- `vars.test.ts` — static caching, deep nesting, signal/computed/batched updates, mixed static+reactive, multi-call accumulation, independent reactive updates, effect cleanup on reset, **LRU eviction + promotion-on-access**, input validation.
- `vars-scoped.test.ts` — class/ID selectors, prefix, scoped+prefix, multi-scope accumulation, reactive scoped, options-hash caching.
- `vars-media.test.ts` — `media` option: at-rule-wrapped static/reactive emission (exact CSSOM form), media+scoped+prefix composition, same-scope different-media coexistence, bucket-isolated `removeVars`, differing-media reactive throw, server proxy + `cssText()` media-wrapped carry.
- `style-host.test.ts` — `host` option: per-host `<style>` creation (not `document.head`), same-text two-host independence with per-host refcounts, hosted `removeCss` at zero refs (incl. multi-rule then single-rule text in one host), hosted `vars` + `:host` composition, exact-form default-path asserts, `resetCss` after hosted injection (no throw), reactive same-ref different-host throw. Reads hosted sheets via `getHostStylesheet` from `@utils/test-helpers.js`.
- `vars-flatten.test.ts` — static flatten, nested fn resolution, mixed deep nesting, dot→hyphen keys.
- `vars-types.test.ts` — compile-time type rejections (boolean / Date / boolean-returning fn); acceptance of string/number/string-fn/nested; leaf type is `string`.
- `vars-remove.test.ts` — static removal, ref counting (3 calls → 3 removes), reactive effect disposal, shared-scope partial removal, scoped/prefixed removal, sequential scoped-bucket removal exactness, reactive refCount (2 calls → 1 remove leaves effect active), no-op unknown, input validation.
- `ssr.test.ts` — platform-independent registration: unsets `globalThis.document` (save in `beforeEach`, restore in `afterEach`); css returns `""`/`name` + style returns the class (never text), `cssText()` returns the exact would-be-injected text, `vars()` returns the proxy (fn leaves resolved exactly once via `mock`, no effects — signal writes leave `cssText()` unchanged), `keyframes()` name + rule carry, no DOM injection, `removeCss`/`removeVars` no-ops, `removeStyle` decrements server registration, `resetCss`/`resetVars` don't throw.

Run with `bun coverage css`.

Follow `guides/code.md` for source and `guides/tests.md` for tests; both supersede any style hint here.
