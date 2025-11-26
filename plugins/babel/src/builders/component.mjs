// Build component call AST

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

  // Wrap component call in componentScope for automatic scope management
  return t.callExpression(
    t.identifier("componentScope"),
    [tagCallee, finalProps]
  );
}
