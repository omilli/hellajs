# Effect

The `effect` function creates reactive side effects that automatically run when dependencies change.

## Core Functionality

- Automatically tracks dependencies used within the effect
- Re-executes when tracked dependencies change
- Supports hierarchical cleanup (parent-child relationships)
- Returns a cleanup function that disposes the effect

## Examples

### Basic Usage

```typescript
import { signal, effect } from '@hellajs/core';

const count = signal(0);

// Creates an effect that runs when count changes
const cleanup = effect(() => {
  console.log(`The count is: ${count()}`);
});

// Logs: "The count is: 0" (initial run)
count.set(1);
// Logs: "The count is: 1"

// Stop the effect from running
cleanup();

// No longer logs anything
count.set(2);
```

### DOM Updates

```typescript
import { signal, effect } from '@hellajs/core';

const message = signal('Hello World');

effect(() => {
  document.getElementById('output').textContent = message();
});

// Updates the DOM element with id "output"
message.set('Updated text');
```

### Conditional Tracking

```typescript
import { signal, effect } from '@hellajs/core';

const isLoggedIn = signal(false);
const username = signal('');

effect(() => {
  if (isLoggedIn()) {
    console.log(`Welcome back, ${username()}`);
  } else {
    console.log('Please log in');
  }
});

// Initially logs: "Please log in"

username.set('JohnDoe');
// Nothing happens (username not tracked when isLoggedIn is false)

isLoggedIn.set(true);
// Logs: "Welcome back, JohnDoe"

username.set('JaneDoe');
// Logs: "Welcome back, JaneDoe" (now username is tracked)
```

### Multiple Dependencies

```typescript
import { signal, effect } from '@hellajs/core';

const x = signal(1);
const y = signal(2);
const z = signal(3);

effect(() => {
  console.log(`Sum: ${x() + y() + z()}`);
});

// Logs: "Sum: 6"

x.set(10);
// Logs: "Sum: 15"

batch(() => {
  x.set(5);
  y.set(5);
  z.set(5);
});
// Logs: "Sum: 15" (once)
```

### Nested Effects

```typescript
import { signal, effect } from '@hellajs/core';

const outer = signal(true);
const inner = signal(0);

effect(() => {
  console.log(`Outer: ${outer()}`);
  
  if (outer()) {
    // This nested effect is automatically cleaned up when the outer effect reruns
    effect(() => {
      console.log(`Inner: ${inner()}`);
    });
  }
});

inner.set(1);
// Logs: "Inner: 1"

outer.set(false);
// Logs: "Outer: false"

inner.set(2);
// Nothing logs (inner effect was cleaned up)
```
