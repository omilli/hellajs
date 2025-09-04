# @hellajs/store

A deeply reactive store for managing application state. Automatically converts nested objects into granular signals with flexible readonly controls.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/store)](https://www.npmjs.com/package/@hellajs/store)
![Bundle Size](https://img.shields.io/badge/bundle-1.72KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-0.68KB-blue)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsstore)**
- **[Store Concepts](https://hellajs.com/learn/concepts/state#state-with-stores)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/store
```

### Basic Usage

```typescript
import { effect } from '@hellajs/core';
import { store } from '@hellajs/store';

const user = store({
  name: 'John',
  age: 30,
  settings: {
    theme: 'dark'
  }
});

// Effects react to any deep change
effect(() => {
  console.log(`Theme is: ${user.settings.theme()}`);
});

// Update nested properties
user.name('Jane');
user.settings.theme('light'); // Effect re-runs

// Replace or update the entire state
user.set({ name: 'Sam', age: 25, settings: { theme: 'blue' } });
user.update({ settings: { theme: 'green' } });
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
