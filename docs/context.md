# Context

The context system provides isolated environments for state and operations.

## Core Functionality

A Context object provides:
- Isolation from other contexts
- A unique identifier
- A cleanup method to release resources

## Examples

### Creating Contexts

```typescript
import { context, getDefaultContext } from '@hellajs/core';

// Get the default global context
const defaultContext = getDefaultContext();

// Create a named custom context
const appContext = context('my-app');

// Create a context with auto-generated ID
const anotherContext = context();
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