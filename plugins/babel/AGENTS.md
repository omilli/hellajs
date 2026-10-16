<babel-plugin>

Build-time Babel transform (`babel-plugin-hellajs`) that compiles JSX into HellaNode object expressions and `component(...)` calls. Entry point: `index.mjs` — `babelHellaJS()` returns `{ inherits: jsxSyntax, visitor }`. **No config options**; signature takes no parameters.

## Mental model

- **JSX path**: `JSXElement` / `JSXFragment` visitors walk Babel's parsed JSX AST and `path.replaceWith` either a HellaNode object expression, a `component(Tag, props)` call, or a passthrough `Tag(props)` call.
- **Attribute categorization** splits into **five** categories (see table below).
- **Components are wrapped with `component(Tag, props)`** — `component` is auto-imported from `@hellajs/dom`. Three passthrough components (`ForEach`, `Portal`, `Lazy`) bypass the wrapper and call `Tag(props)` directly.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Plugin entry; spreads the JSX visitors; inherits `@babel/plugin-syntax-jsx`. |
| `src/transformers/jsx.mjs` | `JSXElement` + `JSXFragment` visitors; tag-type dispatch (component / element / fragment). |
| `src/processors/attributes.mjs` | `processAttributes`: prefix categorization, `JSXExpressionContainer` unwrap, camelCase→kebab conversion, element-path `maybeReactive` application. |
| `src/processors/children.mjs` | `filterEmptyChildren`: drops empty/whitespace text + JSXEmptyExpression, normalizes whitespace, marks bare `props.children` as a SpreadElement. |
| `src/builders/children.mjs` | `buildChildrenValue`: children list → array expression (joined when all-static); any SpreadElement flips the whole list to an `[].concat(...)` call so passthrough children are safe for every `HellaChildren` shape. |
| `src/builders/vnode.mjs` | `buildHellaNode`: emits object expression with `tag` + non-empty category fields + `buildChildrenValue` children. |
| `src/builders/component.mjs` | `buildComponentCall`: emits `component(Tag, props)` or passthrough `Tag(props)`; merges children into props. |
| `src/utils/imports.mjs` | `ensureNamedImport` + helpers (`ensureCreateComponentImport`, `ensureForEachImport`, `ensurePortalImport`, `ensureLazyImport`). |
| `src/utils/passthrough.mjs` | `PASSTHROUGH_INJECTORS` map: passthrough tag name → its `ensure*Import` helper, keyed off `PASSTHROUGH_NAMES`. |
| `src/utils/babel.mjs` | `getTagCallee`: JSXIdentifier → Identifier; JSXMemberExpression → MemberExpression (recursive); throws otherwise. |
| `src/constants.mjs` | `FRAGMENT_TAG = '$'`, `PASSTHROUGH_NAMES`. |
| `src/utils/reactive.mjs` | `maybeReactive(t, expr)` + `containsCall`: auto-wrap heuristic — wraps a call-containing expression in `() => expr` for reactivity (skip if top-level is already a function = the double-wrap guard; skip a top-level `raw()` call — a value sentinel, not a reactive read). Applied to element children and element attribute values. |
| `src/utils/static.mjs` | Static-subtree hoisting: `tryBuildStaticJSX` (raw-JSX predicate + builder, reuses `processAttributes`/`filterEmptyChildren` for normalization parity), `hoistStaticJSX`, `hoistVNode` (`program.scope.push` const). |

## Visitor pipeline

<visitor-pipeline>
**`JSXElement`** (JSXElement visitor in `createJSXTransformers`, `src/transformers/jsx.mjs`) — runs in this order:

1. **Resolve callee** — `getTagCallee(t, opening.name)`; throws `[babel-plugin-hellajs] getTagCallee: unsupported JSX tag name, received <type>` on anything but JSXIdentifier / JSXMemberExpression.
2. **Component detection** — `isComponent = (JSXIdentifier && first char uppercase) || JSXMemberExpression`. `<UI.Button>` and `<App.Components.Button>` both qualify.
3. **Categorize attrs** — `processAttributes(t, opening.attributes, isComponent)` returns `{ props, on, hooks, e, error }` (five arrays, possibly all empty).
4. **Filter children** — `filterEmptyChildren(t, path.node.children, isComponent)`; JSXText whitespace-collapsed, comments dropped, bare `props.children` marked as a SpreadElement.
5. **Branch**:
   - **Component** — find program parent. If `tagName ∈ {ForEach, Portal, Lazy}` inject matching import and emit `Tag(props)` via `buildComponentCall` (passthrough). Otherwise inject `component` from `@hellajs/dom` and emit `component(Tag, props)`. **All five category arrays are flattened back into a single props object** — components never receive `on` / `hooks` / `e` / `error` fields.
   - **Element** — **static-hoist first**: `hoistStaticJSX` attempts to build the whole subtree as a `static: true` object literal; on success it is pushed to a module-level `_hellaStatic` const (via `program.scope.push`, declared before first use) and the JSX is replaced by the identifier — the normal pipeline (and the children traversal) is skipped entirely. Otherwise `buildHellaNode(t, tag, props, on, e, hooks, children, error)`. `<style>` is a regular element (tag: `"style"`), not special-cased.

**Static-hoist safety rules**: lowercase string tag (element or `$` fragment); NO `on:`/`e:`/`hook:`/`error:` attributes at all; props limited to string/number/boolean literals (no spreads, no expressions); children limited to static text and other fully-static elements. Components, member-expression tags, slots, and anything `maybeReactive` would wrap are excluded by construction. Static children of a disqualified parent hoist individually at their own visit. Both root kinds dispose correctly: `component()` spreads a `static` root into a fresh per-invocation node and chains its scope onto any inner scope the node carries, and the scope is wired into every mount — element roots onto the element, `$` fragment roots onto a swap-stable carrier: the last child on the mount paths (mount anchors trail their content) and the first region node on hydrate adopt (hydrate anchors lead; staticDom clone included; empty fragments dispose at mount).

**`JSXFragment`** (JSXFragment visitor in `createJSXTransformers`, `src/transformers/jsx.mjs`) — `buildHellaNode(t, '$', [], [], [], [], children, [])`. Fragment nodes have no attributes (empty props/on/e/hooks/error).
</visitor-pipeline>

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

For components, **all five category arrays are merged into a single `props` object** with prefixed attrs kept under verbatim string keys (`"on:click"`, `"hook:mount"`); the bucket arrays stay empty, so the `component(Tag, props)` call never carries bare `on` / `hooks` / `e` / `error` fields. The component forwards them by re-emitting the prefixed key onto an element; dom's render/hydrate (`routePrefixedProps`) then slices them into live buckets.

## Import injection

`ensureNamedImport(t, program, source, name)` either pushes a specifier onto an existing `ImportDeclaration` for `source` or `unshift`s a new declaration onto `program.node.body`. A binding of the required local name is ensured; aliased imports gain a fresh specifier (`import { component as c }` plus `<Button />` injects a second `component` specifier; `import { x as component }` injects nothing, the alias binds the name) — idempotent on local name. Emitted code references the local name (`component(...)`, `ForEach(...)`), so injection keys on it.

| Helper | Source | Name |
|---|---|---|
| `ensureCreateComponentImport` | `@hellajs/dom` | `component` |
| `ensureForEachImport` | `@hellajs/dom` | `ForEach` |
| `ensurePortalImport` | `@hellajs/dom` | `Portal` |
| `ensureLazyImport` | `@hellajs/dom` | `Lazy` |

## Non-obvious behaviors

Grounded in tests — verify any change against these:

- **`component`, not `componentScope`** — wrap identifier is `component` from `@hellajs/dom`.
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

Four files under `tests/`: `transform.test.ts` (full pipeline), `processor.test.ts` (attribute/child processing), `builder.test.ts` (`buildHellaNode`, `buildComponentCall`), `tag-callee.test.ts` (`getTagCallee`).

- **Helpers** — `transformJSX(code)` runs `babel.transformSync` with `configFile: false` and the plugin; `normalize(output)` collapses whitespace for full-output equality asserts; `getNamedImports(code, source)` regex-extracts specifier names.
- **Style** — integration-style: most tests exercise the full transform and assert either `toContain` on substrings or `toBe` on `normalize()` output. Some tests import internals directly from `src/**/*.mjs` — a documented carveout (`guides/tests.md` §Test Coverage, `plugins/**` rule).
- **Run** — `vp run coverage babel` (the scoped plugin gate; tests import from source `index.mjs`, not `dist/`) + `vp run lint` for rules + type-check. **NEVER run a bare `vp test` against the full repo without scoping to the plugin path.**

## Performance notes (verified)

- `len` cached in `while` loops; static-string children joined into one literal at build time (avoids runtime array of strings).
- Fully-static subtrees hoist to a single module const, allocated once per site instead of per call.
- All hot paths avoid `JSON.parse` / `eval` / closures-per-node.
