---
applyTo: "plugins/babel/**"
---

<babel-plugin>

Build-time Babel transform (`babel-plugin-hellajs`) that compiles JSX and `html\`\`` tagged templates into HellaNode object expressions and `component(...)` calls. Entry point: `index.mjs` — `babelHellaJS()` returns `{ inherits: jsxSyntax, visitor }`. **No config options**; signature takes no parameters.

## Mental model

- **JSX path**: `JSXElement` / `JSXFragment` visitors walk Babel's parsed JSX AST and `path.replaceWith` either a HellaNode object expression, a `component(Tag, props)` call, or a passthrough `Tag(props)` call.
- **`html\`\`` path**: `TaggedTemplateExpression` visitor (only when `tag.name === 'html'`) parses the template string into an intermediate AST, then converts it to the same Babel AST the JSX path emits. Single regex tokenizer + stack-based parser; expressions become `__SLOT_N__` markers during parsing and are substituted during AST conversion.
- **Attribute categorization is shared** by both paths but splits into **six** categories (see table below).
- **Components are wrapped with `component(Tag, props)`** — `component` is auto-imported from `@hellajs/dom`. Three passthrough components (`ForEach`, `Portal`, `Lazy`) bypass the wrapper and call `Tag(props)` directly.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Plugin entry; merges JSX + component visitors; inherits `@babel/plugin-syntax-jsx`. |
| `src/transformers/jsx.mjs` | `JSXElement` + `JSXFragment` visitors; tag-type dispatch (component / element / fragment). |
| `src/transformers/component.mjs` | `TaggedTemplateExpression` visitor for `html\`\``; orchestrates parse → ensure imports → convert → replace. |
| `src/parsers/html.mjs` | `parseHTML` + `parseHTMLComponent`: strip comments/DOCTYPE/CDATA, tokenize via single regex, stack-based nest tracking, fragment normalization. |
| `src/parsers/attributes.mjs` | `parseAttributes`: regex over attribute string; handles double/single/unquoted values + `__SLOT_N__` markers + mixed-content arrays. |
| `src/parsers/text.mjs` | `parseTextContent`: splits text on `__SLOT_N__` markers, preserving text before/after/between. |
| `src/processors/attributes.mjs` | `processAttributes` (JSX) + `processComponentAttributes` (html\`\``); prefix categorization + camelCase→kebab conversion. |
| `src/processors/children.mjs` | `filterEmptyChildren`: drops empty/whitespace text + JSXEmptyExpression, normalizes whitespace, spreads `props.children`. |
| `src/processors/values.mjs` | `processAttributeValue`: unwraps `JSXExpressionContainer`. |
| `src/builders/vnode.mjs` | `buildHellaNode`: emits object expression with `tag` + non-empty category fields + joined/static-array children. |
| `src/builders/component.mjs` | `buildComponentCall`: emits `component(Tag, props)` or passthrough `Tag(props)`; merges children into props. |
| `src/builders/ast.mjs` | `componentNodeToBabel`: intermediate AST → Babel AST; resolves slots, joins mixed content via `+`, recurses. |
| `src/utils/imports.mjs` | `ensureNamedImport` + helpers (`ensureCreateComponentImport`, `ensureForEachImport`, `ensurePortalImport`, `ensureLazyImport`). |
| `src/utils/traversal.mjs` | `findPassthroughComponents` (Set) + `containsComponent(node, excludeNames)`; recurses through intermediate AST. |
| `src/utils/babel.mjs` | `getTagCallee`: JSXIdentifier → Identifier; JSXMemberExpression → MemberExpression (recursive); throws otherwise. |
| `src/constants.mjs` | `FRAGMENT_TAG = '$'`. |
| `src/utils/reactive.mjs` | `maybeReactive(t, expr)` + `containsCall`: auto-wrap heuristic — wraps a call-containing expression in `() => expr` for reactivity (skip if top-level is already a function = the double-wrap guard). Applied to element children only. |

## Visitor pipeline

<visitor-pipeline>
**`JSXElement`** (`src/transformers/jsx.mjs:16`) — runs in this order:

1. **Resolve callee** — `getTagCallee(t, opening.name)`; throws `"Unsupported JSX tag type"` on anything but JSXIdentifier / JSXMemberExpression.
2. **Component detection** — `isComponent = (JSXIdentifier && first char uppercase) || JSXMemberExpression`. `<UI.Button>` and `<App.Components.Button>` both qualify.
3. **Categorize attrs** — `processAttributes(t, opening.attributes, isComponent)` returns `{ props, on, bind, hooks, e, error }` (six arrays, possibly all empty).
4. **Filter children** — `filterEmptyChildren(t, path.node.children, isComponent)`; JSXText whitespace-collapsed, comments dropped, `props.children` spread.
5. **Branch**:
   - **Component** — find program parent. If `tagName ∈ {ForEach, Portal, Lazy}` inject matching import and emit `Tag(props)` via `buildComponentCall` (passthrough). Otherwise inject `component` from `@hellajs/dom` and emit `component(Tag, props)`. **All six category arrays are flattened back into a single props object** — components never receive `on` / `bind` / `hooks` / `e` / `error` fields.
   - **Element** — `buildHellaNode(t, tag, props, on, e, bind, hooks, children, error)`. `<style>` is a regular element (tag: `"style"`), not special-cased.

**`JSXFragment`** (`src/transformers/jsx.mjs:52`) — `buildHellaNode(t, '$', [], [], [], [], [], children, [])`. Fragment nodes have no attributes (empty props/on/e/bind/hooks/error).

**`TaggedTemplateExpression`** (`src/transformers/component.mjs:12`) — only fires when `path.node.tag.name === 'html'`:

1. `parseHTMLComponent(quasis, expressions)` → intermediate AST (single node, or fragment `$` wrapping multiple roots, or bare `{ __slot }` if the entire template is one expression).
2. `findPassthroughComponents(ast)` → Set of `{ForEach, Portal, Lazy}` tag names present; ensure each import.
3. `containsComponent(ast, passthroughNames)` → if any uppercase or `__SLOT_N__` tag remains, `ensureCreateComponentImport`.
4. `componentNodeToBabel(t, ast, expressions)` → Babel AST; `path.replaceWith`.
</visitor-pipeline>

## Attribute categories

Five prefixes route attrs into five arrays. The `processAttributes` check order is `error:` → `hook:` → `e:` → `on:` → props (prefixes are mutually exclusive lexically; order only matters for documentation). `processComponentAttributes` (html\`\``) checks in a slightly different order but produces the same partition.

| JSX prefix | Output object key | Strip prefix | Semantics |
|---|---|---|---|
| `error:` | `error` | yes | Error-boundary config (e.g. `fallback`, `category`). |
| `hook:` | `hooks` | yes (also renames `hook` → `hooks`) | Lifecycle hooks (`mount`, `update`, …). |
| `e:` | `e` | yes | **Direct (non-delegated) event handlers** — coexists with `on:` on the same element. |
| `on:` | `on` | yes | Delegated event handlers (capture-phase global delegation). |
| *(none)* | `props` | no | Regular prop. camelCase `data*` / `aria*` → kebab-case (`dataTestId` → `"data-test-id"`); `data-*` / `aria-*` / hyphenated / namespaced keys emitted as quoted string keys; spread (`{...x}`) → `t.spreadElement` into props only. |
| *(no value)* | (per prefix) | — | Boolean `true` (e.g. `<input required />`). Explicit `={false}` stays `false`. |

## Component detection and wrapping

- **Detection** — first-letter uppercase (`/^[A-Z]/`) OR `JSXMemberExpression` OR (html\`\`` only) tag matches `/^__SLOT_\d+__$/` (dynamic `<${Comp}>`).
- **Wrap** — every non-passthrough component emits `component(Tag, props)` and triggers `ensureCreateComponentImport` (`import { component } from "@hellajs/dom"`). The wrapper manages automatic scope cleanup at runtime.
- **Passthroughs** — `ForEach`, `Portal`, `Lazy` emit `Tag(props)` directly (no `component(...)` wrap); each triggers its own named import from `@hellajs/dom`.

| Tag form | Emits | Import injected |
|---|---|---|
| `<Button />` | `component(Button, {})` | `component` |
| `<UI.Button />` | `component(UI.Button, {})` | `component` |
| `<ForEach ... />` | `ForEach({...})` | `ForEach` |
| `<Portal>...</Portal>` | `Portal({...})` | `Portal` |
| `<Lazy ... />` | `Lazy({...})` | `Lazy` |
| `html\`<${Comp}>...</${Comp}>\`` | `component(Comp, {...})` | `component` |

## Intermediate AST and slot resolution

<intermediate-ast>
A node is one of:

- `{ tag: string, props?: Record<string, any>, children?: HtmlNode[] }` — element/component.
- `{ __slot: number }` — slot marker (resolved to `expressions[N]` during conversion).
- `string` — text leaf (converted to `t.stringLiteral`).
- `Array<...>` — mixed content in an attribute value (joined with `binaryExpression('+', ...)`).

**Slot lifecycle** — `parseHTMLComponent` interleaves quasis with literal `__SLOT_N__` text markers, the regex parser leaves them in place, `parseAttributes` / `parseTextContent` produce `{ __slot: N }` objects, and `componentNodeToBabel` (`src/builders/ast.mjs`) resolves them to `expressions[N]`. Slot markers never reach the final Babel AST.

**Single-slot short-circuit** — if the entire template (trimmed) is `__SLOT_N__`, `parseHTML` returns `[{ __slot: N }]` directly so `html\`${expr}\`` becomes the bare expression, not a HellaNode.

**Multi-root wrapping** — multiple top-level elements are wrapped in `{ tag: '$', children: [...] }`.
</intermediate-ast>

## HellaNode output shape

Emitted by `buildHellaNode` (`src/builders/vnode.mjs`). **Each field after `tag` is included only when non-empty** — `<div />` produces just `{ tag: "div" }`.

| Field | Type | Source |
|---|---|---|
| `tag` | `string` | always; `'$'` for fragments. |
| `props` | object | non-empty regular props + spreads. |
| `on` | object | `on:`-prefixed (delegated events). |
| `e` | object | `e:`-prefixed (direct events). |
| `hooks` | object | `hook:`-prefixed. |
| `error` | object | `error:`-prefixed. |
| `children` | array | filtered children; if every child is a `StringLiteral` they are joined into one string inside a single-element array. |

For components, **all six category arrays are merged into a single `props` object** (prefix-stripped); the `component(Tag, props)` call never carries `on` / `bind` / `hooks` / `e` / `error` keys.

## Import injection

`ensureNamedImport(t, program, source, name)` either pushes a specifier onto an existing `ImportDeclaration` for `source` or `unshift`s a new declaration onto `program.node.body`. Existing imports are never duplicated (idempotent).

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
- **Component props flatten** — `<Button on:click={h} x={s} hook:mount={m} error:fallback={f} e:click={d} id="x" />` produces a single `props` object with `click`, `x`, `mount`, `fallback`, `click`, `id` keys (no nested `on`/`bind`/etc.).
- **HellaNode field order** — `tag, props, on, e, bind, hooks, error, children`; only `tag` is always present.
- **Static-children join** — when every child of an element or component is a `StringLiteral`, they are concatenated into one string inside a one-element array (vnode.mjs, component.mjs).
- **Auto-wrap of reactive expressions** — element **children AND attribute values** that contain a call (signal read, method call, derived array/ternary) are auto-wrapped into `() => expr` so dom's effect machinery tracks them (SolidJS-style compiled reactivity). For attributes this makes `class={signal()}`, `class={[active(), "base"]}`, and `class={cond() ? "a" : "b"}` reactive. **Excluded** (never wrapped): component children/props (a component may treat `props.x` as a plain value, not a function); prefixed keys (`on:` / `e:` / `hook:` / `error:` — handlers/hooks expect a function reference or render-time value, routed before the props branch); and any expression already a function at top level (double-wrap guard — an explicit `() => foo()` is emitted verbatim, else dom would stringify the inner arrow). Heuristic: `src/utils/reactive.mjs`; applied in `processors/children.mjs` (JSX children, gated on `isComponent`), `processors/attributes.mjs` (JSX element props, props branch only, gated on `isComponent`), and `builders/ast.mjs` (compiled-`html\`\`` element children + element attributes, gated on `isComponent`). Runtime `html\`\`` (`packages/dom/lib/html.ts`) receives evaluated values and cannot wrap — explicit `() => …` wrappers remain required there. Bare signal refs (`{signal}`) and bare identifiers are not call-containing and pass through unwrapped; static values and static arrays (no call) are likewise untouched.
- **`props.children` spread** — `{props.children}` in JSX becomes `...props.children` (spread element) inside the children array.
- **Whitespace normalization** — JSX text is whitespace-collapsed (`\s+` → single space) and dropped if `.trim()` is empty; HTML text is trimmed.
- **camelCase `data`/`aria`** — `dataTestId` → `"data-test-id"`, `ariaLabel` → `"aria-label"`; the kebab form is always emitted as a quoted string key.
- **Namespaced JSX names** — `xml:lang`, `xlink:href` become a single quoted string key (`"xml:lang"`).
- **HTML parser strips** — `<!-- … -->`, `<!DOCTYPE …>`, `<![CDATA[…]]>` removed before tokenizing.
- **HTML fragment syntax** — `<>…</>` rewritten to `<__fragment__>…</__fragment__>` then back to `tag: '$'`; fragment nodes get `props: {}` (no `parseAttributes` call).
- **HTML attribute quotes** — double, single, and unquoted values all parse; mixed content (`"prefix-${suffix}-tail"`) produces a `binaryExpression('+')` chain.
- **Boolean attrs** — `<input required />` → `required: true`; explicit `={false}` stays `false`.
- **Member-expression tags** — `<UI.Button>` and arbitrarily nested `<A.B.C>` are components (recursive `getTagCallee`).
- **Dynamic components in `html\`\``** — `<${Comp}>` becomes a node with `tag: "__SLOT_N__"`; `componentNodeToBabel` resolves it to the actual expression and wraps with `component(...)`.
- **Self-closing parsing** — `/>` with optional leading space (`<br />`).
- **Multi-root `html\`\``** — multiple top-level elements auto-wrapped in a `$` fragment.

## Tests

Six files under `tests/`: `transform.test.ts` (full pipeline), `processor.test.ts` (attribute/child/value processing), `builder.test.ts` (`buildHellaNode`, `buildComponentCall`, `componentNodeToBabel`), `parser.test.ts` (`parseHTML`, `parseHTMLComponent`, `parseAttributes`, `parseTextContent`), `tag-callee.test.ts` (`getTagCallee`), `traversal.test.ts` (`findPassthroughComponents`, `containsComponent`).

- **Helpers** — `transformJSX(code)` runs `babel.transformSync` with `configFile: false` and the plugin; `normalize(output)` collapses whitespace for full-output equality asserts; `getNamedImports(code, source)` regex-extracts specifier names.
- **Style** — integration-style: most tests exercise the full transform and assert either `toContain` on substrings or `toBe` on `normalize()` output. Some tests import internals directly from `src/**/*.mjs` — this is a documented carveout (see `guides/tests.md` §Coverage, `plugins/**` rule).
- **Run** — `bun test plugins/babel/tests` (tests import from source `index.mjs`, not `dist/`). `bun lint` covers typecheck + eslint. **NEVER run `bun test` alone against the full repo without scoping to the plugin path.**

## Performance notes (verified)

- Single-regex tokenizer for HTML (`/<(\/)?([\w-]*)([^>]*?)(\s*\/)?>|([^<]+)/g`); stack-based nesting (no recursion in the parser itself; recursion only in `componentNodeToBabel`).
- `len` cached in `while` loops; static-string children joined into one literal at build time (avoids runtime array of strings).
- Intermediate AST is built once and converted in a single pass; slot markers defer expression resolution so the parser never touches Babel nodes.
- All hot paths avoid `JSON.parse` / `eval` / closures-per-node.

</babel-plugin>
