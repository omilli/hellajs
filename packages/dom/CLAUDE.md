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
- **registry.ts**: Effect/event storage and MutationObserver cleanup
- **events.ts**: Global event delegation system

## Key Data Structures

**HellaElement**
```typescript
Element & {
  __hella_effects?: Set<() => void>           // Effect disposers
  __hella_handlers?: Record<string, EventListener>  // Event handlers
  onBeforeMount, onMount, onBeforeUpdate, onUpdate,
  onBeforeDestroy, onDestroy                   // Lifecycle hooks
}
```

**forEach internals**
- Comment markers (startMarker/endMarker) create stable boundaries
- `keyToNode`: Map<key, Node> tracks DOM nodes by key
- `keyToItem`: Map<key, T> enables deepEqual item change detection
- `currentKeys`: unknown[] preserves key order for diffing

## Key Algorithms

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

**Memory management**:
- Comment markers persist across updates (not recreated)
- Batch collect removals before DOM operations
- Deferred cleanup via setTimeout
- Effect disposers in Set for O(1) cleanup

## Non-Obvious Behaviors

- **element().text() auto-detects form elements**: Checks tagName, sets `.value` for input/textarea/select instead of `.textContent`
- **forEach.isForEach flag**: mount.ts checks this to call forEach with parent vs resolving
- **Keys default to index**: No `props.key` → uses array index (causes replacement vs reordering)
- **deepEqual on key match**: Item data change triggers re-resolution even if key unchanged
- **Lifecycle timing**: onBeforeMount sync, onMount via requestAnimationFrame, onBeforeUpdate/onUpdate inline
- **Reactive children wrapped in markers**: START/END comments provide stable insertion point
- **Value normalization**: false/null/undefined → empty string, zero preserved
- **Attribute removal**: renderProp removes attribute when value is false/null/undefined, true sets empty string
- **Event bubbling through delegation**: Parent handlers fire for child events, check event.target vs this
- **Comment markers visible in childNodes**: Empty forEach leaves 2 comment nodes (not in .children)
- **isConnected prevents cleanup on moves**: Only cleans truly removed nodes, not repositioned
- **Effects deleted from props**: After registration, prevents setting as DOM attribute
