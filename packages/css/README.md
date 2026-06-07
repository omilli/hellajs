# @hellajs/css

A type-safe CSS-in-JS package with a tiny runtime footprint. Provides a modern CSS workflow with automatic memory management and efficient caching.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css?color=orange)](https://www.npmjs.com/package/@hellajs/css)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/css)

- Global CSS by default, scoped styles via `name` option
- Reactive CSS custom properties via signals
- Automatic memory management with reference counting
- Full TypeScript support via `csstype`

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajscss)**
- **[Styling Concepts](https://hellajs.com/learn/concepts/styling)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/css
```

### Basic Usage

```tsx
import { css, cssVars } from '@hellajs/css';
import { signal } from '@hellajs/core';

const theme = cssVars({
  colors: {
    primary: '#007bff',
    accent: '#ff6b6b'
  },
  spacing: '8px'
});

css({
  body: {
    margin: 0,
    fontFamily: 'system-ui, sans-serif'
  },
  '*': {
    boxSizing: 'border-box'
  }
});

const buttonStyle = css({
  padding: theme.spacing,
  backgroundColor: theme.colors.primary,
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  '&:hover': { opacity: 0.8 }
}, { name: 'btn' });

<button class={buttonStyle}>
  Styled Button
</button>
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
