import { types as t } from "@babel/core";
import jsxSyntax from "@babel/plugin-syntax-jsx";
import { createJSXTransformers } from "./src/transformers/jsx.mjs";

/**
 * Babel plugin for HellaJS. Transforms JSX into HellaNode objects.
 * @returns {import("@babel/core").PluginObj}
 */
export default function babelHellaJS() {
  const jsxTransformers = createJSXTransformers(t);

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      ...jsxTransformers
    }
  };
}
