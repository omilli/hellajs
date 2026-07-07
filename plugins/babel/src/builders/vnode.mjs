// Build HellaNode AST objects


/**
 * Build HellaNode object expression from categorized attributes.
 * @param {typeof import("@babel/core").types} t
 * @param {string} tag
 * @param {import("@babel/core").ObjectProperty[]} props
 * @param {import("@babel/core").ObjectProperty[]} on
 * @param {import("@babel/core").ObjectProperty[]} e
 * @param {import("@babel/core").ObjectProperty[]} bind
 * @param {import("@babel/core").ObjectProperty[]} hooks
 * @param {import("@babel/core").Expression[]} children
 * @param {import("@babel/core").ObjectProperty[]} error
 * @returns {import("@babel/core").ObjectExpression}
 */
export function buildHellaNode(t, tag, props, on, e, bind, hooks, children, error) {
  const vNodeProperties = [
    t.objectProperty(t.identifier("tag"), t.stringLiteral(tag))
  ];

  if (props && props.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("props"), t.objectExpression(props))
    );
  }

  if (on && on.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("on"), t.objectExpression(on))
    );
  }

  if (e && e.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("e"), t.objectExpression(e))
    );
  }

  if (bind && bind.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("bind"), t.objectExpression(bind))
    );
  }

  if (hooks && hooks.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("hooks"), t.objectExpression(hooks))
    );
  }

  // Add error property
  if (error && error.length > 0) {
    vNodeProperties.push(
      t.objectProperty(t.identifier("error"), t.objectExpression(error))
    );
  }

  if (children && children.length > 0) {
    // Check if all children are string literals (static text only)
    const allStringLiterals = children.every(child => t.isStringLiteral(child));

    if (allStringLiterals) {
      // Join all string literals into a single string
      const joinedText = children.map(child => child.value).join("");
      vNodeProperties.push(
        t.objectProperty(t.identifier("children"), t.arrayExpression([
          t.stringLiteral(joinedText)
        ]))
      );
    } else {
      vNodeProperties.push(
        t.objectProperty(t.identifier("children"), t.arrayExpression(children))
      );
    }
  }

  return t.objectExpression(vNodeProperties);
}
