// Babel AST utility functions

/**
 * Resolve JSXIdentifier/JSXMemberExpression to Babel Identifier/MemberExpression.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXIdentifier | import("@babel/core").JSXMemberExpression} nameNode
 * @returns {import("@babel/core").Identifier | import("@babel/core").MemberExpression}
 * @throws {Error} When the JSX tag name is neither a JSXIdentifier nor a JSXMemberExpression.
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

  throw new Error(`[babel-plugin-hellajs] getTagCallee: unsupported JSX tag name, received ${nameNode.type}`);
}
