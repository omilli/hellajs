<babel-plugin>

Build-time Babel transform (`babel-plugin-hellajs`) that compiles JSX into HellaNode object expressions and `component(...)` calls. Entry point: `index.mjs` — `babelHellaJS(babel, options)` returns `{ inherits: jsxSyntax, visitor }`.

**Wrapper-owned option contract.** The plugin takes ONE option, `{ target = "ast" }`. The target is build-environment config set by the vite/rollup/astro wrappers, never user-configurable per file. Options validate at plugin construction: a non-object options value, an unknown key, or a target outside `{ "ast", "dom" }` throws immediately (not at transform). `"ast"` (default) keeps the historical emission byte-identical; `"dom"` lowers element/fragment JSX to imperative `@hellajs/dom/runtime` construction (§Imperative emission). Babel calls plugin functions as `(babelCoreModule, userOptions)` — user options are the SECOND argument; the wrappers validate eagerly by calling `babelHellaJS(undefined, pluginOptions)` at construction so bad config fails before the build's first transform.

## Mental model

- **JSX path**: `JSXElement` / `JSXFragment` visitors walk Babel's parsed JSX AST and `path.replaceWith` either a HellaNode object expression, a `component(Tag, props)` call, a passthrough `Tag(props)` call, or — under `target: "dom"` — an imperative `mark(...)` construction site (§Imperative emission).
- **Attribute categorization** splits into **five** categories (see table below).
- **Components are wrapped with `component(Tag, props)`** — `component` is auto-imported from `@hellajs/dom`. Three passthrough components (`ForEach`, `Portal`, `Lazy`) bypass the wrapper and call `Tag(props)` directly.
- **The two targets share one pipeline** — component detection, passthrough handling, attribute/child processors, feature collection, and fragment dispatch are identical; only element/fragment expression emission differs (`buildHellaNode` vs `buildImperativeSite`). Drift between targets is the top maintenance risk; the shared processors are the control.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Plugin entry; parses/validates `{ target }` (throws on unknown keys/invalid values at construction); spreads the JSX visitors; inherits `@babel/plugin-syntax-jsx`. |
| `src/transformers/jsx.mjs` | `Program` exit (feature-import + `@hellajs/dom/runtime` import emission) + `JSXElement` + `JSXFragment` visitors; tag-type dispatch (component / element / fragment); per-file feature collection; `target: "dom"` routes element/fragment sites to the imperative builder (components and the ast paths verbatim). |
| `src/processors/attributes.mjs` | `processAttributes`: prefix categorization, `JSXExpressionContainer` unwrap, camelCase→kebab conversion, element-path `maybeReactive` application; reports the `features` flags (`hooks`/`errors`/`direct`/`routed`) alongside the buckets. |
| `src/processors/children.mjs` | `filterEmptyChildren`: drops empty/whitespace text + JSXEmptyExpression, normalizes whitespace, marks bare `props.children` as a SpreadElement. |
| `src/builders/children.mjs` | `buildChildrenValue`: children list → array expression (joined when all-static); any SpreadElement flips the whole list to an `[].concat(...)` call so passthrough children are safe for every `HellaChildren` shape. |
| `src/builders/vnode.mjs` | `buildHellaNode`: emits object expression with `tag` + non-empty category fields + `buildChildrenValue` children. |
| `src/builders/component.mjs` | `buildComponentCall`: emits `component(Tag, props)` or passthrough `Tag(props)`; merges children into props. |
| `src/builders/imperative.mjs` | `buildImperativeSite` (target: "dom"): one element/fragment JSX site → hoisted `template()`/`fragment()` const + `mark()`ed build fn over `@hellajs/dom/runtime` calls; owns template-HTML serialization (literal-prop folding, void/raw-text tags, entity escaping), the leading-static-prefix fold boundary, anchor child-index paths, root `key` extraction, the `errorConfig` named-fn self-reference, and the svg/math ancestry thread (nested foreign-interior sites emit the parse-namespace URI as the template/fragment call's second argument; `foreignObject` resets the thread); returns the `mark(...)` call plus the site's feature flags. |
| `src/utils/imports.mjs` | `ensureNamedImport` + `ensureSideEffectImport` + helpers (`ensureCreateComponentImport`, `ensureForEachImport`, `ensurePortalImport`, `ensureLazyImport`, `ensure{Hooks,Errors,DirectEvents,Namespaces,CustomElements}FeatureImport`) + `ensureRuntimeImport` (`@hellajs/dom/runtime` named imports in the canonical helper order). |
| `src/utils/passthrough.mjs` | `PASSTHROUGH_INJECTORS` map: passthrough tag name → its `ensure*Import` helper, keyed off `PASSTHROUGH_NAMES`. |
| `src/utils/babel.mjs` | `getTagCallee`: JSXIdentifier → Identifier; JSXMemberExpression → MemberExpression (recursive); throws otherwise. |
| `src/constants.mjs` | `FRAGMENT_TAG = '$'`, `PASSTHROUGH_NAMES`. |
| `src/utils/reactive.mjs` | `maybeReactive(t, expr)` + `containsCall`: auto-wrap heuristic — wraps a call-containing expression in `() => expr` for reactivity (skip if top-level is already a function = the double-wrap guard; skip a top-level `raw()` call — a value sentinel, not a reactive read). Applied to element children and element attribute values. |
| `src/utils/static.mjs` | Static-subtree hoisting: `tryBuildStaticJSX` (raw-JSX predicate + builder, reuses `processAttributes`/`filterEmptyChildren` for normalization parity), `hoistStaticJSX`, `hoistVNode` (`program.scope.push` const), `isLiteralValue` (exported — the dom target's template folding reuses the same literal rule). |

## Visitor pipeline

<visitor-pipeline>
**`JSXElement`** (JSXElement visitor in `createJSXTransformers`, `src/transformers/jsx.mjs`) — runs in this order:

1. **Resolve callee** — `getTagCallee(t, opening.name)`; throws `[babel-plugin-hellajs] getTagCallee: unsupported JSX tag name, received <type>` on anything but JSXIdentifier / JSXMemberExpression.
2. **Component detection** — `isComponent = (JSXIdentifier && first char uppercase) || JSXMemberExpression`. `<UI.Button>` and `<App.Components.Button>` both qualify.
3. **Categorize attrs** — `processAttributes(t, opening.attributes, isComponent)` returns `{ props, on, hooks, e, error, features }` (five arrays plus feature flags, possibly all empty/false).
4. **Filter children** — `filterEmptyChildren(t, path.node.children, isComponent)`; JSXText whitespace-collapsed, comments dropped, bare `props.children` marked as a SpreadElement.
5. **Branch**:
   - **Component** — find program parent. If `tagName ∈ {ForEach, Portal, Lazy}` inject matching import and emit `Tag(props)` via `buildComponentCall` (passthrough). Otherwise inject `component` from `@hellajs/dom` and emit `component(Tag, props)`. **All five category arrays are flattened back into a single props object** — components never receive `on` / `hooks` / `e` / `error` fields.
   - **Element** — **static-hoist first**: `hoistStaticJSX` attempts to build the whole subtree as a `static: true` object literal; on success it is pushed to a module-level `_hellaStatic` const (via `program.scope.push`, declared before first use) and the JSX is replaced by the identifier — the normal pipeline (and the children traversal) is skipped entirely. Otherwise `buildHellaNode(t, tag, props, on, e, hooks, children, error)`. `<style>` is a regular element (tag: `"style"`), not special-cased.

**Static-hoist safety rules**: lowercase string tag (element or `$` fragment); NO `on:`/`e:`/`hook:`/`error:` attributes at all; props limited to string/number/boolean literals (no spreads, no expressions); children limited to static text and other fully-static elements. Components, member-expression tags, slots, and anything `maybeReactive` would wrap are excluded by construction. Static children of a disqualified parent hoist individually at their own visit. Both root kinds dispose correctly: `component()` spreads a `static` root into a fresh per-invocation node and chains its scope onto any inner scope the node carries, and the scope is wired into every mount — element roots onto the element, `$` fragment roots onto a swap-stable carrier: the last child on the mount paths (mount anchors trail their content) and the first region node on hydrate adopt (hydrate anchors lead; staticDom clone included; empty fragments dispose at mount).

**`JSXFragment`** (JSXFragment visitor in `createJSXTransformers`, `src/transformers/jsx.mjs`) — ast target: `buildHellaNode(t, '$', [], [], [], [], children, [])`. Fragment nodes have no attributes (empty props/on/e/hooks/error). Under `target: "dom"` both visitors route to the imperative builder instead (§Imperative emission); the site builder reports the prefixed-attr features its elements carried, and the visitor collects them (folded descendants never get their own visitor call, so per-site collection replaces the per-visit collection the ast path gets).
</visitor-pipeline>

## Imperative emission (target: "dom")

`buildImperativeSite` (`src/builders/imperative.mjs`) lowers one element/fragment JSX expression to a `mark(...)` call (emitted under its aliased uid local, e.g. `_hellaMark` — every runtime helper imports as `text as _hellaText`-style so bare user variables like a `text` prop can never shadow the import) over a hoisted `template("…")`/`fragment("…", ns?)` const (uid names `_hellaTpl` / `_hellaFrag` / `_hellaBuild`, pushed onto program scope — scope merges them into one declaration at the top of the output, ahead of the exit-unshifted imports). EVERY element expression is marked — uniform, no position analysis; `mark` is an `Object.assign`. The build body is `const _hellaRoot = _hellaTpl(); <wiring calls in document order>; return _hellaRoot;` — `template()` state-inits the clone before returning, so the calls never need ordering.

- **Fold rules** — compile-time literal props (minus the property-assigned keys `value`/`checked`/`selected`/`innerHTML`, which keep renderProp's property semantics as `prop()` sites) fold into the template html (`true` → bare attribute, `false`/`null` → omitted: parser absence ≡ renderProp's removeAttribute). Children fold only up to the FIRST dynamic child; after it every child emits as a runtime call (static text → `text`, static subtrees → nested marked sites, expressions → `text`/`child` by whether the expression contains element JSX). Runtime appends land after the folded prefix, so node order is preserved. Full-static subtrees (the `tryBuildStaticJSX` oracle, minus property keys) produce a bare create build fn — zero runtime calls in the body.
- **Dynamic sites, in document order** — expression props → `prop(anchor, "k", <maybeReactive'd value>)`; `on:x` → `on(anchor, "x", h)`; `e:x` → `direct(anchor, "x", h)` + direct-events feature; `hook:x` → `hook(anchor, "x", h)` + hooks feature; `error:*` → `errorConfig(anchor, { … }, _hellaBuild)` + errors feature (the build fn is a NAMED function expression so the reset slot self-references without hoisting); dynamic children → `text(anchor, v)` for text-valued positions, `child(anchor, v)` otherwise (nested element JSX inside child expressions is replaced by its own marked site when babel re-traverses the replacement). Anchors address folded structure by child-index member expressions: index 0 → `firstElementChild`, else `children[n]` (element indices — static text never creates elements, dynamic children are omitted from the template).
- **Root `key`** — spliced from the root's attributes into `mark(fn, { key })` metadata: renderProp never renders `key` and `ForEach` reads flagged-fn `props.key`; folding it would mint a real attribute no walker ever created. Keys on descendants are dropped (inert metadata). A root key never folds into html.
- **Spreads** — `{...rest}` on an element emits `Object.keys(rest).forEach(k => prop(anchor, k, rest[k]))` so renderProp's per-key dispatch (property keys, falsy removal, reactive values) applies verbatim; `{props.children}` emits `child(anchor, props.children)` (`child` recurses arrays whole — no concat needed).
- **Serialization** — html entities escaped in text and double-quoted attribute values; void tags (`br`, `img`, `input`, …) serialize without an end tag (`</br>` would parse as a SECOND element); `style`/`script` children are raw text (escaping would corrupt css/js); whitespace normalization and data/aria kebab-casing reuse `filterEmptyChildren`/`processAttributes` verbatim.
- **Imports** — runtime helpers come from `@hellajs/dom/runtime` ONLY (never dom internals), listing exactly the helpers the file's emission used, in the canonical `RUNTIME_HELPERS` order; feature imports behave exactly as the ast target (a site rooted at svg/math carries its namespace through the html parse's native switch, and svg/math-interior NESTED sites — the ones after a dynamic boundary — emit the parse-namespace URI argument the runtime's tableless rebuild takes; component boundaries (ForEach `use`, Lazy loaders, Suspense children arrays) sever static ancestry, so those templates parse ns-less and re-create at insertion through dom's insertion-ns frame — the namespaces import stays emitted for svg/math either way).

## Attribute categories

Five prefixes route attrs into five arrays. The `processAttributes` check order is `error:` → `hook:` → `e:` → `on:` → props (prefixes are mutually exclusive lexically; order only matters for documentation).

| JSX prefix | Output object key (element / component) | Strip prefix | Semantics |
|---|---|---|---|
| `error:` | `error` / `props["error:x"]` | element yes; component keeps the verbatim key | Error-boundary config (e.g. `fallback`, `category`). |
| `hook:` | `hooks` (also renames `hook` → `hooks`) / `props["hook:x"]` | element yes; component keeps the verbatim key | Lifecycle hooks (`mount`, `update`, …). |
| `e:` | `e` / `props["e:x"]` | element yes; component keeps the verbatim key | **Direct (non-delegated) event handlers** — coexists with `on:` on the same element. |
| `on:` | `on` / `props["on:x"]` | element yes; component keeps the verbatim key | Delegated event handlers (capture-phase global delegation). |
| *(none)* | `props` | no | Regular prop. camelCase `data*` / `aria*` → kebab-case (`dataTestId` → `"data-test-id"`); `data-*` / `aria-*` / hyphenated / namespaced keys emitted as quoted string keys; spread (`{...x}`) → `t.spreadElement` into props only. |
| *(no value)* | (per prefix) | — | Boolean `true` (e.g. `<input required />`). Explicit `={false}` stays `false`. |

## Feature-import emission

Per file (the plugin instance is created per transform), each JSX element reports the dom feature modules its syntax needs; the `Program` exit emits one bare side-effect import per needed feature, idempotent per file and feature:

| Syntax | Feature import |
|---|---|
| `hook:` attr (element or component position) | `@hellajs/dom/features/hooks` |
| `error:` attr (element or component position) | `@hellajs/dom/features/errors` |
| `e:` attr (element or component position) | `@hellajs/dom/features/direct-events` |
| `svg` / `math` element tag (incl. inside a hoisted static subtree — the hoist skips child traversal, so `collectStaticFeatures` scans the pre-replacement node) | `@hellajs/dom/features/namespaces` |
| hyphenated element tag name (custom-element candidate; same pre-replacement scan covers folded subtrees, the visitor check covers dynamic elements) | `@hellajs/dom/features/custom-elements` |

`on:` emits nothing in any position (delegated events are core; a runtime-spread `on:` key routes through dom's `prop()`). `raw`/`onError`/`hydrate` named imports emit nothing (the API anchors load their features). Collection keys off the same prefixes `processAttributes` already buckets; emission order is fixed (hooks, errors, direct-events, namespaces, custom-elements) for deterministic output.

## Component detection and wrapping

- **Detection** — first-letter uppercase (`/^[A-Z]/`) OR `JSXMemberExpression`.
- **Wrap** — every non-passthrough component emits `component(Tag, props)` and triggers `ensureCreateComponentImport` (`import { component } from "@hellajs/dom"`). The wrapper manages automatic scope cleanup at runtime.
- **Passthroughs** — `ForEach`, `Portal`, `Lazy` emit `Tag(props)` directly (no `component(...)` wrap); each triggers its own named import from `@hellajs/dom`.

| Tag form | Emits | Import injected |
|---|---|---|
| `<Button />` | `component(Button, {})` | `component` |
| `<UI.Button />` | `component(UI.Button, {})` | `component` |
| `<ForEach ... />` | `ForEach({...})` | `ForEach` |
| `<Portal>...</Portal>` | `Portal({...})` | `Portal` |
| `<Lazy ... />` | `Lazy({...})` | `Lazy` |

## HellaNode output shape

Emitted by `buildHellaNode` (`src/builders/vnode.mjs`). **Each field after `tag` is included only when non-empty** — `<div />` produces just `{ tag: "div" }`. Fully-static subtrees are hoisted to module consts and carry `static: true` (see visitor pipeline).

| Field | Type | Source |
|---|---|---|
| `tag` | `string` | always; `'$'` for fragments. |
| `props` | object | non-empty regular props + spreads. |
| `on` | object | `on:`-prefixed (delegated events). |
| `e` | object | `e:`-prefixed (direct events). |
| `hooks` | object | `hook:`-prefixed. |
| `error` | object | `error:`-prefixed. |
| `children` | array | filtered children; if every child is a `StringLiteral` they are joined into one string inside a single-element array. |

For components, **all five category arrays are merged into a single `props` object** with prefixed attrs kept under verbatim string keys (`"on:click"`, `"hook:mount"`); the bucket arrays stay empty, so the `component(Tag, props)` call never carries bare `on` / `hooks` / `e` / `error` fields. The component forwards them by re-emitting the prefixed key onto an element; the runtime spread funnels every key through dom's `prop()`, whose four-family routing (`on:`/`e:`/`hook:`/`error:`) lands them on the same seams the explicit emission calls (`runtime.ts`, the `on`/`direct`/`hook` bodies plus a per-key `errorConfig` merge).

## Import injection

`ensureNamedImport(t, program, source, name)` either pushes a specifier onto an existing `ImportDeclaration` for `source` or `unshift`s a new declaration onto `program.node.body`. A binding of the required local name is ensured; aliased imports gain a fresh specifier (`import { component as c }` plus `<Button />` injects a second `component` specifier; `import { x as component }` injects nothing, the alias binds the name) — idempotent on local name. Emitted code references the local name (`component(...)`, `ForEach(...)`), so injection keys on it.

| Helper | Source | Name |
|---|---|---|
| `ensureCreateComponentImport` | `@hellajs/dom` | `component` |
| `ensureForEachImport` | `@hellajs/dom` | `ForEach` |
| `ensurePortalImport` | `@hellajs/dom` | `Portal` |
| `ensureLazyImport` | `@hellajs/dom` | `Lazy` |
| `ensureRuntimeImport` | `@hellajs/dom/runtime` | the helpers the file's dom-target emission used (canonical order: `template`, `fragment`, `mark`, `text`, `prop`, `on`, `direct`, `hook`, `errorConfig`, `child`), each aliased to its `_hella<Name>` uid local |

## Non-obvious behaviors

Grounded in tests — verify any change against these:

- **`component`, not `componentScope`** — wrap identifier is `component` from `@hellajs/dom`.
- **Plugin options are the SECOND argument** — babel calls plugin fns as `(babelCoreModule, userOptions)`; direct calls validate `options` only in that position (`babelHellaJS(undefined, { target })`). `undefined`/absent → `"ast"`.
- **Dom target: uniform marking + fold boundary** — every element expression is a `mark`ed build fn (no position analysis); literal props minus `value`/`checked`/`selected`/`innerHTML` fold into the template html; the leading static run of children folds, and the first dynamic child flips the rest to runtime calls in document order (`text`/`child`/nested sites). Root `key` moves to `mark` metadata. Spreads iterate per key through `prop()` at runtime. Goldens: `tests/imperative.test.ts`.
- **Passthroughs: `ForEach`, `Portal`, `Lazy`** — three names, single-sourced in `constants.mjs` (`PASSTHROUGH_NAMES` set) and `utils/passthrough.mjs` (`PASSTHROUGH_INJECTORS` map).
- **Five attribute categories** — `error:` and `e:` exist alongside `on:` / `hook:`.
- **`e:` vs `on:`** — direct vs delegated events; both can appear on the same element (`<div e:click={direct} on:click={delegated} />`).
- **`hook:` in, `hooks` out** — input prefix is singular `hook:`, output object key is plural `hooks`.
- **Component props flatten** — `<Button on:click={h} x={s} hook:mount={m} error:fallback={f} e:click={d} id="x" />` produces a single `props` object with `click`, `x`, `mount`, `fallback`, `click`, `id` keys (no nested `on`/`hooks`/etc.).
- **HellaNode field order** — `tag, props, on, e, hooks, error, children`; only `tag` is always present.
- **Static-children join** — when every child of an element or component is a `StringLiteral`, they are concatenated into one string inside a one-element array (vnode.mjs, component.mjs).
- **Auto-wrap of reactive expressions** — element **children AND attribute values** that contain a call (signal read, method call, derived array/ternary) are auto-wrapped into `() => expr` so dom's effect machinery tracks them (SolidJS-style compiled reactivity). For attributes this makes `class={signal()}`, `class={[active(), "base"]}`, and `class={cond() ? "a" : "b"}` reactive. **Excluded** (never wrapped): component children/props (a component may treat `props.x` as a plain value, not a function); prefixed keys (`on:` / `e:` / `hook:` / `error:` — handlers/hooks expect a function reference or render-time value, routed before the props branch); and any expression already a function at top level (double-wrap guard — an explicit `() => foo()` is emitted verbatim, else dom would stringify the inner arrow), or a top-level `raw()` call (a value sentinel — wrapping would turn the child into a getter region and change the marker shape and ssr classification; deeper `raw()` calls inside a larger expression still wrap). Heuristic: `src/utils/reactive.mjs`; applied in `processors/children.mjs` (JSX children, gated on `isComponent`) and `processors/attributes.mjs` (JSX element props, props branch only, gated on `isComponent`). Bare signal refs (`{signal}`) and bare identifiers are not call-containing and pass through unwrapped; static values and static arrays (no call) are likewise untouched.
- **`props.children` concat emission** — a bare `{props.children}` arrives as a SpreadElement marker (`filterEmptyChildren`); `buildChildrenValue` then emits the WHOLE children list as one `[].concat(parts…)` call (`props.children` splices flat, non-array children wrap as one-element arrays). Concat is contract-critical: a spread would split string children per-character (duplicating trailing siblings under hydration) and throw on single-vnode/null children. Plain lists keep the plain array form.
- **Whitespace normalization** — JSX text is whitespace-collapsed (`\s+` → single space) and dropped if `.trim()` is empty.
- **camelCase `data`/`aria`** — `dataTestId` → `"data-test-id"`, `ariaLabel` → `"aria-label"`; the kebab form is always emitted as a quoted string key.
- **Namespaced JSX names** — `xml:lang`, `xlink:href` become a single quoted string key (`"xml:lang"`).
- **Boolean attrs** — `<input required />` → `required: true`; explicit `={false}` stays `false`.
- **Member-expression tags** — `<UI.Button>` and arbitrarily nested `<A.B.C>` are components (recursive `getTagCallee`).

## Tests

Five files under `tests/`: `transform.test.ts` (full pipeline + `target` option parsing/validation + the no-options ast-default regression golden), `imperative.test.ts` (dom-target golden outputs: every emission rule of §Imperative emission), `processor.test.ts` (attribute/child processing), `builder.test.ts` (`buildHellaNode`, `buildComponentCall`), `tag-callee.test.ts` (`getTagCallee`). Suites under `plugins/vite/tests/` and `plugins/rollup/tests/` cover wrapper `{ target }` forwarding (vite's `transform` is async; rollup's `transform`/`load` are sync).

- **Helpers** — `transformJSX(code, options?)` runs `babel.transformSync` with `configFile: false` and the plugin (options forwarded as the babel tuple's second element); `normalize(output)` collapses whitespace for full-output equality asserts; `getNamedImports(code, source)` regex-extracts specifier names.
- **Style** — integration-style: most tests exercise the full transform and assert either `toContain` on substrings or `toBe` on `normalize()` output. Some tests import internals directly from `src/**/*.mjs` — a documented carveout (`guides/tests.md` §Test Coverage, `plugins/**` rule).
- **Run** — `vp run coverage babel` (the scoped plugin gate; tests import from source `index.mjs`, not `dist/`; vite/rollup need their own scoped runs — their `index.mjs` is coverage-excluded by design) + `vp run lint` for rules + type-check. **NEVER run a bare `vp test` against the full repo without scoping to the plugin path.**

## Performance notes (verified)

- `len` cached in `while` loops; static-string children joined into one literal at build time (avoids runtime array of strings).
- Fully-static subtrees hoist to a single module const, allocated once per site instead of per call.
- All hot paths avoid `JSON.parse` / `eval` / closures-per-node.
