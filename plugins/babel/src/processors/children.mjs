// Process JSX children

// Filter empty children from JSX
export function filterEmptyChildren(t, children) {
  const result = [];

  for (const child of children) {
    if (t.isJSXText(child)) {
      if (typeof child.value === 'string' && child.value.trim()) {
        // Normalize whitespace but preserve meaningful spaces
        const normalized = child.value.replace(/\s+/g, ' ');
        result.push(t.stringLiteral(normalized));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Skip JSX comments (expression == null or JSXEmptyExpression)
      if (
        child.expression == null ||
        t.isJSXEmptyExpression(child.expression)
      ) continue;

      const expression = child.expression;

      // Check if this is props.children - if so, spread it
      if (t.isMemberExpression(expression) &&
        t.isIdentifier(expression.object, { name: 'props' }) &&
        t.isIdentifier(expression.property, { name: 'children' })) {
        // Return a spread element for props.children
        result.push(t.spreadElement(expression));
        continue;
      }

      result.push(expression);
    } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      result.push(child);
    }
  }

  return result;
}
