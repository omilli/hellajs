# @hellajs/router

A reactive client-side router package. Provides declarative routing with dynamic parameters, lifecycle hooks and redirects.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/router?color=orange)](https://www.npmjs.com/package/@hellajs/router)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/router)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsrouter)**
- **[Router Concepts](https://hellajs.com/learn/concepts/routing)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/router
```

### Basic Usage

```typescript
import { effect } from '@hellajs/core';

// Define routes
router({
  routes: {
    '/' : () => console.log('Home'),
    '/users/:id': (params) => console.log(`User ID: ${params.id}`),
    '/old-path': '/new-path' // Redirect
  },
  notFound: () => console.log('404 Not Found')
});

// React to route changes
effect(() => {
  const { path, params } = route();
  console.log(`Navigated to: ${path}`, { params });
});

// Navigate programmatically
navigate('/users/:id', { id: '123' });
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.