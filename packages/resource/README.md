# @hellajs/resource

A reactive data fetching package that integrates seamlessly with core reactive primitives. Provides caching, loading states and error handling.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/resource?color=orange)](https://www.npmjs.com/package/@hellajs/resource)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/resource)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsresource)**
- **[Resource Concepts](https://hellajs.com/learn/concepts/resources)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/resource
```

### Basic Usage

```typescript
import { resource } from '@hellajs/resource';
import { effect, signal } from '@hellajs/core';

// Define a resource with a fetcher function
const userId = signal(1);
const userResource = resource(
  (id: number) => fetch(`https://api.example.com/users/${id}`).then(r => r.json()),
  { key: () => userId() } // Reactive key function
);

// Or with a static key for simpler cases
const staticResource = resource(
  () => fetch('https://api.example.com/config').then(r => r.json()),
  { key: 'config' } // Static key string
);

// React to its state
effect(() => {
  if (userResource.data()) {
    console.log('User:', userResource.data().name);
  }
});

// Initiate the fetch (cache-first)
userResource.get();

// Or force fresh data (bypasses cache)
// userResource.request();
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.