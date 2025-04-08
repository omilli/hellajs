# Untracked

The `untracked` function executes code without tracking reactive dependencies.

## Core Functionality

- Temporarily disables dependency tracking
- Allows reading reactive values without creating dependencies
- Restores previous tracking state after execution

## Examples

### Basic Usage

```typescript
import { signal, effect, untracked } from '@hellajs/core';

const count = signal(0);
const name = signal('John');

effect(() => {
  // This creates a dependency on count
  console.log(`Count: ${count()}`);
  
  // This reads name without creating a dependency
  untracked(() => {
    console.log(`Name: ${name()}`);
  });
});

// This triggers the effect
count.set(1);

// This doesn't trigger the effect
name.set('Jane');
```

### Avoiding Unnecessary Updates

```typescript
import { signal, effect, untracked } from '@hellajs/core';

const items = signal(['apple', 'banana']);
const selectedIndex = signal(0);

effect(() => {
  const index = selectedIndex();
  
  // Read items without creating a dependency
  const list = untracked(() => items());
  
  console.log(`Selected item: ${list[index]}`);
});

// This triggers the effect (index changed)
selectedIndex.set(1);

// This doesn't trigger the effect (items read in untracked)
items.set(['cherry', 'date', 'elderberry']);
```

### Reading Reactive Values in Computed Values

```typescript
import { signal, computed, untracked } from '@hellajs/core';

const firstName = signal('John');
const lastName = signal('Doe');
const showFullName = signal(true);

// Only depend on showFullName, not on firstName or lastName
const displayName = computed(() => {
  if (showFullName()) {
    return untracked(() => `${firstName()} ${lastName()}`);
  } else {
    return untracked(() => firstName());
  }
});
```
