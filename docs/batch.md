# Batch

The `batch` function groups multiple state updates to prevent intermediate effects from running.

## Core Functionality

- Groups multiple reactive updates into a single batch
- Prevents effects from running until the entire batch completes
- Reduces unnecessary intermediate calculations 

## Examples

### Basic Usage

```typescript
import { signal, effect, batch } from '@hellajs/core';

const firstName = signal('John');
const lastName = signal('Doe');

effect(() => {
  console.log(`Name: ${firstName()} ${lastName()}`);
});

// Without batch, this would trigger the effect twice
batch(() => {
  firstName.set('Jane');
  lastName.set('Smith');
});
// Effect runs once with "Jane Smith"
```

### Coordinated Updates

```typescript
import { signal, effect, batch } from '@hellajs/core';

const width = signal(100);
const height = signal(50);
const area = computed(() => width() * height());

effect(() => {
  console.log(`Area: ${area()}`);
});

// Update multiple related values at once
batch(() => {
  width.set(200);
  height.set(100);
});
// Logs "Area: 20000" once rather than intermediate values
```

### Nested Batches

```typescript
import { signal, effect, batch } from '@hellajs/core';

const count = signal(0);
const multiplier = signal(1);

effect(() => {
  console.log(`Result: ${count() * multiplier()}`);
});

batch(() => {
  count.set(5);
  
  batch(() => {
    // Nested batch
    multiplier.set(10);
  });
  
  // Still within outer batch
  count.set(10);
});
// Effect runs once with "Result: 100"
```

### Form Submission Example

```typescript
import { signal, batch } from '@hellajs/core';

const formData = {
  username: signal(''),
  email: signal(''),
  isSubmitting: signal(false),
  isSuccess: signal(false)
};

function submitForm() {
  batch(() => {
    formData.isSubmitting.set(true);
    
    // Simulate API call
    setTimeout(() => {
      batch(() => {
        formData.isSubmitting.set(false);
        formData.isSuccess.set(true);
        formData.username.set('');
        formData.email.set('');
      });
    }, 1000);
  });
}
```
