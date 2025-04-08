# Signal

The `signal` function creates a reactive value that triggers updates when changed.

## Core Functionality

- Stores a single reactive value
- Tracks when the value is read during effects or computed values
- Notifies subscribers when the value changes
- Provides methods for reading and writing the value

## Examples

### Basic Usage

```typescript
import { signal } from '@hellajs/core';

// Create a signal with initial value
const count = signal(0);

// Read the current value
console.log(count()); // 0

// Update the value
count.set(5);
console.log(count()); // 5
```

### Update Method

```typescript
import { signal } from '@hellajs/core';

const counter = signal(0);

// Update based on previous value
counter.update(prev => prev + 1);
console.log(counter()); // 1

// More complex updates
counter.update(prev => prev * 2);
console.log(counter()); // 2
```

### With Objects

```typescript
import { signal } from '@hellajs/core';

const user = signal({ name: 'John', age: 30 });

console.log(user().name); // "John"

// Update with a new object
user.set({ name: 'Jane', age: 25 });

// Update immutably using previous value
user.update(prev => ({ ...prev, age: prev.age + 1 }));
console.log(user()); // { name: 'Jane', age: 26 }
```

### With Arrays

```typescript
import { signal } from '@hellajs/core';

const items = signal(['apple', 'banana']);

// Read array values
console.log(items()[0]); // "apple"

// Add item immutably
items.update(prev => [...prev, 'cherry']);
console.log(items()); // ["apple", "banana", "cherry"]

// Remove item immutably
items.update(prev => prev.filter(item => item !== 'banana'));
console.log(items()); // ["apple", "cherry"]
```

### In Components

```typescript
import { signal, html } from '@hellajs/core';
const { div, button, span } = html;

function Counter() {
  const count = signal(0);
  
  return div(
    button({ onclick: () => count.set(count() - 1) }, "-"),
    span(count()),
    button({ onclick: () => count.set(count() + 1) }, "+")
  );
}
```

### Boolean Toggling

```typescript
import { signal } from '@hellajs/core';

const isVisible = signal(false);

// Toggle boolean value
function toggle() {
  isVisible.update(prev => !prev);
}

toggle();
console.log(isVisible()); // true

toggle();
console.log(isVisible()); // false
```
