// Handle style tag transformation
import { ensureCssImport } from '../utils/imports.mjs';

export function handleStyleTag(t, path, opening) {
  // Extract props as options
  const options = {};
  opening.attributes.forEach(attr => {
    if (t.isJSXAttribute(attr)) {
      const key = attr.name.name;
      if (attr.value && t.isStringLiteral(attr.value)) {
        options[key] = attr.value.value;
      }
    }
  });

  // Extract children (should be a single JSXExpressionContainer with an ObjectExpression)
  let cssObject = null;
  path.node.children.forEach(child => {
    if (t.isJSXExpressionContainer(child) && t.isObjectExpression(child.expression)) {
      cssObject = child.expression;
    }
  });

  // Build css(options) call
  const cssArgs = [cssObject ? cssObject : t.objectExpression([])];
  if (Object.keys(options).length > 0) {
    // Convert string options to correct types if possible
    const optsProps = Object.entries(options).map(([k, v]) =>
      t.objectProperty(t.identifier(k), v === 'true' ? t.booleanLiteral(true) : v === 'false' ? t.booleanLiteral(false) : t.stringLiteral(v))
    );
    cssArgs.push(t.objectExpression(optsProps));
  }

  // Ensure import { css } from "@hellajs/css" exists
  const program = path.findParent(p => p.isProgram());
  ensureCssImport(t, program);

  path.replaceWith(
    t.callExpression(
      t.identifier('css'),
      cssArgs
    )
  );
}
