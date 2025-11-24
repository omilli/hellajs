import { types as t } from '@babel/core';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import { createJSXTransformers } from './transformers/jsx.mjs';
import { createComponentTransformer } from './transformers/component.mjs';
import { createComponentCallTransformer } from './transformers/component-call.mjs';

export default function babelHellaJS() {
  const jsxTransformers = createJSXTransformers(t);
  const componentTransformer = createComponentTransformer(t);
  const componentCallTransformer = createComponentCallTransformer(t);

  return {
    inherits: jsxSyntax.default || jsxSyntax,
    visitor: {
      ...jsxTransformers,
      ...componentTransformer,
      ...componentCallTransformer
    }
  };
}

// Export helper function for preprocessing JSX with @ and # attributes
// This must be called by build tools before passing code to Babel
// NOTE: This only transforms JSX, not template strings (html`...`)
export function preprocessJSX(code) {
  return code.replace(/<(\w+)\s+([^>]*?)>/g, (match, tag, attrs, offset) => {
    // Skip if inside template string (backtick context)
    const beforeMatch = code.slice(0, offset);
    const backtickCount = (beforeMatch.match(/`/g) || []).length;
    const isInComponentString = backtickCount % 2 === 1;

    if (isInComponentString) {
      return match; // Don't transform inside template strings
    }

    const processedAttrs = attrs
      .replace(/@(\w[\w-]*)/g, 'data-bind-$1')
      .replace(/#(\w[\w-]*)/g, 'data-lifecycle-$1');
    return `<${tag} ${processedAttrs}>`;
  });
}
