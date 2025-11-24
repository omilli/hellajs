# DOM Package

Fine-grained reactive DOM manipulation with automatic cleanup.

## Architecture Overview

### Mental Model

The system enables **surgical DOM updates** without virtual DOM diffing:
- **Nodes**: Only elements with reactive dependencies update, not entire trees
- **Cleanup**: MutationObserver auto-disposes effects/events on node removal
- **Events**: Global delegation via single listener per type on document.body
- **Lists**: Keyed reconciliation using LIS algorithm for minimal moves

### Key Components

- **mount.ts**: HellaNode → DOM, reactive bindings, lifecycle hooks
- **forEach.ts**: Keyed list reconciliation with multiple fast paths
- **element.ts**: Chainable API for existing DOM (jQuery-like)
- **component.ts**: Tagged template literal parser, AST caching, component registry
- **registry.ts**: Effect/event storage and MutationObserver cleanup
- **events.ts**: Global event delegation system

## Template Syntax

### html`` Tagged Template

Converts HTML-like strings into HellaNode AST. Supports dynamic interpolations in attributes, content, and children.

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

// @ for reactive bindings (updates when signal changes)
html`<div @class=${className}>Content</div>`

// # for lifecycle hooks
html`<div #onMount=${() => console.log('mounted')}>Content</div>`

// Boolean attributes
html`<input disabled />` // disabled=true
```

**Special tags**:
```js
// <ForEach> - list rendering
html`<ul>
  <ForEach for=${items} each=${item => html`<li>${item}</li>`} />
</ul>`

// Dynamic components
const Button = component(props => html`<button>${props.children}</button>`)
html`<${Button}>Click</${Button}>`
html`<${Button} class="primary">Click</${Button}>`
```

### component() Wrapper

Creates reusable components with automatic AST caching. Each unique template string is parsed once and reused.

**Basic component**:
```js
const Greeting = component((props: { name: string }) => 
  html`<div>Hello ${props.name}</div>`
)

// Usage
mount(Greeting({ name: "World" }))
```

**Components with children**:
```js
const Card = component((props: { children: any }) => 
  html`<div class="card">${props.children}</div>`
)

// Usage with children
html`<${Card}>Content here</${Card}>`
```

**Components with events**:
```js
const Button = component((props: { onClick: () => void; children: any }) =>
  html`<button on:click=${props.onClick}>${props.children}</button>`
)

// Usage
html`<${Button} on:click=${handleClick}>Click Me</${Button}>`
```

**Nested components**:
```js
const Inner = component(props => html`<span>${props.text}</span>`)
const Outer = component(props => html`
  <div>
    <h1>${props.title}</h1>
    ${Inner({ text: props.content })}
  </div>
`)
```

**Why component() is needed**: Without component(), html`` parses the template string on every call. With component(), the parsed AST is cached by TemplateStringsArray identity, and only value substitution happens on subsequent calls.

## Key Data Structures

**HellaElement**
```typescript
Element & {
  __hella_effects?: Set<() => void>           // Effect disposers
  __hella_handlers?: Record<string, EventListener>  // Event handlers
  __hella_mounted?: boolean                    // Mount state flag
  __hella_lifecycle?: {                        // Lifecycle hooks
    onBeforeMount, onMount, onBeforeUpdate, onUpdate,
    onBeforeDestroy, onDestroy
  }
}
```

**forEach internals**
- Comment markers (startMarker/endMarker) create stable boundaries
- `keyToNode`: Map<key, Node> tracks DOM nodes by key
- `keyToItem`: Map<key, T> enables deepEqual item change detection
- `currentKeys`: unknown[] preserves key order for diffing

**html/component internals**
- `componentRegistry`: Map<Function, cachedFn> stores component wrappers
- `activeCache`: WeakMap<TemplateStringsArray, AST> caches parsed templates
- Placeholder markers: `__HELLA_N__` replaced during AST cloning
- Special markers: `__forEach`, `__dynamicComponent`, `__placeholder`

## Key Algorithms

### html Template Parsing

**Tokenization**: Single regex (`/<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g`) matches:
1. Closing tags (`</div>`)
2. Opening/self-closing tags (`<div>`, `<input />`)
3. Attributes string (captured for secondary parsing)
4. Text content between tags

**Attribute parsing**: Separate regex for `name="value"` or `name=__HELLA_N__` patterns
- `on:` prefix → `on` object (event handlers)
- `@` prefix → `bind` object (dynamic bindings)
- `#` prefix → `lifecycle` object (lifecycle hooks)
- Other → `props` object (static attributes)

**AST Construction**:
1. Stack-based parser tracks nesting depth
2. Placeholders (`__HELLA_N__`) remain in AST as markers
3. Special tags: `<ForEach>` → `__forEach` marker, `<${Component}>` → `__dynamicComponent` marker
4. Result: HellaNode tree with placeholder markers

**Value Substitution** (cloneWithValues):
1. Deep clone AST to avoid mutating cache
2. Replace `__placeholder` markers with actual values
3. Resolve `__forEach` to `forEach()` function calls
4. Resolve `__dynamicComponent` to component function calls with props
5. Flatten arrays in children to avoid nesting

**Caching Strategy**:
- `component()` creates WeakMap keyed by TemplateStringsArray
- WeakMap garbage collects when template string goes out of scope
- Cache stores parsed AST (with placeholders), not final nodes
- Each call clones and substitutes fresh values into cached AST

### forEach Reconciliation Fast Paths

1. **First render**: Empty currentKeys → build in DocumentFragment, single insert
2. **Identical array**: Same length, keys match, nodes unchanged → skip all DOM ops
3. **Complete replacement**: No key overlap → bulk remove/insert via fragment
4. **LIS algorithm**: Map positions, find longest increasing subsequence, move only non-LIS elements

**LIS purpose**: Identifies elements already in correct relative order. Only moves elements outside subsequence. O(n log n) via binary search.

### Event Delegation

- Single listener per event type on document.body (capture phase)
- Walks up from event.target checking `__hella_handlers`
- Continues bubbling after handler execution

### Cleanup System

- MutationObserver queues removals in Set
- setTimeout defers processing (non-blocking)
- `isConnected` check skips moved nodes (vs removed)
- Recursively disposes effects and clears handlers

## Performance Patterns

**Hot path optimizations**:
- While loops with cached length: `let i = 0, len = arr.length; while (i < len)`
- DocumentFragment batching for bulk inserts
- Map reuse: reassign keyToNode, don't recreate
- Early exits: identical array check, empty array path
- Array.join for string concatenation instead of +=
- Direct property checks (`node.prop !== undefined`) faster than `in` operator

**Memory management**:
- Comment markers persist across updates (not recreated)
- Batch collect removals before DOM operations
- Deferred cleanup via setTimeout
- Effect disposers in Set for O(1) cleanup
- WeakMap for template caches (auto garbage collection)
- Shallow AST cloning (only mutable parts cloned)

**html/component optimizations**:
- Single-pass tokenization with combined regex
- AST parsing happens once per unique template string
- Value substitution via cloning (preserves cached AST)
- Component registry avoids wrapper re-creation
- activeCache context for nested component() calls

## Non-Obvious Behaviors

**html/component system**:
- **html`` without component()**: No caching, parses every call (standalone usage)
- **html`` inside component()**: activeCache set, parsed AST cached by TemplateStringsArray identity
- **Placeholder substitution timing**: AST cached with markers, values substituted during cloning
- **<ForEach> syntax**: Parsed to `__forEach` marker, resolved to `forEach()` call during cloning
- **Dynamic components**: `<${Comp}>` creates `__dynamicComponent` marker with placeholder index
- **Component registry**: Stores wrapper function to avoid re-wrapping on each call
- **Props merging**: Dynamic component collects props, on, bind, lifecycle into single props object
- **Children as props**: Single child unwrapped, multiple wrapped in array, passed as `props.children`
- **Attribute prefixes**: `on:` → event handlers, `@` → dynamic bindings, `#` → lifecycle hooks
- **Boolean attributes**: `disabled` without value → `true`, removed when `false/null/undefined`
- **AST flattening**: Arrays in children flattened to prevent nested array structures

**DOM rendering**:
- **element().text() auto-detects form elements**: Checks tagName, sets `.value` for input/textarea/select instead of `.textContent`
- **forEach.isForEach flag**: mount.ts checks this to call forEach with parent vs resolving
- **Keys default to index**: No `props.key` → uses array index (causes replacement vs reordering)
- **deepEqual on key match**: Item data change triggers re-resolution even if key unchanged
- **Lifecycle timing**: onBeforeMount sync, onMount deferred via setTimeout, onBeforeUpdate/onUpdate inline within effects
- **Reactive children wrapped in markers**: START/END comments provide stable insertion point
- **Value normalization**: false/null/undefined → empty string, zero preserved
- **Attribute removal**: renderProp removes attribute when value is false/null/undefined, true sets empty string
- **Event bubbling through delegation**: Parent handlers fire for child events, check event.target vs this
- **Comment markers visible in childNodes**: Empty forEach leaves 2 comment nodes (not in .children)
- **isConnected prevents cleanup on moves**: Only cleans truly removed nodes, not repositioned
- **Mount queue processing**: Deferred via setTimeout, skips nodes that become disconnected before flush
- **__hella_mounted flag**: Set synchronously after mount for immediate reactive updates
