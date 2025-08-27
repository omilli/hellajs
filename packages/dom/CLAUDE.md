# @hellajs/dom Instructions

Follow these instructions when working on the DOM package. @hellajs/dom provides reactive DOM manipulation, JSX rendering, and efficient list diffing with automatic memory management.

## Quick Reference

### Key Files
- `lib/mount.ts` - Component mounting system with reactive rendering
- `lib/forEach.ts` - Efficient list rendering with key-based diffing and LIS optimization
- `lib/events.ts` - Global event delegation system with bubbling traversal
- `lib/cleanup.ts` - Automatic cleanup with MutationObserver-based lifecycle management
- `lib/utils.ts` - DOM utility functions and type guards
- `lib/types/` - TypeScript definitions for VNodes, attributes, and element lifecycle
- `lib/index.ts` - Public API exports

## Architecture

### Core Design Principles
1. **Reactive Rendering**: Automatic DOM updates based on signal changes
2. **Memory Efficiency**: Automatic cleanup with MutationObserver lifecycle management
3. **Performance**: Key-based diffing with LIS optimization for minimal DOM operations
4. **Event Efficiency**: Global event delegation with O(1) handler lookup
5. **Developer Experience**: JSX support with type-safe DOM manipulation

### Mount System (`mount`)
```typescript
function mount(vNode: VNode | (() => VNode), rootSelector?: string): void
```

**Features**:
- Component mounting with reactive property binding
- Signal dependencies automatically tracked during render phase
- Dynamic content wrapped in effect functions for granular updates
- Fragment support using DocumentFragment with marker-based insertion
- Lifecycle hooks (onUpdate/onDestroy) integrated into element properties

**Core Behavior**:
- **VNode Resolution**: Recursive tree traversal with reactive property binding
- **Root Replacement**: Complete replacement of root element content
- **Function Components**: Automatic execution of function-based components
- **Reactive Context**: Establishes reactive context for dependency tracking

### List Rendering (`forEach`)
```typescript
function forEach<T>(
  each: T[] | Signal<T[]> | (() => T[]), 
  use: ForEach<T>
): (parent: HellaElement) => void
```

**Features**:
- Key-based diffing for efficient node reuse and repositioning
- Longest Increasing Subsequence (LIS) algorithm minimizes DOM moves
- Complete replacement optimization when no keys match
- Placeholder comments mark list boundaries for precise insertion
- Map-based key tracking for O(1) node lookup

**Optimization Strategy**:
- **Three-Phase Diffing**: Reuse existing nodes, remove unused, optimize reordering
- **LIS Algorithm**: Identifies minimal set of DOM moves required
- **Complete Replacement**: Falls back to full rebuild when no keys match
- **Memory Reuse**: Maintains Map of key-to-node relationships across renders

### Event System (`events`)
```typescript
function setNodeHandler(element: HellaElement, type: string, handler: EventListener): void
```

**Features**:
- Single delegated listener per event type on document.body
- Event bubbling traversed from target to root
- Element-specific handler maps stored on DOM nodes
- Automatic cleanup when elements removed via MutationObserver
- Capture phase delegation for consistent behavior

**Delegation Model**:
1. **Registration**: Single global listener per event type
2. **Bubbling Traversal**: Walk from event target up to document.body
3. **Handler Lookup**: O(1) lookup of handlers stored on each element
4. **Automatic Cleanup**: MutationObserver triggers handler removal

### Cleanup System (`cleanup`)
```typescript
function addElementEffect(element: HellaElement, effectFn: () => void): void
function addElementEvent(element: HellaElement, type: string, handler: EventListener): void
```

**Features**:
- MutationObserver monitors DOM for removed elements
- Effect functions and event listeners automatically cleaned up
- Queued microtask cleanup prevents interference with DOM operations
- Recursive cleanup for all descendant elements
- WeakRef-style cleanup prevents memory leaks

**Cleanup Process**:
1. **Observer Setup**: MutationObserver watches for childList changes
2. **Element Removal Detection**: Identifies removed nodes and descendants
3. **Effect Cleanup**: Disposes all tracked effects for removed elements
4. **Event Cleanup**: Removes event handlers from internal maps
5. **Memory Release**: Clears all references to prevent leaks

### State Management System

#### Element Lifecycle Tracking
Located in `cleanup.ts`:
- `EFFECTS` - Symbol for tracking element-specific effects
- `EVENTS` - Symbol for tracking element-specific event handlers
- `observer` - MutationObserver instance for DOM monitoring
- Element-specific cleanup maps for precise memory management

#### VNode Resolution Pipeline
- **Text Values**: Converted to TextNodes with automatic string coercion
- **Function Values**: Wrapped in effects for reactive text content updates
- **VNode Objects**: Recursively rendered through renderVNode transformation
- **Native DOM Nodes**: Passed through unchanged for direct insertion
- **Empty Values**: Replaced with comment nodes for structure preservation

#### Reactive Property Binding
- Signal values in props wrapped in effect functions
- Class arrays automatically flattened and filtered
- Property vs attribute assignment by property existence check
- Function values treated as reactive computations
- onUpdate callbacks triggered after property changes

## Implementation Details

### Mount Implementation
```typescript
// mount.ts:11-14 - Core mount function
export function mount(vNode: VNode | (() => VNode), rootSelector: string = "#app") {
  if (isFunction(vNode)) vNode = vNode();
  DOC.querySelector(rootSelector)?.replaceChildren(renderVNode(vNode));
}
```

**Key Mechanisms**:
- **Function Resolution**: Executes function components immediately
- **Root Selection**: CSS selector-based root element targeting
- **Complete Replacement**: replaceChildren for clean slate mounting
- **VNode Rendering**: Recursive transformation to DOM nodes

### forEach Implementation
```typescript
// forEach.ts:12-104 - List diffing with LIS optimization
const keyToNode = new Map<unknown, Node>();
let currentKeys: unknown[] = [];

// Three-phase diffing process:
// 1. Build new key list and reuse existing nodes
// 2. Remove unused nodes
// 3. Optimize reordering using LIS algorithm
```

**Diffing Strategy**:
- **Key Extraction**: From element.props.key or fallback to index
- **Node Reuse**: Maintains Map for O(1) node lookup by key
- **LIS Optimization**: Identifies nodes that don't need moving
- **Complete Replacement**: When no keys match between renders

### Event Implementation
```typescript
// events.ts:12-19 - Global event delegation setup
export function setNodeHandler(element: HellaElement, type: string, handler: EventListener) {
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    document.body.addEventListener(type, delegatedHandler, true);
  }
  addElementEvent(element, type, handler);
}
```

**Delegation Flow**:
- **Global Registration**: One listener per event type on document.body
- **Handler Storage**: Per-element handler maps using symbols
- **Bubbling Traversal**: Event target to root with handler checks
- **Capture Phase**: Uses capture=true for consistent ordering

### Cleanup Implementation
```typescript
// cleanup.ts:11-14 - Effect tracking per element
export function addElementEffect(element: HellaElement, effectFn: () => void) {
  element[EFFECTS] ??= new Set();
  element[EFFECTS].add(effectFn);
}
```

**Memory Management**:
- **Symbol-Based Storage**: EFFECTS and EVENTS symbols prevent conflicts
- **MutationObserver**: Watches childList changes with subtree=true
- **Microtask Cleanup**: queueMicrotask prevents DOM operation interference
- **Recursive Traversal**: Cleans up all descendant elements

## Development Guidelines

### Adding New DOM Features
1. **Understand Reactive Context**: Review `mount.ts` for reactive rendering patterns
2. **Maintain Memory Safety**: Ensure proper cleanup via `cleanup.ts` system
3. **Update Types**: Modify `types/` directory for TypeScript support
4. **Add Tests**: Include rendering, cleanup, and performance tests
5. **Follow Event Patterns**: Use global delegation for new event types

### Performance Considerations
- Use keys for list items to enable efficient diffing
- Cache VNodes outside render functions when possible
- Leverage reactive effects for granular DOM updates
- Monitor DOM operation frequency in performance-critical sections
- Profile with realistic component trees and update patterns

### Common Patterns
```typescript
// ✅ Basic component mounting
mount(() => h('div', { class: 'app' }, 'Hello World'));

// ✅ Reactive content with signals
const count = signal(0);
mount(() => 
  h('button', 
    { onClick: () => count(count() + 1) }, 
    () => `Count: ${count()}`
  )
);

// ✅ List rendering with keys
const items = signal([{ id: 1, text: 'Item 1' }]);
mount(() =>
  h('ul', {},
    forEach(items, (item) =>
      h('li', { key: item.id }, item.text)
    )
  )
);

// ✅ Fragment rendering
mount(() => [
  h('h1', {}, 'Title'),
  h('p', {}, 'Content')
]);

// ✅ Lifecycle management
mount(() =>
  h('div', {
    onUpdate: () => console.log('Component updated'),
    onDestroy: () => console.log('Component destroyed')
  })
);
```

### API Consistency Rules
- All VNode creation follows h(tag, props, children) pattern
- Event handlers use camelCase naming (onClick, onMouseOver)
- Reactive values automatically wrapped in effects
- Keys should be stable identifiers for list items
- Cleanup happens automatically via MutationObserver

## Integration

### With @hellajs/core
- Signals trigger automatic DOM updates through effects
- Computed values provide derived state for components
- Batching ensures efficient DOM update cycles
- Effect disposal integrated with element cleanup

### With @hellajs/css
```typescript
import { css } from '@hellajs/css';
import { h } from '@hellajs/dom';

// Reactive styles
const isActive = signal(false);
const buttonClass = css({
  padding: '0.5rem 1rem',
  backgroundColor: () => isActive() ? 'blue' : 'gray'
});

mount(() =>
  h('button', 
    { 
      class: buttonClass,
      onClick: () => isActive(!isActive())
    },
    'Toggle'
  )
);
```

### Advanced Usage
```typescript
// Custom component with cleanup
function Timer() {
  const time = signal(new Date());
  
  // Effect will be automatically cleaned up when component unmounts
  const interval = setInterval(() => time(new Date()), 1000);
  
  return h('div', {
    onDestroy: () => clearInterval(interval)
  }, () => time().toLocaleTimeString());
}

// Higher-order components
function withLoading<T>(Component: (props: T) => VNode) {
  return (props: T & { loading: boolean }) =>
    props.loading 
      ? h('div', {}, 'Loading...')
      : Component(props);
}

// Portal-like behavior
function Portal({ children, target }: { children: VNode[], target: string }) {
  return h('div', {
    onUpdate: () => {
      const targetElement = document.querySelector(target);
      if (targetElement) {
        mount(() => children, target);
      }
    }
  });
}
```

### Error Handling
- Invalid VNodes logged with helpful error messages
- Event handler errors don't break event delegation
- Cleanup continues even if individual effects throw
- Mount failures leave DOM in consistent state