# Babel Plugin

Babel transform plugin for HellaJS JSX and html`` tagged templates.

## Architecture Overview

### Mental Model

The plugin performs **compile-time transformation** of JSX and html`` templates:
- **JSX**: Transforms JSX syntax into HellaNode object expressions
- **html``**: Parses tagged templates into HellaNode AST with slot substitution
- **Attributes**: Separates props, events (on:), bindings (bind:), and lifecycle (hooks:) into distinct objects
- **Components**: Detects uppercase components and wraps in `componentScope()` calls for automatic cleanup
- **Passthrough Components**: `ForEach` and `Portal` bypass `componentScope` wrapping (direct function calls)
- **Style**: Auto-transforms `<style>` JSX tags into `css()` calls

### Key Components

- **index.mjs**: Plugin entry point, combines JSX and html`` transformers
- **src/transformers/jsx.mjs**: JSX element and fragment transformation
- **src/transformers/component.mjs**: html`` tagged template transformation
- **src/transformers/style.mjs**: `<style>` tag to `css()` transformation
- **src/parsers/html.mjs**: HTML string parser for tagged templates
- **src/parsers/attributes.mjs**: Attribute string parser with prefix detection
- **src/parsers/text.mjs**: Text content parser with slot marker substitution
- **src/processors/attributes.mjs**: Attribute categorization (props/on/bind/hooks)
- **src/processors/children.mjs**: Child node filtering and normalization
- **src/processors/values.mjs**: Attribute value processing and type conversion
- **src/builders/vnode.mjs**: HellaNode object expression builder
- **src/builders/component.mjs**: Component call expression builder with `componentScope()` wrapper
- **src/builders/ast.mjs**: Intermediate AST to Babel AST converter
- **src/utils/babel.mjs**: Babel AST utility functions
- **src/utils/imports.mjs**: Import injection management (css, ForEach, Portal, componentScope)
- **src/utils/traversal.mjs**: AST traversal for detecting components and passthrough tags

## Key Data Structures

**Intermediate AST**
```javascript
{
  tag: string | '__slot',           // Element tag or slot marker
  props: Record<string, any>,        // Parsed attributes
  children: Array<Node | string>,   // Child nodes
  __slot?: number                    // Slot index for expressions
}
```

**HellaNode Output**
```javascript
{
  tag: string,                       // Element tag name
  props: { [key: string]: any },     // Static/dynamic props
  on?: { [event: string]: handler }, // Event handlers (on: prefix)
  bind?: { [key: string]: signal },  // Dynamic bindings (bind: prefix)
  hooks?: { [hook: string]: fn },    // Lifecycle hooks (hooks: prefix)
  children?: Array<any>              // Child nodes/text
}
```

**Slot Markers**
- Tagged template expressions replaced with `__SLOT_N__` during parsing
- Substituted with actual Babel expressions during AST conversion
- Enables single-pass parsing with deferred expression resolution

## Key Algorithms

### JSX Transformation

**Tag detection**:
1. Uppercase first letter → component (transforms to function call)
2. `<style>` → special transform to `css()` call
3. Fragment `<>` → HellaNode with `tag: '$'`
4. Lowercase → regular HellaNode

**Attribute categorization**:
- `on:click` → `on: { click: handler }`
- `bind:class` → `bind: { class: signal }`
- `hooks:mount` → `hooks: { mount: fn }`
- Other → `props: { attr: value }`

**Component transformation**:
```jsx
<Button onClick={handler}>Click</Button>
// Transforms to:
componentScope(Button, { onClick: handler, children: ["Click"] })
```

**Passthrough component transformation** (ForEach, Portal):
```jsx
<ForEach each={items} use={item => <li>{item}</li>} />
// Transforms to (no componentScope wrapper):
ForEach({ each: items, use: item => ... })
```

**HellaNode transformation**:
```jsx
<div class="box" on:click={handler}>Content</div>
// Transforms to:
{ tag: "div", props: { class: "box" }, on: { click: handler }, children: ["Content"] }
```

### html`` Template Parsing

**Tokenization**:
1. Build HTML string with `__SLOT_N__` markers for expressions
2. Single regex matches opening/closing tags, attributes, text
3. Stack-based parser tracks nesting depth
4. Attribute parser extracts key-value pairs with prefix detection

**Slot substitution**:
1. Parse HTML to intermediate AST with slot markers
2. Convert intermediate AST to Babel AST
3. Replace `__SLOT_N__` nodes with actual expression ASTs
4. Handle special cases: `<ForEach>`, `<Portal>`, dynamic components `<${Comp}>`

**Passthrough detection**:
- `<ForEach>` and `<Portal>` → ensures respective imports from `@hellajs/dom`
- Transformed to direct function calls without `componentScope` wrapper
- Other uppercase tags → wrapped with `componentScope()` for automatic cleanup

**Component detection**:
- Uppercase tags and dynamic components → ensures `componentScope` import from `@hellajs/dom`
- All non-passthrough component calls wrapped with `componentScope()` for automatic scope management


## Performance Patterns

**Hot path optimizations**:
- Single-pass tokenization with combined regex
- Stack-based parsing (no recursion overhead)
- While loops with cached lengths
- Direct property access vs iteration
- Static child optimization (joins string literals)

**Memory management**:
- Intermediate AST created once, converted to Babel AST
- Slot markers reused (no expression cloning during parse)
- String concatenation via array.join() not +=
- Attribute objects created only when needed (empty checks)

**Build-time benefits**:
- No runtime template parsing overhead
- Static analysis enables tree-shaking
- Type safety for component props (TypeScript integration)
- Dead code elimination for unused components

## Non-Obvious Behaviors

**JSX processing**:
- **Uppercase detection**: First character uppercase → `componentScope()` call not HellaNode
- **Passthrough components**: `ForEach` and `Portal` bypass `componentScope` wrapping
- **Style tag special case**: `<style>` always transforms to `css()`, never HellaNode
- **Fragment normalization**: `<>` → HellaNode with `tag: '$'`
- **Spread attributes**: Only added to props object, not on/bind/hooks
- **Boolean attributes**: No value → `true`, explicit `false` → `false`
- **camelCase conversion**: `dataFoo`, `ariaLabel` → `data-foo`, `aria-label`
- **Kebab-case props**: Quoted as strings (`"data-foo"`) vs identifiers
- **Children merging**: All-string children joined into single string

**html`` template processing**:
- **Slot markers visible**: `__SLOT_N__` appears in intermediate AST, not final output
- **Dynamic components**: `<${Component}>` creates special marker node
- **Whitespace handling**: `.trim()` on text nodes, preserves intentional spaces
- **Self-closing detection**: `/>`  with optional space before slash
- **Empty children filtered**: Removes empty text nodes and null/undefined

**Attribute prefix precedence** (JSX processing order):
1. Check `bind:` prefix (dynamic bindings)
2. Check `hooks:` prefix (lifecycle hooks)
3. Check `on:` prefix (event handlers)
4. Everything else → props

**Edge cases**:
- **Namespace preservation**: `xml:lang`, `xlink:href` → `"xml:lang"` key (quoted string)
- **Component children unwrapping**: Single child not wrapped in array
- **Mixed content arrays**: Text + expressions concatenated with `+` operator
- **Dynamic components**: `<${Component}>` in html`` creates slot marker, resolved to expression
- **Member expressions**: `<UI.Button>` treated as component (JSXMemberExpression)
