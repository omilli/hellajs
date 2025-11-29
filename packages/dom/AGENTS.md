# DOM Package

Fine-grained reactive DOM manipulation with automatic cleanup.

## Architecture Overview

### Mental Model

The system enables **surgical DOM updates** without virtual DOM diffing:
- **Nodes**: Only elements with reactive dependencies update, not entire trees
- **Cleanup**: MutationObserver auto-disposes effects/events on node removal
- **Events**: Global delegation via single listener per type on document (capture phase)
- **Lists**: Keyed reconciliation using LIS algorithm for minimal moves
- **Portals**: Render children to different DOM locations while maintaining lifecycle
- **Custom Elements**: Light DOM by default for full compatibility with existing internals

### Key Components

- **mount.ts**: HellaNode → DOM, reactive bindings, lifecycle hooks (accepts selector or Element)
- **element.ts**: Custom element definition with `element()`
- **forEach.ts**: Keyed list reconciliation with multiple fast paths
- **portal.ts**: Render children to different DOM target with cleanup tracking
- **ref.ts**: Reactive reference API for existing DOM with auto-watching
- **html.ts**: Tagged template literal parser, AST caching, slot substitution
- **component.ts**: Component scope management for automatic effect cleanup
- **registry.ts**: Effect/event storage, MutationObserver cleanup, multi-selector system
- **events.ts**: Global event delegation system (capture phase)

## Custom Elements

### element

Creates native Custom Elements with HellaJS reactivity. Uses light DOM only for full compatibility with existing DOM internals (event delegation, MutationObserver cleanup, global CSS).

**Basic usage**:
```js
import { element, html } from '@hellajs/dom'
import { signal } from '@hellajs/core'

element('my-counter', (props) => {
  const count = signal(Number(props.initial?.()) || 0)
  
  return html`
    <button on:click=${() => count(count() - 1)}>-</button>
    <span>${count}</span>
    <button on:click=${() => count(count() + 1)}>+</button>
  `
})
```

```html
<my-counter initial="5"></my-counter>

<style>
  /* Global CSS works with light DOM */
  my-counter button { background: blue; }
</style>
```

**Props as reactive functions**:
- Any attribute accessed via `props.attrName()` returns current value
- Props are reactive - when passed as function children, effects re-run on attribute change
- Access via Proxy - no need to declare observed attributes
- Returns `string | null` (null if attribute not set)

**Reactive attribute updates**:
```js
element('reactive-label', (props) => ({
  tag: 'span',
  children: [props.value]  // Reactive - updates when attribute changes
}))

// External attribute changes trigger re-render
const el = document.querySelector('reactive-label')
el.setAttribute('value', 'new value')  // DOM updates synchronously
```

**Slots (Content Projection)**:
- `props.children`: Default slot - child nodes without `slot` attribute
- `props.slots`: Named slots - `Record<string, Node[]>` keyed by slot name
- Children are captured before mount and projected as raw DOM nodes

```js
element('my-card', (props) => html`
  <div class="card">
    <header>${props.slots?.header}</header>
    <main>${props.children}</main>
    <footer>${props.slots?.footer}</footer>
  </div>
`)
```

```html
<my-card>
  <h2 slot="header">Card Title</h2>
  <p>Default slot content goes here</p>
  <span slot="footer">Footer text</span>
</my-card>
```

**Lifecycle**:
- `connectedCallback`: Captures children/slots, creates props Proxy, wraps render in `scope()`, defers mount via microtask
- `disconnectedCallback`: Disposes scope (cleans up all effects), resets state
- Reconnecting an element re-runs the render function fresh
- Mount is deferred to allow browser to parse children before capture

### Portal

Renders children to a different DOM location while maintaining lifecycle and reactivity. Uses boundary markers for cleanup tracking, similar to ForEach.

**Basic usage**:
```js
import { Portal, mount, html } from '@hellajs/dom'

mount(html`
  <div>
    <${Portal} to="#modal-root">
      <div class="modal">Modal content here</div>
    </${Portal}>
  </div>
`)
```

**Insert types**:
```js
// Default: append to target
Portal({ to: "#target", children: [...] })

// Prepend before existing content
Portal({ to: "#target", type: "prepend", children: [...] })

// Replace all target content
Portal({ to: "#target", type: "replace", children: [...] })

// Insert before target element
Portal({ to: "#target", type: "before", children: [...] })

// Insert after target element
Portal({ to: "#target", type: "after", children: [...] })
```

**Reactive content**:
```js
const content = signal("initial")

mount(html`
  <${Portal} to="#modal-root">
    <span>${content}</span>
  </${Portal}>
`)

content("updated") // Portal content updates reactively
```

**Cleanup**: Portal content is automatically cleaned up when the marker comment is removed from DOM via `__hella_portal_cleanup` function.

### mount

Mounts a HellaNode to a DOM element, replacing all existing content. Accepts either a CSS selector string or an Element directly.

```js
import { mount, html } from '@hellajs/dom'

// With selector (default: "#app")
mount(html`<div>Content</div>`)
mount(html`<div>Content</div>`, '#container')

// With Element directly
const container = document.getElementById('widget')
mount(html`<div>Content</div>`, container)
```

## Template Syntax

### html`` Tagged Template

Converts HTML-like strings into HellaNode AST. Supports dynamic interpolations in attributes, content, and children. Uses `__SLOT_N__` placeholder markers internally.

**Basic usage**:
```js
// Static HTML
const node = html`<div class="container">Hello</div>`

// Dynamic text content
const count = signal(5)
const node = html`<div>Count: ${count}</div>`

// Dynamic attributes
const className = signal('active')
const node = html`<button class=${className}>Click</button>`

// Multiple interpolations
const a = signal(1), b = signal(2)
const node = html`<div>${a} + ${b} = ${() => a() + b()}</div>`
```

**Attribute prefixes**:
```js
// on: for event handlers
html`<button on:click=${() => count(count() + 1)}>Increment</button>`

// bind: for reactive bindings (updates when signal changes)
html`<div bind:class=${className}>Content</div>`

// hooks: for lifecycle hooks
html`<div hooks:afterMount=${() => console.log('mounted')}>Content</div>`
html`<div hooks:beforeDestroy=${() => console.log('cleanup')}>Content</div>`

// Boolean attributes
html`<input disabled />` // disabled=true
```

**Special tags**:
```js
// Fragment tag ($) for multiple root elements
html`<div>A</div><div>B</div>` // Returns { tag: "$", children: [...] }

// List rendering with ForEach component
html`<ul>
  <${ForEach} each=${items} use=${item => html`<li>${item}</li>`} fallback=${html`<li>No items</li>`} />
</ul>`

// Portal for rendering to different target
html`<${Portal} to="#modal-root"><div>Modal</div></${Portal}>`

// Dynamic components
const Button = (props: any) => html`<button>${props.children}</button>`
html`<${Button}>Click</${Button}>`
html`<${Button} class="primary">Click</${Button}>`
```

### Component Functions

Create reusable component functions that return HellaNode trees. The `html`` template literal automatically caches parsed AST by TemplateStringsArray identity. Components are wrapped with `componentScope` for automatic effect cleanup.

**Basic component**:
```js
const Greeting = (props: { name: string }) => 
  html`<div>Hello ${props.name}</div>`

// Usage
mount(Greeting({ name: "World" }))
```

**Components with children**:
```js
const Card = (props: { children: any }) => 
  html`<div class="card">${props.children}</div>`

// Usage with children (single child unwrapped, multiple wrapped in array)
html`<${Card}>Content here</${Card}>`
```

**Components with events**:
```js
const Button = (props: { onClick: () => void; children: any }) =>
  html`<button on:click=${props.onClick}>${props.children}</button>`

// Usage (props from on:, bind:, hooks: merged into props object)
html`<${Button} on:click=${handleClick}>Click Me</${Button}>`
```

**Nested components**:
```js
const Inner = (props: any) => html`<span>${props.text}</span>`
const Outer = (props: any) => html`
  <div>
    <h1>${props.title}</h1>
    ${Inner({ text: props.content })}
  </div>
`
```

**Component scope**: Dynamic components are automatically wrapped with `componentScope()` which creates a reactive scope. When the DOM element is removed, the scope is disposed, cleaning up all effects created within that component.

```js
// Internal: what html`` generates for dynamic components
componentScope(Button, { onClick: handler, children: "Click" })
```

**Passthrough components**: Certain components like `ForEach` bypass `componentScope` wrapping because they handle their own lifecycle management. These are called directly without the automatic scope wrapper.

```js
// Passthrough components (e.g., ForEach)
ForEach({ each: items, use: renderFn, fallback: emptyState })

// Regular components (wrapped in componentScope)
componentScope(Button, { onClick: handler })
```

### $ref API

Reactive reference to existing DOM elements with automatic watching for dynamically added elements.

**Basic usage**:
```js
// Select all elements matching selector
const buttons = $ref('.btn')

// Get raw DOM node (callable with optional index)
buttons()    // First element
buttons(1)   // Second element

// Bind reactive text content (form elements use .value, others use .textContent)
buttons.bind(() => count())

// Bind attributes (supports reactive functions)
buttons.bind({ disabled: () => isLoading(), class: ['btn', 'primary'] })

// Add event handlers (uses global delegation)
buttons.on('click', () => count(count() + 1))

// Add lifecycle hooks (stackable)
buttons.hooks({ afterMount: () => console.log('mounted') })
```

**Chaining**:
```js
$ref('.counter')
  .bind(() => `Count: ${count()}`)
  .bind({ class: () => count() > 10 ? 'high' : 'low' })
  .on('click', () => count(count() + 1))
```

**Imperative access**:
```js
// Access individual ReactiveElement wrappers
$ref('.items').forEach((element, index) => {
  element.bind(`Item ${index}`)
})

// Direct node access via bracket notation
const wrapper = $ref('.single')[0]
console.log(wrapper.node) // The DOM element

// Length property
console.log($ref('.items').length) // Number of matched elements
```

**Cleanup**:
```js
const ref = $ref('.dynamic')
// ... operations ...
ref.dispose() // Stop watching, clear queued ops, unregister from multiSelectors
```

**Key behaviors**:
- Uses querySelectorAll internally - operations apply to all matched elements
- Watches for new elements via MutationObserver and applies queued operations
- Form elements (INPUT, TEXTAREA, SELECT) use `.value` instead of `.textContent` for text binding
- Operations are queued and applied to future matching elements automatically
- Hooks are stackable - multiple hooks of same type all execute
- `afterMount` hooks called immediately if element already mounted

## Key Data Structures

**HellaElement**
```typescript
Element & {
  __hella_effects?: (() => void)[]              // Array of effect disposers
  __hella_handlers?: Record<string, EventListener>  // Event handlers by type
  __hella_mounted?: boolean                      // Mount state flag
  __hella_hooks?: HookStacks                     // Stackable lifecycle hooks
  __hella_component_scope?: () => void           // Component scope disposer
  __hella_portal_cleanup?: () => void            // Portal cleanup function
}

// HookStacks - hooks stored as arrays for stacking
interface HookStacks {
  beforeMount: Array<() => void>
  afterMount: Array<(node?: Element) => void>
  beforeDestroy: Array<(node?: Element) => void>
  afterDestroy: Array<() => void>
  beforeUpdate: Array<(node?: Element) => void>
  afterUpdate: Array<(node?: Element) => void>
}
```

**ForEach internals**
- Comment markers (startMarker/endMarker) create stable boundaries with text "forEach"
- `keyToNode`: Map<key, Node> tracks DOM nodes by key
- `keyToItem`: Map<key, T> tracks item references for change detection
- `currentKeys`: unknown[] preserves key order for diffing
- Reusable collections swapped instead of reallocated each render

**html template internals**
- `templateCache`: WeakMap<TemplateStringsArray, InternalNode> caches all parsed templates
- `componentRegistry`: Map<Function, ComponentFunction> (defined but unused - placeholder for future caching)
- Placeholder markers: `__SLOT_N__` replaced during AST cloning
- Special markers: `__dynamicComponent` (index + props + children)

## Key Algorithms

### html Template Parsing

**Tokenization**: Single regex (`/<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g`) matches:
1. Closing tags (`</div>`)
2. Opening/self-closing tags (`<div>`, `<input />`)
3. Attributes string (captured for secondary parsing)
4. Text content between tags

**Attribute parsing**: Regex `/(on:[\w-]+|bind:[\w-]+|hooks:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g`
- `hooks:` prefix → `hooks` object (lifecycle hooks)
- `bind:` prefix → `bind` object (dynamic bindings)
- `on:` prefix → `on` object (event handlers)
- Other → `props` object (static attributes)
- First char code check for performance (h=104, b=98, o=111)

**AST Construction**:
1. Stack-based parser tracks nesting depth
2. Placeholders (`__SLOT_N__`) remain in AST as PlaceholderMarker objects
3. Dynamic tags: `<${Component}>` → DynamicComponentMarker with placeholder index
4. Text content parsed with `/__SLOT_(\d+)__/g` to extract placeholders
5. Root-level placeholder returns value directly (function, signal, or static)
6. Result: HellaNode tree with placeholder markers

**Value Substitution** (cloneWithValues):
1. Deep clone AST to avoid mutating cache (only mutable parts cloned)
2. Replace PlaceholderMarker with actual values from interpolation array
3. Resolve DynamicComponentMarker to `componentScope(fn, props)` calls
4. Children flattened with `.flat()` to prevent nested arrays
5. Single child in dynamic component unwrapped from array

**Caching Strategy**:
- Global `templateCache` WeakMap keyed by TemplateStringsArray
- WeakMap garbage collects when template string goes out of scope
- Cache stores parsed AST (with PlaceholderMarker objects), not final nodes
- Each call clones and substitutes fresh values into cached AST

### ForEach Reconciliation Fast Paths

1. **First render**: Empty currentKeys → build in DocumentFragment, single insert
2. **Identical array**: Same length, keys match, nodes unchanged → skip all DOM ops
3. **Complete replacement**: No key overlap → bulk remove/insert via fragment
4. **LIS algorithm**: Map positions, find longest increasing subsequence, move only non-LIS elements

**LIS purpose**: Identifies elements already in correct relative order. Only moves elements outside subsequence. O(n log n) via binary search.

**Key resolution**: Keys extracted from `element.props.key` if HellaNode, defaults to array index. Uses reference equality (`!==`) like React/Solid - new object reference triggers re-render even if content identical.

**Memory optimization**: Collections (newKeys, newKeyToNode, newKeyToItem, nodesToRemove) are cleared and reused rather than reallocated. Map references swapped at end of render cycle.

### Event Delegation

- Single listener per event type on document.body (capture phase)
- Uses `composedPath()` for pre-computed ancestor chain (faster than parentNode walk)
- Fast exit if no handlers registered via `handlerCounts.has(type)` check
- Handler invoked with `handler.call(element, event)`
- Traverses entire path - no stopPropagation by default

### Cleanup System

- MutationObserver queues removals/additions in Sets
- setTimeout defers processing (non-blocking)
- `isConnected` and `parentNode` checks skip moved nodes (vs removed)
- Recursively disposes effects and clears handlers using iterative stack
- Runs beforeDestroy hooks before cleanup, afterDestroy hooks after
- Component scope disposed during cleanup if present
- Portal cleanup function called during cleanup if present

### Mount System

- MutationObserver detects added nodes and queues for mount
- setTimeout defers mount queue processing
- `isConnected` check skips nodes removed before flush
- Recursively sets `__hella_mounted = true` and runs afterMount hooks
- Uses iterative stack-based traversal (not recursion)

## Performance Patterns

**Hot path optimizations**:
- While loops with cached length: `let i = 0, len = arr.length; while (i < len)`
- DocumentFragment batching for bulk inserts
- Map reference swapping instead of recreation
- Early exits: identical array check, empty array path
- Array.join for string concatenation instead of +=
- Direct property checks (`Object.hasOwn(node, key)`) for type guards
- First char code check for attribute prefix detection (h=104, b=98, o=111)
- Fast exit in delegatedHandler if no handlers for event type

**Memory management**:
- Comment markers persist across updates (not recreated)
- Batch collect removals before DOM operations
- Deferred cleanup via setTimeout
- Effect disposers stored in array (push for multiple)
- WeakMap for template cache (auto garbage collection)
- Shallow AST cloning (only mutable parts cloned)
- Reusable collections in ForEach (cleared, not reallocated)

**html template optimizations**:
- Single-pass tokenization with combined regex
- AST parsing happens once per unique template string (cached globally)
- Value substitution via cloning (preserves cached AST)
- Automatic caching for all `html`` calls
- Root-level placeholder returns value directly without wrapping
## Non-Obvious Behaviors

**html template system**:
- **Automatic caching**: All `html`` calls cached by TemplateStringsArray identity
- **Placeholder format**: Uses `__SLOT_N__` markers (not `__HELLA_N__`)
- **Root-level interpolation**: `html`${value}`` returns value directly, not wrapped
- **Dynamic components**: `<${Comp}>` creates DynamicComponentMarker with placeholder index
- **Props merging**: Dynamic component collects props, on, bind, hooks into single props object
- **Children as props**: Single child unwrapped, multiple wrapped in array, passed as `props.children`
- **Attribute prefixes**: `on:` → events, `bind:` → bindings, `hooks:` → lifecycle
- **Boolean attributes**: `disabled` without value → `true`, removed when `false/null/undefined`
- **AST flattening**: Children array flattened with `.flat()` to prevent nested structures
- **Fragment tag**: Multiple root elements wrapped in `{ tag: "$", children: [...] }`
- **Component scope**: Dynamic components wrapped with `componentScope()` for effect cleanup
- **Passthrough components**: `ForEach` and `Portal` bypass componentScope, called directly

**DOM rendering**:
- **$ref().bind() auto-detects form elements**: Checks tagName against Set(['INPUT', 'TEXTAREA', 'SELECT']), sets `.value` instead of `.textContent`
- **$ref watches for new elements**: Uses MutationObserver + multiSelectors Map to apply queued operations to dynamically added elements
- **ForEach.isForEach flag**: mount.ts checks this to call ForEach with parent vs resolving
- **Portal.isPortal flag**: mount.ts checks this to call Portal with parent vs resolving
- **ForEach fallback**: Renders fallback node when array empty, auto-removes when items added
- **Keys default to index**: No `props.key` → uses array index (causes replacement vs reordering)
- **Reference equality on key match**: New item reference triggers re-resolution even if key unchanged (like React/Solid)
- **Lifecycle hook stacking**: Hooks stored as arrays in `__hella_hooks`, multiple hooks of same type all execute
- **Lifecycle timing**: beforeMount sync before appendChild, afterMount deferred via setTimeout after DOM insertion
- **beforeUpdate/afterUpdate hooks**: Run inline within effects when `__hella_mounted` is true
- **Reactive children wrapped in markers**: START/END comments provide stable insertion point
- **Value normalization**: false/null/undefined → empty string, zero preserved
- **Attribute removal**: renderProp removes attribute when value is false/null/undefined, true sets empty string
- **Array attribute values**: Joined with spaces and filtered for falsy (useful for class lists)
- **Event delegation in capture phase**: document.body.addEventListener(type, handler, true)
- **Event handler lookup via composedPath**: Pre-computed ancestor chain for faster traversal
- **Comment markers visible in childNodes**: Empty forEach leaves 2 comment nodes (not in .children)
- **isConnected AND parentNode check**: Only cleans truly removed nodes, not repositioned
- **Mount queue processing**: Deferred via setTimeout, skips nodes that become disconnected before flush
- **__hella_mounted flag**: Set synchronously in mount() for root, async via MutationObserver for descendants
- **Effects storage**: Effects stored in array, pushed when multiple effects on same element
- **Component scope cleanup**: `__hella_component_scope` called during node cleanup to dispose all component effects
- **Portal cleanup**: `__hella_portal_cleanup` called during marker cleanup to remove portal content from target


**Custom elements (element)**:
- **Light DOM only**: No shadow DOM support (breaks reactivity internals)
- **Props via Proxy**: Any attribute accessible via `props.attrName()` without declaration
- **Reactive props**: Props are functions that track internal version signal
- **Synchronous updates**: setAttribute/removeAttribute overridden to trigger immediate reactivity
- **Null for missing**: Attributes not set return `null` from prop function
- **Scope wrapping**: Render function wrapped in `scope()` for automatic effect cleanup
- **Disconnect cleanup**: `disconnectedCallback` disposes scope and resets all internal state
- **Reconnect fresh**: Element reconnection re-runs render function from scratch
- **Deferred mount**: Mount deferred via `Promise.resolve().then()` to allow browser child parsing
- **Slot capture**: Children captured once before mount, not reactive to later child changes
- **Named slots**: Child `slot` attribute → `props.slots[name]`, no attribute → `props.children`
- **Raw Node projection**: Slots projected as real DOM nodes, not HellaNodes
- **Whitespace filtering**: Text nodes with only whitespace are excluded from default slot
