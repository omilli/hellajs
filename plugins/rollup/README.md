# HellaJS Rollup Plugin

```bash
npm install rollup-plugin-hellajs
```

Rollup wrapper around `babel-plugin-hellajs`. Transforms `.js`, `.jsx`, `.ts`, and `.tsx` files (outside `node_modules`) through `transform` and `load` hooks.

## Options

| Option | Values | Default | Behavior |
|---|---|---|---|
| `target` | `"ast"`, `"dom"` | `"ast"` | Forwarded to `babel-plugin-hellajs` per build environment. `"ast"` emits HellaNode objects; `"dom"` emits imperative `@hellajs/dom/runtime` construction. Invalid values throw at plugin construction. |

```js
// rollup.config.mjs
import rollupHellaJS from "rollup-plugin-hellajs";

export default {
  plugins: [rollupHellaJS({ target: "dom" })],
};
```
