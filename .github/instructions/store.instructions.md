---
applyTo: "{packages/store/**,tests/store/**}"
---

# Store Package Instructions

@hellajs/store is a reactive state management system built on @hellajs/core primitives, providing deep object reactivity with selective readonly controls.

## Quick Reference

### Core API
```typescript
import { store } from '@hellajs/store';

// Basic reactive store
const user = store({ name: 'John', email: 'john@example.com' });

// Readonly store (all properties immutable)
const config = store({ apiKey: 'abc123' }, { readonly: true });

// Selective readonly (specific properties immutable)
const book = store(
  { title: 'Book', author: 'Author', year: 2023 },
  { readonly: ['title', 'author'] }
);
```

### Essential Methods
- `store.property()` - Get property value
- `store.property(value)` - Set property value (if mutable)
- `store.set(obj)` - Replace entire store state
- `store.update(partial)` - Merge partial updates into store
- `store.computed()` - Get plain object snapshot
- `store.cleanup()` - Clean up all reactive subscriptions

## File Structure
```
lib/
├── index.ts    # Public API exports
├── store.ts    # Core store factory and implementation
└── types.ts    # TypeScript type definitions
```

## Core Implementation Details

### Store Factory (`lib/store.ts`)
The main `store()` function provides four overloaded signatures:
1. `store(obj, { readonly: ['key1', 'key2'] })` - Selective readonly
2. `store(obj, { readonly: true })` - All readonly
3. `store(obj, { readonly: false })` - All mutable (default)
4. `store(obj)` - All mutable (no options)

**Key Functions:**
- `defineProp()` - Converts object properties to signals or nested stores
- `isPlainObject()` - Determines if value should become nested store
- `applyUpdate()` - Handles partial deep updates
- `writeFull()` - Replaces entire store state
- `writePartial()` - Merges partial updates

### Type System (`lib/types.ts`)
- `Store<T, R>` - Main store interface with lifecycle methods
- `StoreOptions<T>` - Configuration options type
- `PartialDeep<T>` - Enables partial nested updates
- `ReadonlyKeys<T, O>` - Computes readonly property keys

## Development Patterns

### Creating Stores
```typescript
// Simple flat store
const settings = store({
  theme: 'dark',
  language: 'en'
});

// Nested reactive store
const userProfile = store({
  personal: {
    name: 'Alice',
    email: 'alice@example.com'
  },
  preferences: {
    notifications: true,
    theme: 'light'
  }
});

// Mixed readonly configuration
const appConfig = store({
  version: '1.0.0',      // readonly
  buildDate: new Date(), // readonly
  debugMode: false       // mutable
}, { readonly: ['version', 'buildDate'] });
```

### Updating Stores
```typescript
// Direct property updates
user.name('Bob');
user.preferences.theme('dark');

// Partial deep updates
user.update({
  personal: {
    email: 'bob@example.com' // Only updates email, preserves name
  }
});

// Full state replacement
user.set({
  personal: { name: 'Charlie', email: 'charlie@example.com' },
  preferences: { notifications: false, theme: 'light' }
});
```

### Reactivity Integration
```typescript
import { effect } from '@hellajs/core';

const cart = store({
  items: [],
  total: 0
});

// Reactive effect
effect(() => {
  console.log(`Cart total: $${cart.total()}`);
});

// Computed snapshot for reactive contexts
effect(() => {
  const snapshot = cart.computed();
  updateUI(snapshot);
});
```

### Memory Management
```typescript
// Always cleanup stores when done
const tempStore = store({ data: 'temp' });

// Later...
tempStore.cleanup(); // Prevents memory leaks

// Automatic nested cleanup
const complexStore = store({
  level1: {
    level2: {
      data: 'deep'
    }
  }
});

complexStore.cleanup(); // Cleans up entire tree
```

## Testing Guidelines

### Test Structure
Located in `tests/store/index.test.ts`, organized by functionality:

1. **Basic Operations** - Property access, updates, nested updates
2. **Partial Updates** - `update()` method with partial objects
3. **State Replacement** - `set()` method for full replacement
4. **Reactivity** - Integration with effects and computed values
5. **Readonly Enforcement** - Various readonly configurations
6. **Memory Management** - Cleanup functionality
7. **Deep Nesting** - Complex nested object scenarios

### Key Test Patterns
```typescript
// Property reactivity
test('updates nested properties reactively', () => {
  const store = store({ user: { name: 'Alice' } });
  expect(store.user.name()).toBe('Alice');
  
  store.user.name('Bob');
  expect(store.user.name()).toBe('Bob');
});

// Partial updates preserve structure
test('partial updates merge correctly', () => {
  const product = store({
    id: 'prod-123',
    details: { name: 'Laptop', price: 1000 }
  });
  
  product.update({ details: { price: 950 } });
  
  expect(product.details.price()).toBe(950);
  expect(product.details.name()).toBe('Laptop'); // Preserved
});

// Readonly enforcement
test('readonly properties cannot be updated', () => {
  const config = store({ key: 'value' }, { readonly: ['key'] });
  
  // TypeScript error + runtime protection
  expect(() => config.key('new')).toThrow();
});
```

### Running Tests
```bash
# Test store package specifically
bun check store

# Run with coverage
bun coverage

# All tests
bun check --all
```

## Architecture Principles

### Object-to-Signal Transformation
- Plain objects → reactive proxy structures
- Properties → Signal (primitives/arrays) or Store (objects)
- Functions preserved without signal wrapping
- Property descriptors maintained for proper enumeration

### Selective Readonly System
- Runtime + compile-time readonly enforcement
- Three modes: all readonly, selective keys, fully mutable
- Readonly properties use `computed()` for reactivity without mutation
- Type-safe readonly constraints via conditional types

### Deep Nested Reactivity
- Recursive store creation for nested plain objects
- Independent Store instances with isolated cleanup
- Update propagation through method delegation
- `isPlainObject()` filtering excludes arrays/null/non-plain objects

### Partial Update Merging
- `PartialDeep<T>` enables optional nested properties
- Mixed update scenarios: nested stores vs direct signals
- Type-safe update delegation preserves structure
- Merge semantics preserve existing state

### Reserved Namespace Protection
- System methods protected: `computed`, `set`, `update`, `cleanup`
- Reserved keys excluded from transformation/iteration
- Method precedence over conflicting data properties
- Graceful collision handling

### Memory Management
- Recursive cleanup traverses store trees
- Independent cleanup responsibility per store
- Deep cleanup prevents memory leaks
- Automatic signal disposal on cleanup

## Common Patterns

### Configuration Stores
```typescript
// App configuration with readonly constants
const config = store({
  API_BASE: 'https://api.example.com',
  VERSION: '2.1.0',
  DEBUG: false // Mutable for runtime toggling
}, { readonly: ['API_BASE', 'VERSION'] });
```

### User Session Management
```typescript
const session = store({
  user: null as User | null,
  token: null as string | null,
  isAuthenticated: false
});

// Login
session.update({
  user: userData,
  token: authToken,
  isAuthenticated: true
});

// Logout
session.set({
  user: null,
  token: null,
  isAuthenticated: false
});
```

### Form State Management
```typescript
const form = store({
  values: { name: '', email: '' },
  errors: {},
  isValid: false,
  isDirty: false
});

// Field updates
form.values.name('John Doe');
form.update({ isDirty: true });

// Validation
effect(() => {
  const { name, email } = form.values;
  form.isValid(name().length > 0 && email().includes('@'));
});
```

### Shopping Cart
```typescript
const cart = store({
  items: [] as CartItem[],
  total: 0,
  itemCount: 0
});

// Computed totals
effect(() => {
  const items = cart.items();
  cart.total(items.reduce((sum, item) => sum + item.price, 0));
  cart.itemCount(items.length);
});
```

## Performance Considerations

- **Signal Granularity**: Each property becomes a signal for fine-grained reactivity
- **Nested Updates**: Deep updates only trigger signals for changed properties
- **Memory Usage**: Cleanup prevents accumulation of unused reactive subscriptions
- **Type Complexity**: Heavy TypeScript compilation due to deep conditional types

## Debugging Tips

1. **Use Computed Snapshots**: `store.computed()` for plain object inspection
2. **Check Readonly Status**: TypeScript errors indicate readonly violations
3. **Memory Leaks**: Always call `cleanup()` for temporary stores
4. **Update Patterns**: Use `update()` for partial, `set()` for full replacement
5. **Nested Access**: Properties auto-convert to stores/signals based on type