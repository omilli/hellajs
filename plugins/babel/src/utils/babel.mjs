// Babel AST utility functions

/**
 * Resolve JSXIdentifier/JSXMemberExpression to Babel Identifier/MemberExpression.
 * @param {any} t
 * @param {any} nameNode
 * @returns {any}
 */
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
