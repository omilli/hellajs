# @hellajs/css

⮺ [Documentation](https://hellajs.com/packages/css)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css)](https://www.npmjs.com/package/@hellajs/css)
![Bundle Size](https://edge.bundlejs.com/badge?q=@hellajs/css@0.14.3&treeshake=[*])

```bash
npm install @hellajs/css
```

## Overview

`@hellajs/css` is a type-safe CSS-in-JS library with a tiny runtime footprint. It offers full TypeScript support, modern CSS features, automatic memory management, and efficient caching with reference counting.

## Features

- **Type-Safe**: Full TypeScript support with strongly-typed CSS properties.
- **Lightweight**: Minimal runtime overhead with efficient style injection and caching.
- **Memory Management**: Automatic cleanup with reference counting.
- **CSS Variables**: Built-in support for design tokens and theming.
- **Modern CSS**: Supports nested selectors, pseudo-classes, media queries, and keyframes.
- **Scoped & Global**: Generate scoped class names or apply styles globally.

## Quick Start

```tsx
import { css, cssVars } from '@hellajs/css';

// 1. Define design tokens (optional)
const theme = cssVars({
  colors: {
    primary: '#007bff',
    accent: '#ff6b6b'
  },
  spacing: '8px'
});

// 2. Create styles
const buttonStyle = css({
  padding: theme.spacing,
  backgroundColor: theme.colors.primary,
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  ':hover': { opacity: 0.8 }
});

// 3. Use in JSX
<button class={buttonStyle}>
  Styled Button
</button>
```

## API Reference

### `css(styles, options?)`
Creates and injects CSS rules, returning a class name for scoped styles.

```tsx
const cardStyle = css({
  padding: '1rem',
  backgroundColor: '#f5f5f5',
  '@media (max-width: 768px)': {
    padding: '0.5rem'
  }
});

<div class={cardStyle}>Card content</div>
```

**Options:**
- `name?: string` - Custom class name instead of generated one
- `global?: boolean` - Apply styles globally (returns empty string)
- `scoped?: string` - Scope styles under a parent selector

### `cssVars(variables)`
Converts a nested JavaScript object into CSS custom properties for theming.

```tsx
const tokens = cssVars({
  typography: {
    fontSize: '16px',
    fontWeight: '500'
  }
});

const textStyle = css({
  fontSize: tokens.typography.fontSize,
  fontWeight: tokens.typography.fontWeight
});
```

## Usage

- **Global Styles**: Use `css({ body: { margin: 0 } }, { global: true })` to apply styles globally.
- **Scoped Styles**: Use `{ scoped: 'parent-class' }` to scope styles under a parent selector.
- **Named Classes**: Use `{ name: 'my-button' }` for custom class names.
- **Cleanup**: Use `css.remove(styles, options)` to remove styles and clean up if no longer referenced.
- **Reset**: Use `cssReset()` to clear all styles and caches.
- **Best Practice**: Define styles outside of component render functions to leverage caching.

## TypeScript Support

The library provides comprehensive TypeScript support with strongly-typed CSS properties.

```typescript
import type { CSSObject } from '@hellajs/css';

const styles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  // invalidProperty: 'value' // <-- TypeScript error
};
```

## License

MIT
