// Process JSX and template children

// Filter empty children from JSX
export function filterEmptyChildren(t, children, isComponent = false) {
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

// Process template children
export function processTemplateChildren(t, children, expressions, isComponent) {
  const processed = [];

  for (const child of children) {
    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (trimmed) {
        // Normalize whitespace
        const normalized = child.replace(/\s+/g, ' ');
        processed.push(t.stringLiteral(normalized));
      }
    } else if (typeof child === 'object') {
      // Will be processed by templateNodeToBabel
      processed.push(child);
    }
  }

  // Join consecutive string literals
  if (processed.length > 1) {
    const joined = [];
    let i = 0;
    const len = processed.length;

    while (i < len) {
      if (t.isStringLiteral(processed[i])) {
        let text = processed[i].value;
        let j = i + 1;

        // Collect consecutive string literals
        while (j < len && t.isStringLiteral(processed[j])) {
          text += processed[j].value;
          j++;
        }

        joined.push(t.stringLiteral(text));
        i = j;
      } else {
        joined.push(processed[i]);
        i++;
      }
    }

    return joined;
  }

  return processed;
}
