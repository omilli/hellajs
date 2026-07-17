# astro-plugin-hellajs

Astro 7 integration for [HellaJS](https://github.com/omilli/hellajs). Render `.jsx`/`.tsx` HellaJS components server-side via `@hellajs/ssr` and hydrate them on the client behind `client:*` directives — first-class HellaJS in `.astro` pages.

## Install

```bash
npm install astro-plugin-hellajs @hellajs/core @hellajs/dom @hellajs/ssr
```

## Configure

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import hellajs from 'astro-plugin-hellajs';

export default defineConfig({
  integrations: [hellajs()],
});
```

## Usage

```astro
---
// src/pages/index.astro
import Counter from '../Counter.tsx';
---
<Counter client:load initial={0} />
```

```tsx
// src/Counter.tsx
import { signal } from "@hellajs/core";

export default function Counter({ initial = 0 }) {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

The server renders the component to HTML with `<!--[-->…<!--]-->` markers; the client `hydrate()`s it in place. All `client:*` directives are supported (`load`, `idle`, `visible`, `media`, `only`) — the markers survive Astro's island serialization.

## Exclusive use

This integration wires `vite-plugin-hellajs`, which transforms **all** `.jsx`/`.tsx`/`.js`/`.ts` (excluding `node_modules`). It assumes HellaJS is the project's only JSX framework — mixing React/Solid/etc. in the same project is unsupported.
