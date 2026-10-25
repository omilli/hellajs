# HellaJS Babel Plugin

```bash
npm install babel-plugin-hellajs
```

Compiles JSX for HellaJS. The `target` option selects the emission: client builds (`"dom"`) lower element JSX to imperative `@hellajs/dom/runtime` construction, server builds (`"ast"`, the library default) emit HellaNode objects for `@hellajs/ssr`; component JSX becomes `component(Tag, props)` calls, and feature syntax (`on:`, `e:`, `hook:`, `error:`) pulls in the matching dom feature imports.

## Options

The plugin takes one option, `target`. It is wrapper-owned build config: the `vite-plugin-hellajs` and `rollup-plugin-hellajs` wrappers (and the astro renderer) set it once per build environment. It is not user-configurable per file. Options are validated at plugin construction; unknown keys or an invalid value throw immediately.

| Option | Values | Default | Behavior |
|---|---|---|---|
| `target` | `"ast"`, `"dom"` | `"ast"` | `"ast"` emits HellaNode objects (unchanged output). `"dom"` emits imperative `@hellajs/dom/runtime` construction. |

Under `target: "dom"`, element and fragment JSX lowers to a cached `template()`/`fragment()` const per site plus a `mark()`ed build fn that wires dynamic props, handlers, hooks, error configs, and children through the public runtime module (`prop`, `on`, `direct`, `hook`, `errorConfig`, `text`, `child`). Fully static subtrees compile to a bare create build fn with no runtime calls. Literal props and the leading static run of children fold into the template HTML; everything dynamic emits in document order, addressing anchors by compiler-computed child-index paths (`root.children[1].firstElementChild`). Components, passthroughs, and feature imports are identical in both targets; the runtime imports always come from `@hellajs/dom/runtime`, never from dom internals.

```js
// vite.config.ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS({ target: "dom" })],
});
```

The runtime functions the compiler emits are a stable compiler contract documented at [`@hellajs/dom/runtime`](https://hellajs.com/reference/dom/runtime); they are not a hand-authoring API.
