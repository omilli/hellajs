# @hellajs/router

A reactive client-side router package. Provides declarative routing with dynamic parameters, lifecycle hooks and redirects.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/router)](https://www.npmjs.com/package/@hellajs/router)
![Bundle Size](https://img.shields.io/badge/bundle-5.5KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.85KB-blue)

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
import { mount } from '@hellajs/dom';
import { router, route, navigate } from '@hellajs/router';

// Define routes
router({
  routes: {
    '/' : () => mount(<HomePage />),
    '/users/:id': (params) => mount(<UserPage id={params.id} />),
    '/old-path': '/new-path' // Redirect
  },
  notFound: () => mount(<>404</>)
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