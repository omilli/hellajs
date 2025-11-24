// Babel AST utility functions

// Get tag callee from JSX name node
export function getTagCallee(t, nameNode) {
  if (t.isJSXIdentifier(nameNode)) {
    return t.identifier(nameNode.name);
  }

  if (t.isJSXMemberExpression(nameNode)) {
    const object = getTagCallee(t, nameNode.object);
    const property = t.identifier(nameNode.property.name);
    return t.memberExpression(object, property);
  }

  throw new Error("Unsupported JSX tag type");
}

// Normalize component name from kebab-case to PascalCase
export function normalizeComponentName(name) {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
