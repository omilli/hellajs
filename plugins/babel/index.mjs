import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import { createJSXTransformers } from './transformers/jsx.mjs';
import { createTemplateTransformer } from './transformers/template.mjs';
import { createTemplateCallTransformer } from './transformers/template-call.mjs';

export default function babelHellaJS() {
  const jsxTransformers = createJSXTransformers(t);
  const templateTransformer = createTemplateTransformer(t);
  const templateCallTransformer = createTemplateCallTransformer(t);

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      ...jsxTransformers,
      ...templateTransformer,
      ...templateCallTransformer
    }
  };
}
