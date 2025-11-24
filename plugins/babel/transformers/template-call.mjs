// Template() call unwrapper transformer

export function createTemplateCallTransformer(t) {
  return {
    // Transform template() calls to regular functions (no runtime helper needed)
    // Use exit phase to ensure child nodes (html``) are transformed first
    CallExpression: {
      exit(path) {
        const { callee, arguments: args } = path.node;

        // Check if this is a template() call
        if (!t.isIdentifier(callee, { name: 'template' })) return;
        if (!args || args.length === 0) return;

        // template(fn) -> fn
        if (args.length === 1 && (t.isArrowFunctionExpression(args[0]) || t.isFunctionExpression(args[0]))) {
          path.replaceWith(args[0]);
        }
        // template("name", fn) -> fn
        else if (args.length === 2 && t.isStringLiteral(args[0]) && (t.isArrowFunctionExpression(args[1]) || t.isFunctionExpression(args[1]))) {
          path.replaceWith(args[1]);
        }
      }
    }
  };
}
