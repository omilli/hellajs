---
applyTo: "packages/dom/**"
---

# DOM Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/dom provides DOM manipulation and JSX rendering with reactive updates.

## Structure
- `mount.ts` - Component mounting system with reactive rendering and lifecycle management
- `forEach.ts` - Efficient list rendering with key-based diffing and LIS optimization
- `events.ts` - Global event delegation system with bubbling traversal
- `cleanup.ts` - Automatic cleanup with MutationObserver-based lifecycle management
- `utils.ts` - DOM utility functions and type guards
- `types/` - TypeScript definitions for VNodes, HTML attributes, and element lifecycle

## Approach

### Component Mounting and Reactive Rendering
- VNodes rendered through recursive tree traversal with reactive property binding
- Signal dependencies automatically tracked during component render phase
- Dynamic content wrapped in effect functions for granular DOM updates
- Fragment support using DocumentFragment with marker-based insertion
- Lifecycle hooks (onUpdate/onDestroy) integrated directly into element properties

### Key-Based List Diffing with LIS Optimization
- forEach uses Map-based key tracking for efficient node reuse and repositioning
- Longest Increasing Subsequence (LIS) algorithm minimizes DOM move operations
- Three-phase diffing: reuse existing nodes, remove unused nodes, optimize reordering
- Complete replacement optimization when no keys match between renders
- Placeholder comments mark list boundaries for precise DOM insertion

### Global Event Delegation System
- Single delegated listener per event type attached to document.body
- Event bubbling traversed from target to root, checking for registered handlers
- Element-specific handler maps stored directly on DOM nodes for O(1) lookup
- Automatic cleanup when elements removed from DOM via MutationObserver
- Capture phase delegation ensures handlers fire before user-defined listeners

### Automatic Memory Management
- MutationObserver monitors DOM for removed elements and triggers cleanup
- Effect functions and event listeners automatically removed on element destruction
- Queued microtask cleanup prevents interference with ongoing DOM operations
- Recursive cleanup for all descendant elements when parent removed
- WeakRef-style cleanup prevents memory leaks in long-running applications

### Reactive Property Binding
- Signal values in props wrapped in effect functions for automatic updates
- Class arrays automatically flattened and filtered for dynamic styling
- Property vs attribute assignment determined by property existence on element
- Function values treated as reactive computations with automatic re-evaluation
- onUpdate callbacks triggered after reactive property changes applied

### VNode Resolution Pipeline
- Text values converted to TextNodes with automatic string coercion
- Function values wrapped in effects for reactive text content updates
- VNode objects recursively rendered through renderVNode transformation
- Native DOM nodes passed through unchanged for direct insertion
- Empty/undefined values replaced with comment nodes for DOM structure preservation