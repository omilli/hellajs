# HellaJS

A lightweight reactive DOM library with fine-grained reactivity and virtual DOM diffing.

## Core Features

- **Fine-grained Reactivity**: Signals, computed values, and effects for precise dependency tracking
- **Virtual DOM**: Efficient DOM updates through diffing algorithm
- **Component Model**: Function-based components that automatically update when dependencies change
- **Server-Side Rendering**: Isomorphic rendering for both client and server
- **Context System**: Isolated environments for state management
- **Type Safety**: Full TypeScript support

## Basic Example

```typescript
import { html, signal, mount } from '@hellajs/core';

const { div, button, span } = html;

// Create reactive state OUTSIDE component functions
const count = signal(0);

// Define component function that uses the signals
const Counter = () =>
  div({ className: 'counter' },
    button({ onclick: () => count.set(count() - 1) }, "-"),
    span(count()),
    button({ onclick: () => count.set(count() + 1) }, "+")
  );

// Mount component to DOM with automatic updates
mount(Counter, '#app');
```

## Important: Signal Placement

⚠️ **Always define signals outside component functions**

```typescript
// CORRECT: Signals defined outside component function
const name = signal('John');
const Counter = () => div(span(name()));

// INCORRECT: This pattern doesn't work!
// Signals would be recreated on each render and lose reactivity
const WrongCounter = () => {
  const counter = signal(0); // Don't do this!
  return div(counter());
};
```

Signals defined inside component functions won't maintain their values between renders and won't trigger reactive updates properly.

## Core API

### Reactivity

#### Signals
```typescript
import { signal } from '@hellajs/core';

// Create a signal
const count = signal(0);

// Read value
console.log(count()); // 0

// Set new value
count.set(5);

// Update based on previous value
count.update(prev => prev + 1);
```

#### Computed Values
```typescript
import { signal, computed } from '@hellajs/core';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);
console.log(fullName()); // "John Doe"

firstName.set('Jane');
console.log(fullName()); // "Jane Doe"
```

#### Effects
```typescript
import { signal, effect } from '@hellajs/core';

const count = signal(0);

// Run effect when dependencies change
const cleanup = effect(() => {
  console.log(`Count changed to ${count()}`);
});

count.set(5); // Logs: "Count changed to 5"

// Stop the effect
cleanup();
```

### Virtual DOM

#### Creating Elements
```typescript
import { html } from '@hellajs/core';
const { div, h1, p, ul, li } = html;

// Simple elements
const header = h1('Hello World');

// With attributes
const actionButton = button({ 
  className: 'primary', 
  disabled: false,
  onclick: () => console.log('clicked')
}, 'Click Me');

// Nested structure
const content = div({ className: 'content' },
  h1('My App'),
  p('Welcome to my application'),
  ul(
    li('Item 1'),
    li('Item 2')
  )
);
```

#### Fragments
```typescript
import { html } from '@hellajs/core';
const { tr, td, $ } = html;

// Create multiple elements without a wrapper
const tableRows = $(
  tr(td('Row 1, Cell 1'), td('Row 1, Cell 2')),
  tr(td('Row 2, Cell 1'), td('Row 2, Cell 2'))
);
```

### Components

Components are just functions that return virtual DOM nodes:

```typescript
import { html, signal } from '@hellajs/core';
const { div, h2, input, button } = html;

// State must be defined outside the component
const username = signal('');

// Component that uses the external state
function UserForm() {
  const handleSubmit = () => {
    console.log(`Submitting: ${username()}`);
  };
  
  return div({ className: 'form' },
    h2('User Registration'),
    input({ 
      value: username(),
      oninput: (_, el) => username.set((el as HTMLInputElement).value),
      placeholder: 'Enter username'
    }),
    button({ onclick: handleSubmit }, 'Submit')
  );
}
```

### Mounting

```typescript
import { mount } from '@hellajs/core';

// Mount a component with reactive updates
const unmount = mount(UserForm, '#registration');

// Later, clean up resources
unmount();
```

## Advanced Features

### Batch Updates

```typescript
import { signal, batch } from '@hellajs/core';

const x = signal(0);
const y = signal(0);

// Group updates to prevent intermediate effects
batch(() => {
  x.set(100);
  y.set(200);
});
```

### Untracked Reads

```typescript
import { signal, effect, untracked } from '@hellajs/core';

const count = signal(0);
const settings = signal({ debug: true });

effect(() => {
  console.log(`Count: ${count()}`);
  
  // Read settings without creating a dependency
  if (untracked(() => settings().debug)) {
    console.log('Debug info: ', { count: count() });
  }
});
```

### Context Isolation

```typescript
import { context, signal } from '@hellajs/core';

// Create isolated contexts
const appContext = context('app');
const adminContext = context('admin');

// Each context has its own reactive system
const appCount = appContext.signal(0);
const adminCount = adminContext.signal(0);

// Effects are isolated to their context
appContext.effect(() => {
  console.log(`App count: ${appCount()}`);
});

// This won't trigger effects in the other context
adminCount.set(5);
```

## Real-World Example

```typescript
import { html, signal, computed, mount } from '@hellajs/core';
const { div, h1, ul, li, input, button, span } = html;

// Application state - defined outside components
const todos = signal([
  { id: 1, text: 'Learn HellaJS', completed: false },
  { id: 2, text: 'Build an app', completed: false }
]);
const newTodoText = signal('');
const filter = signal('all'); // 'all', 'active', 'completed'

// Derived state
const filteredTodos = computed(() => {
  const filterValue = filter();
  return todos().filter(todo => {
    if (filterValue === 'active') return !todo.completed;
    if (filterValue === 'completed') return todo.completed;
    return true;
  });
});

// Actions
const addTodo = () => {
  const text = newTodoText().trim();
  if (text) {
    todos.update(prev => [
      ...prev, 
      { id: Date.now(), text, completed: false }
    ]);
    newTodoText.set('');
  }
};

const toggleTodo = (id) => {
  todos.update(prev => 
    prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
};

const deleteTodo = (id) => {
  todos.update(prev => prev.filter(todo => todo.id !== id));
};

// Component
const TodoApp = () => 
  div({ className: 'todo-app' },
    h1('Todo App'),
    
    div({ className: 'add-todo' },
      input({
        value: newTodoText(),
        oninput: (_, el) => newTodoText.set((el as HTMLInputElement).value),
        placeholder: 'Add new todo'
      }),
      button({ onclick: addTodo }, 'Add')
    ),
    
    div({ className: 'filters' },
      button({ 
        className: filter() === 'all' ? 'active' : '',
        onclick: () => filter.set('all')
      }, 'All'),
      button({ 
        className: filter() === 'active' ? 'active' : '',
        onclick: () => filter.set('active')
      }, 'Active'),
      button({ 
        className: filter() === 'completed' ? 'active' : '',
        onclick: () => filter.set('completed')
      }, 'Completed')
    ),
    
    ul({ className: 'todo-list' },
      filteredTodos().map(todo => 
        li({ 
          className: todo.completed ? 'completed' : '',
          key: todo.id 
        },
          div({ className: 'todo-item' },
            input({ 
              type: 'checkbox',
              checked: todo.completed,
              onclick: () => toggleTodo(todo.id)
            }),
            span({ 
              className: 'todo-text',
              onclick: () => toggleTodo(todo.id)
            }, todo.text),
            button({ 
              className: 'delete-btn',
              onclick: () => deleteTodo(todo.id)
            }, '×')
          )
        )
      )
    )
  );

// Mount the app
mount(TodoApp, '#app');
```
