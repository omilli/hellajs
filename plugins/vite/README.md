# HellaJS Vite Plugin

```bash
npm install vite-plugin-hellajs
```

Vite wrapper around `babel-plugin-hellajs`. Transforms `.js`, `.jsx`, `.ts`, and `.tsx` files (outside `node_modules`) with the HellaJS JSX transform.

## Options

| Option | Values | Default | Behavior |
|---|---|---|---|
| `target` | `"ast"`, `"dom"` | `"ast"` | Forwarded to `babel-plugin-hellajs` per build environment. `"ast"` emits HellaNode objects; `"dom"` emits imperative `@hellajs/dom/runtime` construction. Invalid values throw at plugin construction. |

```js
// vite.config.ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS({ target: "dom" })],
});
```
