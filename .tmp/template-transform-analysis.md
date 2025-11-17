# Template String → AST Transformation Strategy

## Executive Summary

Enable users to develop with template strings (no compile step) and transform them to AST objects for production builds, matching the JSX workflow.

**Development:** `html\`<div>${count}</div>\`` → Runtime parsing → AST → DOM
**Production:** `html\`<div>${count}</div>\`` → Build transform → `{tag:'div',children:[count]}` → DOM

---

## Current Architecture Analysis

### 1. JSX → AST Transformation (Babel Plugin)

**Location:** `plugins/babel/index.mjs`

**Process:**
```js
// Input JSX
<div className={foo()}>
  <h1>{count}</h1>
</div>

// Output AST
{
  tag: "div",
  props: { className: () => foo() },
  children: [{
    tag: "h1",
    children: [count]
  }]
}
```

**Key Behaviors:**
- **HTML elements** (lowercase) → HellaNode objects with `{tag, props, children}`
- **Components** (uppercase) → Function calls with props object
- **Function calls in attributes/children** → Wrapped in arrow functions for reactivity
  - `className={foo()}` → `className: () => foo()`
  - Only for HTML elements, NOT components
- **forEach calls** → Ignored (not wrapped)
- **Fragments** → `{tag: "$", children: [...]}`
- **data/aria attributes** → Converted to kebab-case
- **Namespace attributes** → Preserved as strings
- **Spread attributes** → Preserved as spread elements
- **Boolean attributes** → `null` → `true`
- **Empty children** → Stripped entirely

**Transform Helpers:**
- `getTagCallee()` - Extracts tag name from JSX
- `processAttributes()` - Converts JSX attributes to object properties
- `filterEmptyChildren()` - Removes whitespace-only text, JSX comments
- `checkForFunctionCall()` - Recursively detects function calls (excluding forEach)
- `processAttributeValue()` - Wraps function calls in arrow functions
- `buildVNode()` - Creates HellaNode object
- `buildComponentCall()` - Creates component function call

---

### 2. AST → DOM Rendering (Mount System)

**Location:** `packages/dom/lib/mount.ts`

**Process:**
```js
// Input: HellaNode AST
{
  tag: "div",
  props: { className: () => theme() },
  children: [count, "items"]
}

// Output: Real DOM with reactive bindings
<div class="dark">  // ← Effect tracking theme()
  5                  // ← Effect tracking count()
  items
</div>
```

**Rendering Pipeline:**

1. **`renderNode(HellaNode)`** - Main entry point
   - Fragments → `createDocumentFragment()`
   - HTML elements → `createElement(tag)`
   - Props → Process attributes and create effects
   - Children → `appendToParent()`

2. **Props Processing:**
   - Event handlers (`onX`) → `setNodeHandler()` for delegation
   - Function values → Store in `effects` Set, register via `addRegistryEffect()`
   - Static values → Direct `renderProp()` call
   - Effects run inside `addRegistryEffect()` wrapper for cleanup

3. **Children Processing (`appendToParent`):**
   - Static children → Batch into `DocumentFragment` for single append
   - Dynamic children (functions) → Comment markers + reactive effects
   - `forEach` children → Special handling via `isForEach` flag
   - Text nodes → `createTextNode()`
   - HellaNodes → Recursive `renderNode()` call

4. **Dynamic Content System:**
   ```js
   // Dynamic child creates:
   <!-- START -->
   <actual-content />
   <!-- END -->
   ```
   - Comment markers define replacement boundaries
   - Effect updates content between markers
   - Supports fragments (multiple nodes)
   - Uses `actualParent = start.parentNode` for fragment safety

**Key Functions:**
- `resolveNode(value)` - Converts HellaChild to DOM Node
- `resolveValue(value)` - Executes functions, returns static values
- `renderNode(HellaNode)` - Renders AST to DOM element/fragment
- `appendToParent(parent, children)` - Batches static, wraps dynamic

---

### 3. Reactive Registry System

**Location:** `packages/dom/lib/registry.ts`

**Storage:**
- Effects → `element.__hella_effects` (Set of cleanup functions)
- Handlers → `element.__hella_handlers` (Object mapping event types)

**Lifecycle:**
1. `addRegistryEffect(node, effectFn)` - Register reactive effect
   - Creates effect via `effect(effectFn)` from @hellajs/core
   - Stores cleanup function in Set
2. `MutationObserver` - Watches DOM removals
   - Queues removed nodes in `cleanupQueue`
   - Defers cleanup via `setTimeout(processCleanupQueue, 0)`
3. `processCleanupQueue()` - Batch cleanup
   - Skips nodes with `isConnected` or `parentNode` (DOM moves)
   - Calls `cleanWithDescendants()` for true removals
4. `clean(node)` - Dispose effects and handlers
   - Calls all effect cleanup functions
   - Deletes `__hella_effects` and `__hella_handlers`
   - Executes `element.onDestroy?.()`
5. `cleanWithDescendants(node)` - Recursive cleanup
   - Cleans node + all descendants

**Benefits:**
- Automatic cleanup on removal
- No manual effect management
- No separate registry Map (50% less memory)
- Safe for DOM moves (skips connected nodes)

---

## Proposed Runtime Template Parser

### Design Goals

1. **Parse HTML template strings into AST at runtime**
2. **Cache static structure for performance**
3. **Handle dynamic interpolations (${...})**
4. **Match JSX semantics for consistency**

### API Design

```js
import { html } from '@hellajs/dom'

const count = signal(5)
const theme = signal('dark')

// Basic usage
const node = html`
  <div class="${theme}">
    <h1>Count: ${count}</h1>
    <button onclick="${() => count(count() + 1)}">+</button>
  </div>
`
mount(node)
```

### Parsing Strategy

**Template Structure:**
```js
html`<div class="${theme}">${count}</div>`
     ↓
strings: ['<div class="', '">', '</div>']
values:  [theme, count]
```

**Parser Flow:**
1. **Cache Check** - Hash `strings` array for cache key
2. **Parse HTML** - Use browser's DOMParser or manual parser
3. **Build AST Template** - Walk parsed tree, create HellaNode structure
4. **Mark Dynamic Slots** - Replace interpolation markers with slot indices
5. **Clone & Inject** - For each call, clone template and inject `values`

**Caching Strategy:**
```js
const cache = new Map()

function html(strings, ...values) {
  const key = strings.join('\x00') // Unique cache key

  if (!cache.has(key)) {
    const template = parseToAST(strings)
    cache.set(key, template)
  }

  const template = cache.get(key)
  return injectValues(template, values)
}
```

### Interpolation Handling

**Attributes:**
```js
// Template
html`<div class="${theme}" data-count="${count}"></div>`

// AST with slots
{
  tag: 'div',
  props: {
    class: { __slot: 0 },      // Reference to values[0]
    'data-count': { __slot: 1 } // Reference to values[1]
  }
}

// Inject values
{
  tag: 'div',
  props: {
    class: theme,         // Actual signal reference
    'data-count': count
  }
}
```

**Children:**
```js
// Template
html`<div>Count: ${count}</div>`

// AST with slots
{
  tag: 'div',
  children: ['Count: ', { __slot: 0 }]
}

// Inject values
{
  tag: 'div',
  children: ['Count: ', count]
}
```

**Event Handlers:**
```js
// Template
html`<button onclick="${handleClick}">Click</button>`

// AST with slots
{
  tag: 'button',
  props: {
    onclick: { __slot: 0 }
  },
  children: ['Click']
}

// Inject values (event handlers stay as-is)
{
  tag: 'button',
  props: {
    onclick: handleClick
  },
  children: ['Click']
}
```

### Parser Implementation Approach

**Option A: DOMParser (Browser Built-in)**
```js
function parseHTML(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return domToAST(doc.body.firstChild)
}
```
- ✅ Fast, native implementation
- ✅ Handles complex HTML
- ❌ Requires browser environment
- ❌ No SSR support

**Option B: Manual Parser**
```js
function parseHTML(html) {
  // Regex-based tag/attribute parsing
  const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>|<(\w+)([^>]*)\/>/gs
  // ... custom parsing logic
}
```
- ✅ Works in any environment
- ✅ Full control over parsing
- ❌ More complex implementation
- ❌ Edge cases (self-closing, void elements)

**Recommendation:** Start with DOMParser for MVP, add manual parser for SSR later

### Dynamic Detection

Match Babel plugin behavior:
- Detect function calls in interpolations
- Wrap in arrow functions automatically
- Special handling for forEach

```js
// Input
html`<div class="${getTheme()}">${computeCount()}</div>`

// AST (after value injection)
{
  tag: 'div',
  props: {
    class: () => getTheme()  // ← Wrapped
  },
  children: [() => computeCount()]  // ← Wrapped
}
```

Implementation:
```js
function processValue(value) {
  // Check if value is a function call by inspecting string source
  // OR require users to use arrow functions explicitly
  // OR use runtime detection (check if value is function)

  if (isFunction(value)) {
    return value // Already a function, keep as-is
  }
  return value
}
```

**Note:** Runtime can't detect function calls in source like Babel can. Options:
1. Require explicit arrow functions: `${() => foo()}`
2. Treat all interpolations as potentially reactive
3. Use convention: uppercase = component, lowercase = reactive value

---

## Proposed Build-Time Transformer

### Design Goals

1. **Transform template strings to AST objects at build time**
2. **Eliminate runtime parsing overhead**
3. **Preserve reactivity semantics**
4. **Support same syntax as JSX**

### Transformation Strategy

**Input:**
```js
const count = signal(5)
mount(html`<div class="${theme}"><h1>${count}</h1></div>`)
```

**Output:**
```js
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

### Implementation Approaches

**Option A: Babel Plugin (Tagged Template Transform)**

Create new Babel plugin:
- Detect `html\`` tagged templates
- Parse string to HTML
- Build AST nodes (same as JSX plugin)
- Replace template with object literal

```js
// plugins/babel-template/index.mjs
export default function babelHellaTemplate() {
  return {
    visitor: {
      TaggedTemplateExpression(path) {
        if (path.node.tag.name !== 'html') return

        const { quasis, expressions } = path.node.quasi
        const htmlString = buildHTMLString(quasis)
        const ast = parseHTMLToAST(htmlString, expressions)
        const astNode = buildASTLiteral(ast)

        path.replaceWith(astNode)
      }
    }
  }
}
```

**Option B: Custom Regex Transform (Build Script)**

Simple regex-based replacement:
- Find all `html\`...\`` patterns
- Parse HTML structure
- Generate AST code
- Replace in source

```js
// scripts/transform-templates.mjs
function transformTemplates(code) {
  return code.replace(
    /html`([^`]+)`/g,
    (match, template) => {
      const ast = parseTemplate(template)
      return generateASTCode(ast)
    }
  )
}
```

**Option C: Hybrid (Plugin + Runtime Fallback)**

Development: Runtime `html` parser
Production: Babel plugin transforms to AST

**Recommendation:** Option A (Babel Plugin) for consistency with JSX workflow

### Parser Requirements

Same parsing logic for both runtime and build-time:
1. HTML parsing (tags, attributes, nesting)
2. Interpolation slot detection
3. Dynamic value injection (build) or slot markers (runtime)
4. AST building (HellaNode objects)

**Shared Parser Module:**
```js
// packages/dom/lib/parser.ts
export function parseTemplate(strings, values, mode = 'runtime') {
  const htmlString = buildHTML(strings, values, mode)
  const dom = parseHTML(htmlString)
  const ast = domToAST(dom, values, mode)
  return ast
}

// Runtime: inject values directly
parseTemplate(strings, values, 'runtime')

// Build: create slot markers
parseTemplate(strings, values, 'build')
```

---

## Migration Path

### Phase 1: Runtime Template Parser (MVP)

**Scope:**
- Implement `html` tagged template function
- Basic HTML parsing (DOMParser)
- AST generation
- Value injection
- Basic caching

**Files:**
- `packages/dom/lib/template.ts` - Main html() function
- `packages/dom/lib/parser.ts` - HTML parsing logic
- `packages/dom/tests/template.test.ts` - Tests

**Result:** Users can use `html\`` in development without compilation

### Phase 2: Build Transform Plugin

**Scope:**
- Babel plugin for template → AST transformation
- Reuse parser from Phase 1
- Generate object literal code
- Handle edge cases

**Files:**
- `plugins/babel-template/index.mjs` - Babel plugin
- `plugins/babel-template/babel.test.ts` - Plugin tests

**Result:** Production builds replace `html\`` with AST objects

### Phase 3: Optimization & Edge Cases

**Scope:**
- Advanced caching strategies
- SSR support (manual parser)
- Edge cases (void elements, self-closing, comments)
- Performance benchmarks

**Result:** Production-ready template system

---

## Open Questions

### 1. Dynamic Detection Strategy

**Problem:** Runtime can't detect function calls like Babel can

**Options:**
- A) Require explicit arrow functions: `${() => foo()}`
- B) Treat all non-primitive interpolations as reactive
- C) Use naming conventions (signals always called with ())

**Recommendation:** Option A for clarity and consistency with JSX

### 2. Component vs Element Detection

**Problem:** How to distinguish components from elements in templates?

**JSX:** Uppercase = component, lowercase = element
**Templates:** `<MyComponent>` vs `<div>` - same in strings

**Options:**
- A) Use naming convention (uppercase = component)
- B) Require explicit syntax: `<\${MyComponent}>`
- C) Runtime registry check

**Recommendation:** Option A (same as JSX)

### 3. Fragment Syntax

**JSX:** `<>...</>`
**Templates:** ???

**Options:**
- A) `html\`<>\${children}</>\``
- B) `html\`<fragment>\${children}</fragment>\``
- C) `html\`\${children}\`` (no wrapper)

**Recommendation:** Option A for JSX parity

### 4. Event Handler Naming

**JSX:** `onClick={handler}` (camelCase)
**HTML:** `onclick="handler"` (lowercase)
**Templates:** Which convention?

**Options:**
- A) Match JSX (camelCase): `<button onClick="\${handler}">`
- B) Match HTML (lowercase): `<button onclick="\${handler}">`
- C) Support both

**Recommendation:** Option C (support both, normalize to lowercase internally)

### 5. Parser Choice

**DOMParser:**
- ✅ Fast, native
- ❌ Browser-only

**Manual Parser:**
- ✅ Universal (Node, browser, edge)
- ❌ More complex

**Recommendation:** Start with DOMParser, add manual parser if SSR needed

### 6. Cache Invalidation

**Problem:** When to invalidate template cache?

**Options:**
- A) Never (templates are static)
- B) LRU eviction (memory limits)
- C) Manual invalidation API

**Recommendation:** Option A for MVP, Option B for production

### 7. Build Plugin Integration

**Problem:** How do users enable build transformation?

**Options:**
- A) Separate Babel plugin (user adds to config)
- B) Built into existing Babel plugin (auto-detect html\`)
- C) Vite/Rollup plugins (separate from Babel)

**Recommendation:** Option B for simplicity (auto-detect in existing plugin)

---

## Performance Considerations

### Runtime Parser

**Overhead:**
- First call: Parse HTML + build AST (~1-5ms for small templates)
- Cached calls: Clone template + inject values (~0.1ms)

**Optimization:**
- Cache by `strings` reference (not content hash)
- Reuse AST structure, only inject dynamic values
- Batch static children into DocumentFragments

### Build Transform

**Benefits:**
- Zero runtime parsing overhead
- Smaller bundle size (no parser code)
- Direct AST objects (same as JSX)

**Trade-offs:**
- Build time increase (minimal, same as JSX)
- Source maps complexity

---

## Implementation Priorities

### Must Have (MVP)

- ✅ Runtime `html` function
- ✅ Basic HTML parsing (tags, attributes, children)
- ✅ Interpolation support
- ✅ AST generation
- ✅ Template caching
- ✅ Integration with mount()

### Should Have (V1)

- ✅ Build transform plugin
- ✅ Component detection
- ✅ Fragment support
- ✅ Event handler normalization
- ✅ Comprehensive tests

### Nice to Have (Future)

- ⏺ SSR support (manual parser)
- ⏺ Advanced caching (LRU, size limits)
- ⏺ Source maps for transforms
- ⏺ Performance benchmarks
- ⏺ Migration tooling

---

## Conclusion

The proposed template string system is **architecturally sound** and aligns well with existing JSX infrastructure:

1. **Development:** Runtime `html\`` parsing with caching - minimal overhead
2. **Production:** Build-time transformation to AST objects - zero overhead
3. **Consistency:** Same semantics as JSX (reactivity, components, events)
4. **Migration:** Reuse existing mount/registry systems - no changes needed

**Key Insight:** Template strings and JSX are just two syntaxes for the same AST structure. The runtime parser and build transformer both produce identical HellaNode objects that mount() already knows how to render.

**Next Steps:**
1. Validate architectural decisions
2. Prototype runtime parser
3. Extend Babel plugin for template detection
4. Performance benchmarks
