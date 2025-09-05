# @hellajs/css

A type-safe CSS-in-JS package with a tiny runtime footprint. Provides a modern CSS workflow with automatic memory management and efficient caching.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css)](https://www.npmjs.com/package/@hellajs/css)
![Bundle Size](https://img.shields.io/badge/bundle-4.95KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.88KB-blue)

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
import { signal, effect } from '@hellajs/core';

// Define design tokens
const theme = cssVars({
  colors: {
    primary: '#007bff',
    accent: '#ff6b6b'
  },
  spacing: '8px'
});

// Create styles
const buttonStyle = css({
  padding: theme.spacing, // var(--spacing)
  backgroundColor: theme.colors.primary, // var(--colors-primary)
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  ':hover': { opacity: 0.8 }
});

// Use as a class name
<button class={buttonStyle}>
  Styled Button
</button>
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.