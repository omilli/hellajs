import { types as t } from "@babel/core";
import jsxSyntax from "@babel/plugin-syntax-jsx";
import { createJSXTransformers } from "./src/transformers/jsx.mjs";

const VALID_TARGETS = new Set(["ast", "dom"]);

/**
 * Babel plugin for HellaJS. Transforms JSX into HellaNode objects (`target: "ast"`,
 * the default) or imperative `@hellajs/dom/runtime` construction (`target: "dom"`).
 * The target is wrapper-owned build config (the vite/rollup/astro wrappers set it
 * per build environment) — never user-configurable per file. Options validate at
 * plugin construction: unknown keys or an invalid target throw immediately, not at
 * transform time.
 * @param babel Babel's core module object — the plugin API's first positional argument
 * @param {object} [options] `{ target }` — `"ast"` (default) keeps the HellaNode
 *   emission byte-identical; `"dom"` lowers element/fragment JSX to cached
 *   template/fragment consts plus marked build fns over `@hellajs/dom/runtime`.
 * @returns {import("@babel/core").PluginObj}
 * @throws {Error} When options is not an object, carries unknown keys, or target is not "ast"/"dom".
 */
export default function babelHellaJS(_babel, options) {
  let target = "ast";
  if (options !== undefined) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error(`[babel-plugin-hellajs] options must be an object, received ${options}`);
    }
    const keys = Object.keys(options);
    let i = 0;
    while (i < keys.length) {
      const key = keys[i++];
      if (key !== "target") {
        throw new Error(
          `[babel-plugin-hellajs] unknown option "${key}" — only "target" is supported`,
        );
      }
    }
    if (options.target !== undefined) {
      if (!VALID_TARGETS.has(options.target)) {
        throw new Error(
          `[babel-plugin-hellajs] invalid target "${options.target}" — expected "ast" or "dom"`,
        );
      }
      target = options.target;
    }
  }

  const jsxTransformers = createJSXTransformers(t, { target });

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      ...jsxTransformers,
    },
  };
}
