// Build component call AST

// Components that bypass component wrapping
const PASSTHROUGH_COMPONENTS = new Set(['ForEach', 'Portal']);

export function buildComponentCall(t, tagCallee, props, children) {
  let finalProps;

  if (children && children.length > 0) {
    // Check if all children are string literals (static text only)
    const allStringLiterals = children.every(child => t.isStringLiteral(child));

    const childrenValue = allStringLiterals
      ? t.arrayExpression([t.stringLiteral(children.map(child => child.value).join(''))])
      : t.arrayExpression(children);

    finalProps = t.objectExpression([
      ...props,
      t.objectProperty(
        t.identifier("children"),
        childrenValue
      )
    ]);
  } else if (props.length > 0) {
    finalProps = t.objectExpression(props);
  } else {
    finalProps = t.objectExpression([]);
  }

  // Check if this is a passthrough component (direct call without component)
  const tagName = t.isIdentifier(tagCallee) ? tagCallee.name : null;
  if (tagName && PASSTHROUGH_COMPONENTS.has(tagName)) {
    return t.callExpression(tagCallee, [finalProps]);
  }

  // Wrap component call in component for automatic scope management
  return t.callExpression(
    t.identifier("component"),
    [tagCallee, finalProps]
  );
}
