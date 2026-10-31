# HellaJS Compiler

```bash
npm install hellajs-compiler
```

Compiles JSX for HellaJS. `transform(code, options)` lowers JSX in one pass: TypeScript syntax strips natively (no Rust toolchain pass), the tree parses to estree, a ported syntactic walker emits the target code, and astring prints the result with a chained source map. JSX-free files return `null`, so build pipelines pass non-JSX input straight through.

The `target` option selects the emission currency: client builds (`"dom"`, the default) emit imperative `@hellajs/dom/runtime` construction, server builds (`"ast"`) emit HellaNode objects for `@hellajs/ssr`. Component JSX becomes `component(Tag, props)` calls, and feature syntax (`on:`, `e:`, `hook:`, `error:`) pulls in the matching dom feature imports.

```js
import { transform } from "hellajs-compiler";

const dom = transform('const v = <div class="x">{count()}</div>', {
  filename: "app.tsx",
  target: "dom",
});
// dom.code: a cached template() const plus a marked build fn wiring
// _hellaText/_hellaProp/_hellaChild calls over aliased runtime imports.

const ast = transform('const v = <div class="x">{count()}</div>', {
  filename: "app.tsx",
  target: "ast",
});
// ast.code: HellaNode-building calls ({ tag: "div", ... } object expression
// plus () => count() auto-wrap).
```

## Options

| Option | Values | Default | Behavior |
|---|---|---|---|
| `filename` | string (required) | (none) | Module specifier of the input file; drives language inference and the source map's `file` field. |
| `lang` | `"js"`, `"jsx"`, `"ts"`, `"tsx"` | inferred from `filename` | `"ts"`/`"tsx"` run the native type-strip stage; `"js"`/`"jsx"` skip it. |
| `target` | `"ast"`, `"dom"` | `"dom"` | `"dom"` emits imperative `@hellajs/dom/runtime` construction. `"ast"` emits HellaNode objects (the ssr/server currency). |

Options validate at call time: a non-object value, an unknown key, or an invalid `target`/`lang` throws a `[hellajs-compiler]` error before any work. The wrappers validate eagerly by calling `transform("", { filename: "hellajs-validate.js", target })` at construction, so bad config fails before the build's first transform.

Under `target: "dom"`, element and fragment JSX lowers to a cached `template()`/`fragment()` const per site plus a `mark()`ed build fn that wires dynamic props, handlers, hooks, error configs, and children through the public runtime module. Literal props and the leading static run of children fold into the template HTML; everything dynamic emits in document order, addressing anchors by compiler-computed child-index paths (`root.children[1].firstElementChild`). Fully static subtrees compile to a bare create build fn with no runtime calls. Components, passthroughs, and feature imports are identical in both targets; the runtime imports always come from `@hellajs/dom/runtime`, never from dom internals.

## Wrappers

You rarely call `transform` directly: `vite-plugin-hellajs`, `rollup-plugin-hellajs`, and the astro renderer wrap this engine and resolve `target` per build environment (server environments compile to `"ast"`, client environments to `"dom"`). Install the wrapper for your build tool and it drives this package; direct `transform` use is for custom build scripts, with targets always explicit at the call site.
