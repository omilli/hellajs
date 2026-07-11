# @hellajs/ssr

A pure HTML stringifier for HellaJS. Walks a HellaNode AST to an HTML string with zero runtime dependencies — runs in any server runtime (Bun, Node, Deno, workers).

[![NPM Version](https://img.shields.io/npm/v/@hellajs/ssr?color=orange)](https://www.npmjs.com/package/@hellajs/ssr)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/ssr)

## Documentation

- **[API Reference](https://hellajs.com/reference/ssr/ssr)**
- **[Server-Side Rendering Concepts](https://hellajs.com/learn/concepts/ssr)**

## Quick Start

### Installation

```bash
npm install @hellajs/dom @hellajs/ssr
```

### Basic Usage

```js
import { html } from '@hellajs/dom';
import { ssr } from '@hellajs/ssr';

const page = (name) => html`<div><h1>Hello ${name}</h1></div>`;

const body = ssr(page('World'));
// body: "<div><h1>Hello World</h1></div>"
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
