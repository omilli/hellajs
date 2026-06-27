---
applyTo: "plugins/babel/**"
---

<babel-plugin>

Build-time Babel transform (`babel-plugin-hellajs`) that compiles JSX and `html\`\`` tagged templates into HellaNode object expressions and `component(...)` calls. Entry point: `index.mjs` — `babelHellaJS()` returns `{ inherits: jsxSyntax, visitor }`. **No config options**; signature takes no parameters.

## Mental model

- **JSX path**: `JSXElement` / `JSXFragment` visitors walk Babel's parsed JSX AST and `path.replaceWith` either a HellaNode object expression, a `component(Tag, props)` call, a passthrough `Tag(props)` call, or a `css(...)` call.
- **`html\`\`` path**: `TaggedTemplateExpression` visitor (only when `tag.name === 'html'`) parses the template string into an intermediate AST, then converts it to the same Babel AST the JSX path emits. Single regex tokenizer + stack-based parser; expressions become `__SLOT_N__` markers during parsing and are substituted during AST conversion.
- **Attribute categorization is shared** by both paths but splits into **six** categories (see table below).
- **Components are wrapped with `component(Tag, props)`** — `component` is auto-imported from `@hellajs/dom`. Three passthrough components (`ForEach`, `Portal`, `Lazy`) bypass the wrapper and call `Tag(props)` directly.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Plugin entry; merges JSX + component visitors; inherits `@babel/plugin-syntax-jsx`. |
| `src/transformers/jsx.mjs` | `JSXElement` + `JSXFragment` visitors; tag-type dispatch (style / component / element / fragment). |
| `src/transformers/component.mjs` | `TaggedTemplateExpression` visitor for `html\`\``; orchestrates parse → ensure imports → convert → replace. |
| `src/transformers/style.mjs` | `<style>` JSX → `css(styles, options?)` call; injects `css` import. |
| `src/parsers/html.mjs` | `parseHTML` + `parseHTMLComponent`: strip comments/DOCTYPE/CDATA, tokenize via single regex, stack-based nest tracking, fragment normalization. |
| `src/parsers/attributes.mjs` | `parseAttributes`: regex over attribute string; handles double/single/unquoted values + `__SLOT_N__` markers + mixed-content arrays. |
| `src/parsers/text.mjs` | `parseTextContent`: splits text on `__SLOT_N__` markers, preserving text before/after/between. |
| `src/processors/attributes.mjs` | `processAttributes` (JSX) + `processComponentAttributes` (html\`\``); prefix categorization + camelCase→kebab conversion. |
| `src/processors/children.mjs` | `filterEmptyChildren`: drops empty/whitespace text + JSXEmptyExpression, normalizes whitespace, spreads `props.children`. |
| `src/processors/values.mjs` | `processAttributeValue`: unwraps `JSXExpressionContainer`. |
| `src/builders/vnode.mjs` | `buildHellaNode`: emits object expression with `tag` + non-empty category fields + joined/static-array children. |
| `src/builders/component.mjs` | `buildComponentCall`: emits `component(Tag, props)` or passthrough `Tag(props)`; merges children into props. |
| `src/builders/ast.mjs` | `componentNodeToBabel`: intermediate AST → Babel AST; resolves slots, joins mixed content via `+`, recurses. |
| `src/utils/imports.mjs` | `ensureNamedImport` + helpers (`ensureCssImport`, `ensureCreateComponentImport`, `ensureForEachImport`, `ensurePortalImport`, `ensureLazyImport`). |
| `src/utils/traversal.mjs` | `findPassthroughComponents` (Set) + `containsComponent(node, excludeNames)`; recurses through intermediate AST. |
| `src/utils/babel.mjs` | `getTagCallee`: JSXIdentifier → Identifier; JSXMemberExpression → MemberExpression (recursive); throws otherwise. |
| `src/constants.mjs` | `FRAGMENT_TAG = '$'`. |

## Visitor pipeline

<visitor-pipeline>
**`JSXElement`** (`src/transformers/jsx.mjs:16`) — runs in this order, returns early on style:

1. **Style short-circuit** — if `opening.name` is JSXIdentifier `{ name: 'style' }` → `handleStyleTag(t, path, opening)` and `return`. Style is never a HellaNode.
2. **Resolve callee** — `getTagCallee(t, opening.name)`; throws `"Unsupported JSX tag type"` on anything but JSXIdentifier / JSXMemberExpression.
3. **Component detection** — `isComponent = (JSXIdentifier && first char uppercase) || JSXMemberExpression`. `<UI.Button>` and `<App.Components.Button>` both qualify.
4. **Categorize attrs** — `processAttributes(t, opening.attributes, isComponent)` returns `{ props, on, bind, hooks, e, error }` (six arrays, possibly all empty).
5. **Filter children** — `filterEmptyChildren(t, path.node.children, isComponent)`; JSXText whitespace-collapsed, comments dropped, `props.children` spread.
6. **Branch**:
   - **Component** — find program parent. If `tagName ∈ {ForEach, Portal, Lazy}` inject matching import and emit `Tag(props)` via `buildComponentCall` (passthrough). Otherwise inject `component` from `@hellajs/dom` and emit `component(Tag, props)`. **All six category arrays are flattened back into a single props object** — components never receive `on` / `bind` / `hooks` / `e` / `error` fields.
   - **Element** — `buildHellaNode(t, tag, props, on, e, bind, hooks, children, error)`.

**`JSXFragment`** (`src/transformers/jsx.mjs:58`) — `buildHellaNode(t, '$', [], [], [], [], [], children, [])`. Fragment nodes have no attributes (empty props/on/e/bind/hooks/error).

**`TaggedTemplateExpression`** (`src/transformers/component.mjs:12`) — only fires when `path.node.tag.name === 'html'`:

1. `parseHTMLComponent(quasis, expressions)` → intermediate AST (single node, or fragment `$` wrapping multiple roots, or bare `{ __slot }` if the entire template is one expression).
2. `findPassthroughComponents(ast)` → Set of `{ForEach, Portal, Lazy}` tag names present; ensure each import.
3. `containsComponent(ast, passthroughNames)` → if any uppercase or `__SLOT_N__` tag remains, `ensureCreateComponentImport`.
4. `componentNodeToBabel(t, ast, expressions)` → Babel AST; `path.replaceWith`.
</visitor-pipeline>

## Attribute categories

Six prefixes route attrs into six arrays. The `processAttributes` check order is `error:` → `bind:` → `hook:` → `e:` → `on:` → props (prefixes are mutually exclusive lexically; order only matters for documentation). `processComponentAttributes` (html\`\``) checks in a slightly different order but produces the same partition.

| JSX prefix | Output object key | Strip prefix | Semantics |
|---|---|---|---|
| `error:` | `error` | yes | Error-boundary config (e.g. `fallback`, `category`). |
| `bind:` | `bind` | yes | Reactive signal binding. |
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
| `<style>...</style>` | `css({...})` (or `css({...}, {...})`) | `css` from `@hellajs/css` |

## `<style>` transform

`handleStyleTag` (`src/transformers/style.mjs`):

- **Styles object** — first `JSXExpressionContainer` child whose expression is an `ObjectExpression` becomes the first arg. If absent, defaults to `css({})`.
- **Options** — every `JSXAttribute` whose value is a `StringLiteral` is collected into the options object (the second arg, only emitted when non-empty). **Non-string-literal attrs and valueless attrs (e.g. `scoped`) are silently dropped.** String values `"true"` / `"false"` are converted to boolean literals.
- Always replaces the JSX node with `css(...)`; always injects `import { css } from "@hellajs/css"`.

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
| `bind` | object | `bind:`-prefixed. |
| `hooks` | object | `hook:`-prefixed. |
| `error` | object | `error:`-prefixed. |
| `children` | array | filtered children; if every child is a `StringLiteral` they are joined into one string inside a single-element array. |

For components, **all six category arrays are merged into a single `props` object** (prefix-stripped); the `component(Tag, props)` call never carries `on` / `bind` / `hooks` / `e` / `error` keys.

## Import injection

`ensureNamedImport(t, program, source, name)` either pushes a specifier onto an existing `ImportDeclaration` for `source` or `unshift`s a new declaration onto `program.node.body`. Existing imports are never duplicated (idempotent).

| Helper | Source | Name |
|---|---|---|
| `ensureCssImport` | `@hellajs/css` | `css` |
| `ensureCreateComponentImport` | `@hellajs/dom` | `component` |
| `ensureForEachImport` | `@hellajs/dom` | `ForEach` |
| `ensurePortalImport` | `@hellajs/dom` | `Portal` |
| `ensureLazyImport` | `@hellajs/dom` | `Lazy` |

## Non-obvious behaviors

Grounded in tests — verify any change against these:

- **`component`, not `componentScope`** — wrap identifier is `component` from `@hellajs/dom`.
- **Passthroughs: `ForEach`, `Portal`, `Lazy`** — three names, mirrored in `jsx.mjs`, `component.mjs`, `builders/component.mjs`, `utils/traversal.mjs`.
- **Six attribute categories** — `error:` and `e:` exist alongside `on:` / `bind:` / `hook:`.
- **`e:` vs `on:`** — direct vs delegated events; both can appear on the same element (`<div e:click={direct} on:click={delegated} />`).
- **`hook:` in, `hooks` out** — input prefix is singular `hook:`, output object key is plural `hooks`.
- **Component props flatten** — `<Button on:click={h} bind:x={s} hook:mount={m} error:fallback={f} e:click={d} id="x" />` produces a single `props` object with `click`, `x`, `mount`, `fallback`, `click`, `id` keys (no nested `on`/`bind`/etc.).
- **HellaNode field order** — `tag, props, on, e, bind, hooks, error, children`; only `tag` is always present.
- **Static-children join** — when every child of an element or component is a `StringLiteral`, they are concatenated into one string inside a one-element array (vnode.mjs, component.mjs).
- **`props.children` spread** — `{props.children}` in JSX becomes `...props.children` (spread element) inside the children array.
- **Whitespace normalization** — JSX text is whitespace-collapsed (`\s+` → single space) and dropped if `.trim()` is empty; HTML text is trimmed.
- **camelCase `data`/`aria`** — `dataTestId` → `"data-test-id"`, `ariaLabel` → `"aria-label"`; the kebab form is always emitted as a quoted string key.
- **Namespaced JSX names** — `xml:lang`, `xlink:href` become a single quoted string key (`"xml:lang"`).
- **HTML parser strips** — `<!-- … -->`, `<!DOCTYPE …>`, `<![CDATA[…]]>` removed before tokenizing.
- **HTML fragment syntax** — `<>…</>` rewritten to `<__fragment__>…</__fragment__>` then back to `tag: '$'`; fragment nodes get `props: {}` (no `parseAttributes` call).
- **HTML attribute quotes** — double, single, and unquoted values all parse; mixed content (`"prefix-${suffix}-tail"`) produces a `binaryExpression('+')` chain.
- **Boolean attrs** — `<input required />` → `required: true`; explicit `={false}` stays `false`.
- **`<style>` always wins** — `<style>` short-circuits before any other JSX-element logic; valueless attrs (e.g. `scoped`) and non-StringLiteral attrs are silently dropped from the options object; `"true"`/`"false"` string values become booleans.
- **Member-expression tags** — `<UI.Button>` and arbitrarily nested `<A.B.C>` are components (recursive `getTagCallee`).
- **Dynamic components in `html\`\``** — `<${Comp}>` becomes a node with `tag: "__SLOT_N__"`; `componentNodeToBabel` resolves it to the actual expression and wraps with `component(...)`.
- **Self-closing parsing** — `/>` with optional leading space (`<br />`).
- **Multi-root `html\`\``** — multiple top-level elements auto-wrapped in a `$` fragment.

## Tests

Five files under `tests/`: `transform.test.ts` (full pipeline), `processor.test.ts` (attribute/child/value processing), `builder.test.ts` (`buildHellaNode`, `buildComponentCall`, `componentNodeToBabel`), `parser.test.ts` (`parseHTML`, `parseHTMLComponent`, `parseAttributes`, `parseTextContent`), `utility.test.ts` (`getTagCallee`, `findPassthroughComponents`, `containsComponent`).

- **Helpers** — `transformJSX(code)` runs `babel.transformSync` with `configFile: false` and the plugin; `normalize(output)` collapses whitespace for full-output equality asserts; `getNamedImports(code, source)` regex-extracts specifier names.
- **Style** — integration-style: most tests exercise the full transform and assert either `toContain` on substrings or `toBe` on `normalize()` output. Some tests import internals directly from `src/**/*.mjs`.
- **Run** — `bun check babel` (bundle + test + lint) or `bun test` from this folder. Follow `guides/tests.md`; never import non-public APIs.
- **Coverage target** — `dist/` bundles (per root `AGENTS.md`); the babel plugin is measured on its built output.

## Performance notes (verified)

- Single-regex tokenizer for HTML (`/<(\/)?([\w-]*)([^>]*?)(\s*\/)?>|([^<]+)/g`); stack-based nesting (no recursion in the parser itself; recursion only in `componentNodeToBabel`).
- `len` cached in `while` loops; static-string children joined into one literal at build time (avoids runtime array of strings).
- Intermediate AST is built once and converted in a single pass; slot markers defer expression resolution so the parser never touches Babel nodes.
- All hot paths avoid `JSON.parse` / `eval` / closures-per-node.

</babel-plugin>
