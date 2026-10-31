# HellaJS Vite Plugin

```bash
npm install vite-plugin-hellajs
```

Vite wrapper around `hellajs-compiler`. Transforms `.js`, `.jsx`, `.ts`, and `.tsx` files (outside `node_modules`) with the HellaJS JSX transform.

## Options

| Option | Values | Default | Behavior |
|---|---|---|---|
| `target` | `"ast"`, `"dom"` | per environment | Forwarded to `hellajs-compiler` per build environment: server and SSR builds emit `"ast"` (HellaNode objects for `@hellajs/ssr`); client builds emit `"dom"` (imperative `@hellajs/dom/runtime` construction). An explicit value wins verbatim. Invalid values throw at plugin construction. |

```js
// vite.config.ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS({ target: "dom" })],
});
```
