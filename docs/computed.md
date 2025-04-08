# Computed

The `computed` function creates derived state that automatically updates when dependencies change.

## Core Functionality

- Creates a read-only value derived from other reactive state
- Automatically tracks dependencies used in the computation
- Caches results until dependencies change
- Only recalculates when used and when dependencies have changed

## Examples

### Basic Usage

```typescript
import { signal, computed } from '@hellajs/core';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"

firstName.set('Jane');
console.log(fullName()); // "Jane Doe"
```

### Derived Calculations

```typescript
import { signal, computed } from '@hellajs/core';

const width = signal(5);
const height = signal(10);

const area = computed(() => width() * height());
const perimeter = computed(() => 2 * (width() + height()));

console.log(area()); // 50
console.log(perimeter()); // 30

width.set(7);
console.log(area()); // 70
```

### Chaining Computed Values

```typescript
import { signal, computed } from '@hellajs/core';

const basePrice = signal(100);
const taxRate = signal(0.1);

const taxAmount = computed(() => basePrice() * taxRate());
const totalPrice = computed(() => basePrice() + taxAmount());

console.log(totalPrice()); // 110

taxRate.set(0.2);
console.log(totalPrice()); // 120
```

### Conditional Computations

```typescript
import { signal, computed } from '@hellajs/core';

const count = signal(0);
const threshold = signal(10);

const status = computed(() => {
  if (count() < 0) return 'Invalid';
  if (count() < threshold()) return 'Below threshold';
  return 'Above threshold';
});

console.log(status()); // "Below threshold"

count.set(15);
console.log(status()); // "Above threshold"
```

### With Array Methods

```typescript
import { signal, computed } from '@hellajs/core';

const items = signal([
  { id: 1, name: 'Apple', category: 'Fruit' },
  { id: 2, name: 'Carrot', category: 'Vegetable' },
  { id: 3, name: 'Banana', category: 'Fruit' }
]);

const category = signal('Fruit');

const filteredItems = computed(() => 
  items().filter(item => item.category === category())
);

console.log(filteredItems()); // [{ id: 1, name: 'Apple'... }, { id: 3, name: 'Banana'... }]

category.set('Vegetable');
console.log(filteredItems()); // [{ id: 2, name: 'Carrot'... }]
```
