// Build VNode AST objects

export function buildVNode(t, tag, props, on, bind, lifecycle, children) {
  const vNodeProperties = [
    t.objectProperty(t.identifier('tag'), t.stringLiteral(tag))
  ];

  if (props && props.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier('props'), t.objectExpression(props))
    );
  }

  if (on && on.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier('on'), t.objectExpression(on))
    );
  }

  if (bind && bind.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier('bind'), t.objectExpression(bind))
    );
  }

  if (lifecycle && lifecycle.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier('lifecycle'), t.objectExpression(lifecycle))
    );
  }

  if (children && children.length > 0) {
    // Check if all children are string literals (static text only)
    const allStringLiterals = children.every(child => t.isStringLiteral(child));

    if (allStringLiterals) {
      // Join all string literals into a single string
      const joinedText = children.map(child => child.value).join('');
      vNodeProperties.push(
        t.objectProperty(t.identifier('children'), t.arrayExpression([
          t.stringLiteral(joinedText)
        ]))
      );
    } else {
      // Check if any children are spread elements
      const hasSpread = children.some(child => t.isSpreadElement(child));

      if (hasSpread) {
        // If we have spread elements, build the children array dynamically
        vNodeProperties.push(
          t.objectProperty(t.identifier('children'), t.arrayExpression(children))
        );
      } else {
        // Normal array
        vNodeProperties.push(
          t.objectProperty(t.identifier('children'), t.arrayExpression(children))
        );
      }
    }
  }

  return t.objectExpression(vNodeProperties);
}
