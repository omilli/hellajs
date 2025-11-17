# html`` Build Transform - Clean AST Approach

## Goal

Transform `html\`` to produce **identical clean AST** as JSX babel plugin.

---

## JSX Output Reference

**HTML elements:**
```js
<div className={theme}>{count}</div>
↓
{ tag: "div", props: { className: theme }, children: [count] }
```

**Components:**
```js
<Button onClick={handler}>Click</Button>
↓
Button({ onClick: handler, children: "Click" })
```

**Function call wrapping (HTML only):**
```js
<div className={getTheme()}>{getCount()}</div>
↓
{ tag: "div", props: { className: () => getTheme() }, children: [() => getCount()] }
```

**Fragments:**
```js
<>{child1}{child2}</>
↓
{ tag: "$", children: [child1, child2] }
```

---

## html`` Build Transform

### Same Clean Output

**HTML elements:**
```js
html`<div className="${theme}">${count}</div>`
↓
{ tag: "div", props: { className: theme }, children: [count] }
```

**Components:**
```js
html`<Button onClick="${handler}">Click</Button>`
↓
Button({ onClick: handler, children: "Click" })
```

**Function call wrapping:**
```js
html`<div className="${getTheme()}">${getCount()}</div>`
↓
{ tag: "div", props: { className: () => getTheme() }, children: [() => getCount()] }
```

**Fragments:**
```js
html`<>${child1}${child2}</>`
↓
{ tag: "$", children: [child1, child2] }
```

---

## Implementation Approach

### 1. Parse Template String

```js
TaggedTemplateExpression(path) {
  if (path.node.tag.name !== 'html') return

  const { quasis, expressions } = path.node.quasi

  // Build HTML with placeholders
  let htmlString = ''
  let i = 0
  while (i < quasis.length) {
    htmlString += quasis[i].value.raw
    if (i < expressions.length) {
      htmlString += `__SLOT_${i}__`
      i++
    }
    i++
  }

  // Parse HTML structure
  const ast = parseHTML(htmlString)

  // Replace slots with expressions and build Babel AST
  const babelAST = buildCleanAST(ast, expressions)

  path.replaceWith(babelAST)
}
```

### 2. Build Clean AST

**Key difference from runtime:** No markers, just clean objects or function calls.

```js
function buildCleanAST(node, expressions) {
  // Handle slot markers
  if (node.__slot !== undefined) {
    return expressions[node.__slot]
  }

  // Primitive values
  if (typeof node === 'string' || typeof node === 'number') {
    return t.stringLiteral(String(node))
  }

  // Component detection (uppercase)
  const isComponent = /^[A-Z]/.test(node.tag)

  if (isComponent) {
    return buildComponentCall(node, expressions)
  } else {
    return buildHellaNode(node, expressions)
  }
}
```

### 3. Build HellaNode (HTML Elements)

```js
function buildHellaNode(node, expressions) {
  const properties = [
    t.objectProperty(t.identifier('tag'), t.stringLiteral(node.tag))
  ]

  // Props
  if (node.props && Object.keys(node.props).length > 0) {
    properties.push(
      t.objectProperty(
        t.identifier('props'),
        buildPropsObject(node.props, expressions, false) // isComponent = false
      )
    )
  }

  // Children
  if (node.children && node.children.length > 0) {
    properties.push(
      t.objectProperty(
        t.identifier('children'),
        t.arrayExpression(
          node.children.map(child =>
            processChild(child, expressions, false) // isComponent = false
          )
        )
      )
    )
  }

  return t.objectExpression(properties)
}
```

### 4. Build Component Call

```js
function buildComponentCall(node, expressions) {
  const tagName = node.tag
  const componentRef = t.identifier(tagName)

  const props = buildPropsObject(node.props || {}, expressions, true) // isComponent = true

  // Add children to props if present
  if (node.children && node.children.length > 0) {
    const children = node.children.map(child =>
      processChild(child, expressions, true) // isComponent = true
    )

    // Add children property
    props.properties.push(
      t.objectProperty(
        t.identifier('children'),
        children.length === 1
          ? children[0]
          : t.arrayExpression(children)
      )
    )
  }

  return t.callExpression(componentRef, [props])
}
```

### 5. Process Values (Function Call Detection)

**Critical:** Same as JSX plugin - wrap function calls for HTML, not for components.

```js
function processValue(valueNode, expressions, isComponent) {
  // If it's a slot marker, get the actual expression
  if (valueNode.__slot !== undefined) {
    const expr = expressions[valueNode.__slot]

    // For HTML elements: check if expression contains function call
    if (!isComponent && checkForFunctionCall(expr)) {
      return t.arrowFunctionExpression([], expr)
    }

    return expr
  }

  // Static values
  if (typeof valueNode === 'string') {
    return t.stringLiteral(valueNode)
  }
  if (typeof valueNode === 'boolean') {
    return t.booleanLiteral(valueNode)
  }

  return valueNode
}
```

### 6. Reuse JSX Plugin Helpers

Import and reuse from existing babel plugin:

```js
import {
  checkForFunctionCall,    // Detect function calls (ignore forEach)
  processAttributeValue,   // Handle attribute values with wrapping
  filterEmptyChildren      // Remove whitespace-only text
} from './jsx-helpers.mjs'
```

---

## Special Cases

### ForEach

**JSX:**
```js
{forEach(items, renderItem)}
```

**html``:**
```js
html`${forEach(items, renderItem)}`
```

Both just pass through the expression - no special handling needed in build transform.

### Fragments

**JSX:**
```js
<>{child1}{child2}</>
→ { tag: "$", children: [child1, child2] }
```

**html``:**
```js
html`<>${child1}${child2}</>`
→ { tag: "$", children: [child1, child2] }
```

Detect `<>` tag in parser, set tag to `"$"`.

### Event Handlers

**JSX:**
```js
<button onClick={handleClick}>Click</button>
→ { tag: "button", props: { onClick: handleClick }, children: ["Click"] }
```

**html``:**
```js
html`<button onclick="${handleClick}">Click</button>`
→ { tag: "button", props: { onclick: handleClick }, children: ["Click"] }
```

Normalize `onclick` → `onClick` during parsing (or keep lowercase).

### Nested html`` Calls

```js
html`<div>${html`<span>nested</span>`}</div>`
↓
{
  tag: "div",
  children: [{
    tag: "span",
    children: ["nested"]
  }]
}
```

Inner `html\`` transforms recursively (visitor processes all TaggedTemplateExpressions).

---

## Parser Differences

### Runtime Parser
- Produces intermediate AST with `__placeholder` markers
- Runtime clones and injects values
- Handles `__component` and `__forEach` markers for registry lookups

### Build Parser
- Produces same intermediate AST structure
- BUT: Build immediately converts to clean Babel AST
- Component detection via uppercase tag name
- ForEach is just an expression (no special marker)
- No markers in final output - just clean objects/calls

---

## Implementation Steps

### Step 1: Extract Parsing Logic

Reuse runtime parser structure but make it Babel-aware:

```js
function parseHTMLTemplate(htmlString) {
  // Same tokenization as runtime parser
  const tokens = tokenize(htmlString)

  // Build intermediate AST
  const ast = buildAST(tokens)

  // Returns: { tag, props, children } with __slot markers
  return ast
}
```

### Step 2: Add Babel Visitor

```js
// plugins/babel/index.mjs

export default function babelHellaJS() {
  return {
    inherits: jsxSyntax,
    visitor: {
      JSXElement(path) { /* existing */ },
      JSXFragment(path) { /* existing */ },

      // NEW
      TaggedTemplateExpression(path) {
        if (!isHellaHTMLCall(path)) return
        transformHTMLTemplate(path)
      }
    }
  }
}

function isHellaHTMLCall(path) {
  // Check if tag is 'html' and imported from @hellajs/dom
  return path.node.tag.name === 'html'
}

function transformHTMLTemplate(path) {
  const { quasis, expressions } = path.node.quasi

  // Build HTML string with slot markers
  const htmlString = buildHTMLString(quasis)

  // Parse HTML structure
  const ast = parseHTMLTemplate(htmlString)

  // Convert to clean Babel AST
  const babelAST = astToBabel(ast, expressions)

  path.replaceWith(babelAST)
}
```

### Step 3: AST to Babel Conversion

```js
function astToBabel(node, expressions) {
  // Handle slot references
  if (node.__slot !== undefined) {
    const expr = expressions[node.__slot]
    // Apply function wrapping if needed
    return processExpression(expr, false) // isComponent = false initially
  }

  // Detect component vs element
  const isComponent = /^[A-Z]/.test(node.tag)

  if (isComponent) {
    return buildBabelComponentCall(node, expressions)
  } else {
    return buildBabelHellaNode(node, expressions)
  }
}

function buildBabelHellaNode(node, expressions) {
  // Build: { tag: "div", props: {...}, children: [...] }
  return t.objectExpression([
    t.objectProperty(t.identifier('tag'), t.stringLiteral(node.tag)),
    node.props && buildPropsAST(node.props, expressions, false),
    node.children && buildChildrenAST(node.children, expressions, false)
  ].filter(Boolean))
}

function buildBabelComponentCall(node, expressions) {
  // Build: Component({ props, children })
  const props = buildPropsAST(node.props || {}, expressions, true)

  if (node.children && node.children.length > 0) {
    // Add children to props
    const childrenAST = buildChildrenAST(node.children, expressions, true)
    props.properties.push(
      t.objectProperty(t.identifier('children'), childrenAST)
    )
  }

  return t.callExpression(t.identifier(node.tag), [props])
}
```

### Step 4: Reuse JSX Function Wrapping

```js
// Import from existing babel plugin
import { checkForFunctionCall } from './index.mjs'

function processExpression(expr, isComponent) {
  // Only wrap function calls for HTML elements
  if (!isComponent && checkForFunctionCall(expr)) {
    return t.arrowFunctionExpression([], expr)
  }
  return expr
}
```

---

## Testing Strategy

### Parity Tests

Ensure html`` output matches JSX output:

```js
test('html template matches JSX output', () => {
  const jsxCode = `<div className={theme}>{count}</div>`
  const htmlCode = `html\`<div className="\${theme}">\${count}</div>\``

  const jsxOutput = transform(jsxCode)
  const htmlOutput = transform(htmlCode)

  // Both should produce identical AST
  expect(htmlOutput).toBe(jsxOutput)
})
```

### Component Detection

```js
test('transforms components to function calls', () => {
  const code = `html\`<Button text="\${label}">Click</Button>\``
  const out = transform(code)

  expect(out).toContain('Button({')
  expect(out).toContain('text: label')
  expect(out).toContain('children: "Click"')
  expect(out).not.toContain('__component')
})
```

### Function Wrapping

```js
test('wraps function calls in HTML elements', () => {
  const code = `html\`<div className="\${getTheme()}">\${getCount()}</div>\``
  const out = transform(code)

  expect(out).toContain('className: () => getTheme()')
  expect(out).toContain('children: [() => getCount()]')
})

test('does not wrap function calls in components', () => {
  const code = `html\`<Button onClick="\${handleClick()}">Click</Button>\``
  const out = transform(code)

  expect(out).toContain('onClick: handleClick()')
  expect(out).not.toContain('() => handleClick()')
})
```

---

## Summary

The build transform should produce **exactly the same clean AST** as JSX:

- **HTML elements** → `{tag, props, children}` objects
- **Components** → `Component(props)` function calls
- **Function wrapping** → Auto-wrap for HTML, not for components
- **No runtime markers** → No `__component`, `__forEach`, `__placeholder`

This means:
1. Reuse JSX plugin's helper functions (component detection, function wrapping)
2. Parse html`` string to intermediate structure
3. Convert directly to clean Babel AST (objects or function calls)
4. Let mount() handle everything at runtime (just like JSX)

The only difference between JSX and html`` is **syntax** - both produce identical output.
