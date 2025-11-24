import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import { createJSXTransformers } from './transformers/jsx.mjs';
import { createComponentTransformer } from './transformers/component.mjs';

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
