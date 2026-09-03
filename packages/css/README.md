# @hellajs/css

A type-safe CSS-in-JS package with a tiny runtime footprint. Content-hashed scoped styles, typed variant recipes, reactive CSS variables, and reference-counted cleanup — no build step, no configuration.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css?color=orange)](https://www.npmjs.com/package/@hellajs/css)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/css)

- Scoped styles via `style()` — content-hashed classes (`h-{label}-{hash}`), identical on client and server
- Explicit globals via `css()`; typed variant recipes via `cva()`; class joining via `cx()`
- Reactive CSS custom properties via `vars()` and signals
- Collision-free `@keyframes` definitions via `keyframes()`
- Automatic memory management — reference-counted `remove*` / `reset*` pairs
- Server-side critical CSS — the `cssText()` collector reads everything registered

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
import { signal } from '@hellajs/core';
import { css, style, vars } from '@hellajs/css';

const darkMode = signal(false);

const theme = vars({
  colors: {
    primary: () => darkMode() ? '#93c5fd' : '#3b82f6',
    accent: '#ff6b6b'
  },
  spacing: '8px'
});

css({
  body: {
    margin: 0,
    fontFamily: 'system-ui, sans-serif',
    backgroundColor: theme.colors.primary
  }
});

const buttonStyle = style({
  padding: theme.spacing,
  backgroundColor: theme.colors.primary,
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  '&:hover': { opacity: 0.8 }
}, { label: 'btn' });
// "h-btn-r4k2q" — the same class on client and server

<button class={buttonStyle}>
  Styled Button
</button>
```

On the server, every call above registers the same rules and `cssText()` collects them for a single `<style>` embed per response.

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
