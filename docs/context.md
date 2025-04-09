# Context

The context system provides isolated environments for state and operations.

## Core Functionality

A Context object provides:
- Isolation from other contexts
- A unique identifier
- A cleanup method to release resources
- Reactive state management (signals, effects, computed values)
- DOM operations and event handling
- Rendering utilities

## Examples

### Creating Contexts

```typescript
import { context, getDefaultContext } from '@hellajs/core';

// Get the default global context
const defaultContext = getDefaultContext();

// Create a named custom context
const appContext = context('my-app');
```

### Context Cleanup

```typescript
// Create a context
const appContext = context('temporary');

// Use the context for operations...

// Clean up when no longer needed
appContext.cleanup();
```

### Context Isolation

```typescript
// Create two separate contexts
const ctx1 = context('first');
const ctx2 = context('second');

// Operations in one context don't affect the other
```

### Using Context-Specific Functions

```typescript
// Create a context
const ctx = context('feature');

// Use context-specific reactivity
const count = ctx.signal(0);
const doubled = ctx.computed(() => count() * 2);

// Create an effect within this context
ctx.effect(() => {
  console.log(`Count is now: ${count()}, doubled: ${doubled()}`);
});

// Updates are isolated to this context
count.set(5);
```

### Working with Root Elements

```typescript
import { getRootContext } from '@hellajs/core';

// Get a root context for a specific DOM element
const rootContext = getRootContext('#app-root');

// This provides access to events and other DOM-related features
// specific to the selected root element
```