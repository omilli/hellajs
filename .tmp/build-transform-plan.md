# html`` Build Transform Plan

## Goal

Transform `html\`` tagged template literals into direct AST objects at build time, eliminating runtime parsing overhead while maintaining identical semantics.

---

## Current Runtime Flow

### Input
```js
const theme = signal('dark')
const count = signal(5)

mount(html`
  <div class="${theme}">
    <h1>${count}</h1>
  </div>
`)
```

### Runtime Process

1. **Placeholder Injection** (`html` function, line 486-514)
```js
strings: ['<div class="', '">\n  <h1>', '</h1>\n</div>']
values: [theme, count]
↓
'<div class="__HELLA_0__">\n  <h1>__HELLA_1__</h1>\n</div>'
```

2. **HTML Parsing** (`parseHTML`, line 577-671)
```js
Manual regex-based parser creates AST:
{
  tag: "div",
  props: { class: { __placeholder: 0 } },
  children: [{
    tag: "h1",
    children: [{ __placeholder: 1 }]
  }]
}
```

3. **Value Cloning** (`cloneWithValues`, line 515-576)
```js
Replace placeholders with actual values:
{
  tag: "div",
  props: { class: theme },
  children: [{
    tag: "h1",
    children: [count]
  }]
}
```

4. **Caching** (`activeCache`, line 488-493)
- WeakMap keyed by `strings` array reference
- Only active inside `template()` wrapper
- Caches AST structure, clones on each call

---

## Proposed Build Transform

### Goal
Skip steps 1-2 entirely, generate final AST directly at build time.

### Input (Source Code)
```js
const theme = signal('dark')
const count = signal(5)

mount(html`
  <div class="${theme}">
    <h1>${count}</h1>
  </div>
`)
```

### Output (Transformed Code)
```js
const theme = signal('dark')
const count = signal(5)

mount({
  tag: "div",
  props: { class: theme },
  children: [{
    tag: "h1",
    children: [count]
  }]
})
```

**Result:** No runtime parsing, no placeholder injection, direct AST object creation.

---

## Babel Plugin Strategy

### Approach

Extend the existing Babel plugin (`plugins/babel/index.mjs`) to detect and transform `html\`` calls.

### Plugin Architecture

```js
export default function babelHellaJS() {
  return {
    inherits: jsxSyntax,
    visitor: {
      // Existing JSX transformers
      JSXElement(path) { ... },
      JSXFragment(path) { ... },

      // NEW: Tagged template transformer
      TaggedTemplateExpression(path) {
        if (path.node.tag.name !== 'html') return

        const { quasis, expressions } = path.node.quasi
        const ast = parseTemplateToAST(quasis, expressions)
        path.replaceWith(ast)
      }
    }
  }
}
```

### Transform Steps

1. **Detect `html\`` calls**
   - Match `TaggedTemplateExpression` with `tag.name === 'html'`

2. **Extract template parts**
   ```js
   quasi: {
     quasis: [
       { value: { raw: '<div class="' } },
       { value: { raw: '">\n  <h1>' } },
       { value: { raw: '</h1>\n</div>' } }
     ],
     expressions: [theme, count]
   }
   ```

3. **Build HTML string with placeholders**
   ```js
   let htmlString = ''
   let i = 0
   while (i < quasis.length) {
     htmlString += quasis[i].value.raw
     if (i < expressions.length) {
       htmlString += `__HELLA_${i}__`
     }
     i++
   }
   ```

4. **Parse HTML** (reuse runtime parser logic)
   ```js
   const placeholders = expressions.map((_, i) => ({ __placeholder: i }))
   const ast = parseHTML(htmlString, placeholders)
   ```

5. **Replace placeholders with expression nodes**
   ```js
   function injectExpressions(node, expressions) {
     if (node.__placeholder !== undefined) {
       return expressions[node.__placeholder]
     }
     // Recursively process props and children...
   }
   ```

6. **Generate Babel AST**
   ```js
   function buildBabelAST(hellaNode, expressions) {
     return t.objectExpression([
       t.objectProperty(t.identifier('tag'), t.stringLiteral(hellaNode.tag)),
       hellaNode.props && t.objectProperty(
         t.identifier('props'),
         buildPropsObject(hellaNode.props, expressions)
       ),
       hellaNode.children && t.objectProperty(
         t.identifier('children'),
         t.arrayExpression(
           hellaNode.children.map(c => buildChildNode(c, expressions))
         )
       )
     ].filter(Boolean))
   }
   ```

---

## Implementation Details

### Shared Parser Module

**Challenge:** Babel plugin needs same parsing logic as runtime.

**Options:**

**A) Port runtime parser to Babel plugin**
- Duplicate `parseHTML`, `parseTextContent`, `parseAttributes`
- Keep in sync manually
- ❌ Maintenance burden

**B) Extract parser to shared module**
- Create `packages/dom/lib/parser.ts`
- Use in both runtime and Babel plugin
- Import in Babel via `require()` or bundle
- ✅ Single source of truth

**C) Inline simple parser in plugin**
- Babel-only implementation
- Simpler regex-based parsing
- ❌ Behavior divergence risk

**Recommendation:** Option B - Shared parser module

### Shared Parser Structure

```ts
// packages/dom/lib/parser.ts

export interface ParseOptions {
  mode: 'runtime' | 'build'
  placeholders?: any[]
  expressions?: any[] // Babel expression nodes
}

/**
 * Parse HTML string with placeholders into HellaNode AST.
 * Used by both runtime html() and build-time Babel plugin.
 */
export function parseHTML(html: string, options: ParseOptions) {
  const { mode, placeholders, expressions } = options

  // Same parsing logic as current runtime
  const result = []
  const stack = []
  let current = null
  const tokenRegex = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g
  let match

  while ((match = tokenRegex.exec(html)) !== null) {
    // ... existing parsing logic
  }

  return result
}

export function parseTextContent(text: string, options: ParseOptions) {
  // ... existing logic
}

export function parseAttributes(attrsStr: string, options: ParseOptions) {
  // ... existing logic
}
```

### Babel Plugin Implementation

```js
// plugins/babel/html-transform.mjs

import { parseHTML } from '@hellajs/dom/lib/parser'
import { types as t } from '@babel/core'

export function transformHTMLTemplate(path) {
  const { quasis, expressions } = path.node.quasi

  // Build HTML string with placeholders
  let htmlString = ''
  let i = 0, len = quasis.length
  while (i < len) {
    htmlString += quasis[i].value.raw
    if (i < expressions.length) {
      htmlString += `__HELLA_${i}__`
    }
    i++
  }

  // Parse to HellaNode AST
  const ast = parseHTML(htmlString, {
    mode: 'build',
    expressions
  })

  // Convert to Babel AST nodes
  const babelAST = ast.length === 1
    ? hellaNodeToBabel(ast[0], expressions)
    : hellaNodeToBabel({ tag: '$', children: ast }, expressions)

  path.replaceWith(babelAST)
}

function hellaNodeToBabel(node, expressions) {
  if (node.__placeholder !== undefined) {
    return expressions[node.__placeholder]
  }

  if (typeof node !== 'object') {
    return t.stringLiteral(String(node))
  }

  const properties = [
    t.objectProperty(t.identifier('tag'), t.stringLiteral(node.tag))
  ]

  if (node.props) {
    properties.push(
      t.objectProperty(
        t.identifier('props'),
        propsToAST(node.props, expressions)
      )
    )
  }

  if (node.children && node.children.length > 0) {
    properties.push(
      t.objectProperty(
        t.identifier('children'),
        t.arrayExpression(
          node.children.map(c => hellaNodeToBabel(c, expressions))
        )
      )
    )
  }

  return t.objectExpression(properties)
}

function propsToAST(props, expressions) {
  const properties = []

  for (const key in props) {
    const value = props[key]
    const valueNode = value.__placeholder !== undefined
      ? expressions[value.__placeholder]
      : typeof value === 'string'
        ? t.stringLiteral(value)
        : t.booleanLiteral(value)

    properties.push(
      t.objectProperty(
        /[-:]/.test(key) ? t.stringLiteral(key) : t.identifier(key),
        valueNode
      )
    )
  }

  return t.objectExpression(properties)
}
```

### Integration into Existing Plugin

```js
// plugins/babel/index.mjs (existing)

import { transformHTMLTemplate } from './html-transform.mjs'

export default function babelHellaJS() {
  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      // Existing transformers
      JSXElement(path) { ... },
      JSXFragment(path) { ... },

      // NEW: Transform html`` templates
      TaggedTemplateExpression(path) {
        if (path.node.tag.name === 'html') {
          transformHTMLTemplate(path)
        }
      }
    }
  }
}
```

---

## Edge Cases & Considerations

### 1. Component References

**Runtime:**
```js
html`<${Button} text="${label}" />`  // ❌ Doesn't work
html`<Button text="${label}" />`     // ✅ Lookup in componentRegistry
```

**Build:**
```js
html`<Button text="${label}" />`
↓
{
  __component: "Button",
  props: { text: label }
}
```

Need to preserve `__component` marker or transform to function call.

**Decision:** Keep `__component` marker for now (same as runtime).

### 2. ForEach Special Case

**Runtime:**
```js
html`<ForEach for="${items}" each="${renderItem}" />`
↓
{ __forEach: true, props: { for: items, each: renderItem } }
```

**Build:** Same transformation, preserve `__forEach` flag.

### 3. Fragment Handling

**Runtime:**
```js
html`<>${child1}${child2}</>`  // Multiple root nodes
↓
{ tag: '$', children: [child1, child2] }
```

**Build:** Same - wrap multiple roots in fragment.

### 4. Nested Templates

**Runtime:**
```js
html`<div>${html`<span>nested</span>`}</div>`
```

**Build:**
```js
{
  tag: "div",
  children: [{
    tag: "span",
    children: ["nested"]
  }]
}
```

Nested `html\`` calls transform recursively.

### 5. Dynamic Tag Names

**Runtime:**
```js
html`<${tagName}>content</${tagName}>`  // ❌ Invalid template literal
```

**Build:** Not supported (same as runtime limitation).

### 6. Spread Attributes

**Not currently supported in runtime parser.**

Possible future enhancement:
```js
html`<div ...${props}>content</div>`
```

### 7. Self-Closing Tags

**Runtime:** Handles both `<br />` and `<br>` for void elements.

**Build:** Same behavior (regex detects `(\s*\/)?>`).

---

## Testing Strategy

### Test Suite Structure

```js
// plugins/babel/babel.test.ts (existing)

describe('html`` template transformation', () => {
  test('transforms simple element', () => {
    const code = html`<div>hello</div>`
    const out = transform(code)
    expect(out).toContain('tag: "div"')
    expect(out).toContain('children: ["hello"]')
  })

  test('transforms with interpolated values', () => {
    const code = `html\`<div class="\${theme}">\${count}</div>\``
    const out = transform(code)
    expect(out).toContain('class: theme')
    expect(out).toContain('children: [count]')
  })

  test('transforms nested elements', () => {
    const code = `html\`<div><h1>\${title}</h1></div>\``
    const out = transform(code)
    expect(out).toContain('tag: "div"')
    expect(out).toContain('tag: "h1"')
    expect(out).toContain('children: [title]')
  })

  test('handles registered components', () => {
    const code = `html\`<Button text="\${label}" />\``
    const out = transform(code)
    expect(out).toContain('__component: "Button"')
    expect(out).toContain('text: label')
  })

  test('handles ForEach', () => {
    const code = `html\`<ForEach for="\${items}" each="\${renderItem}" />\``
    const out = transform(code)
    expect(out).toContain('__forEach: true')
  })

  test('handles fragments', () => {
    const code = `html\`<>\${child1}\${child2}</>\``
    const out = transform(code)
    expect(out).toContain('tag: "$"')
  })

  test('preserves event handlers', () => {
    const code = `html\`<button onclick="\${handleClick}">Click</button>\``
    const out = transform(code)
    expect(out).toContain('onclick: handleClick')
  })
})
```

### Parity Testing

Ensure build output matches runtime output:

```js
test('build transform matches runtime output', () => {
  const template = '<div class="${theme}">${count}</div>'

  // Runtime
  const runtimeAST = html`<div class="${theme}">${count}</div>`

  // Build (from transformed code)
  const buildAST = { tag: "div", props: { class: theme }, children: [count] }

  expect(buildAST).toEqual(runtimeAST)
})
```

---

## Migration Path

### Phase 1: Shared Parser Module
- Extract `parseHTML`, `parseTextContent`, `parseAttributes` to `packages/dom/lib/parser.ts`
- Update runtime to use shared module
- Add tests for parser

### Phase 2: Babel Plugin
- Create `plugins/babel/html-transform.mjs`
- Import shared parser
- Implement `transformHTMLTemplate()`
- Integrate into existing plugin

### Phase 3: Testing
- Add comprehensive test suite
- Parity tests (build vs runtime)
- Edge cases

### Phase 4: Optimization
- Bundle parser with plugin (avoid runtime dep)
- Performance benchmarks
- Consider caching optimizations

---

## Open Questions

### 1. Should `html` import be removed in production?

**Runtime:**
```js
import { html } from '@hellajs/dom'
```

**After build transform:**
```js
// html import no longer used
```

**Options:**
- A) Leave import (no harm, tree-shaking removes)
- B) Remove import during transform
- C) Replace with empty function stub

**Recommendation:** Option A (simplest).

### 2. How to handle template() wrapper?

**Runtime:**
```js
const Button = template(props => html`<button>${props.text}</button>`)
```

**After transform:**
```js
const Button = template(props => ({ tag: "button", children: [props.text] }))
```

`template()` function still needed for caching wrapper, but inner `html\`` transformed away.

**Decision:** Keep `template()` wrapper, only transform `html\`` calls.

### 3. Support for expressions in tag names?

**Currently not supported:**
```js
html`<${dynamic}>content</${dynamic}>`
```

**Future enhancement?** Would require different AST structure.

### 4. Import detection

Should transform only work if `html` is imported from `@hellajs/dom`?

```js
import { html } from '@hellajs/dom'  // ✅ Transform
import { html } from 'other-lib'     // ❌ Skip

const html = customFn                // ❌ Skip
html`<div></div>`
```

**Recommendation:** Check import source for safety.

---

## Performance Impact

### Bundle Size
- **Runtime:** +2-3KB (parser code)
- **Build:** 0KB (parser not included, only transform output)

**Savings:** ~2-3KB per bundle

### Runtime Performance
- **Runtime:** Parse on first call (~1-5ms), clone on subsequent (~0.1ms)
- **Build:** Direct object creation (~0.01ms)

**Improvement:** ~100-500x faster

### Build Time
- **Additional overhead:** Minimal (~1-2ms per template)
- Same as JSX transformation cost

---

## Implementation Checklist

### Core
- [ ] Extract parser to `packages/dom/lib/parser.ts`
- [ ] Update runtime `html()` to use shared parser
- [ ] Create `plugins/babel/html-transform.mjs`
- [ ] Add `TaggedTemplateExpression` visitor to main plugin
- [ ] Implement `hellaNodeToBabel()` converter

### Testing
- [ ] Parser unit tests
- [ ] Transform plugin tests
- [ ] Parity tests (build vs runtime output)
- [ ] Edge case tests (components, ForEach, fragments)
- [ ] Integration tests (full app builds)

### Documentation
- [ ] Update package README
- [ ] Add migration guide
- [ ] Document build vs runtime modes
- [ ] Example configurations

### Optimization
- [ ] Bundle parser with plugin
- [ ] Benchmark performance
- [ ] Consider template literal caching in plugin

---

## Conclusion

This build transformation is **straightforward and low-risk**:

1. **Reuse existing runtime parser** - Same logic, different output
2. **Fits existing plugin architecture** - Just add one visitor
3. **Zero breaking changes** - Runtime still works, build is optional
4. **Significant performance gains** - Eliminate runtime parsing
5. **Bundle size reduction** - Remove parser from production

The key insight: `html\`` and JSX are just different syntaxes for the same HellaNode AST structure. The Babel plugin simply needs to parse template literals the same way the runtime does, then generate the object literal AST that would have been produced after parsing.
