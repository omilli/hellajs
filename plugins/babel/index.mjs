import { types as t } from "@babel/core";
import jsxSyntax from "@babel/plugin-syntax-jsx";
import { createJSXTransformers } from "./src/transformers/jsx.mjs";
import { componentTransformer as createComponentTransformer } from "./src/transformers/component.mjs";

/**
 * Babel plugin for HellaJS. Transforms JSX and html`` tagged templates into HellaNode objects.
 * @returns {import("@babel/core").PluginObj}
 */
export default function babelHellaJS() {
  const jsxTransformers = createJSXTransformers(t);
  const componentTransformer = createComponentTransformer(t);

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      ...jsxTransformers,
      ...componentTransformer
    }
  };
}
