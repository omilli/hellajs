// Component() call unwrapper transformer

export function createComponentCallTransformer(t) {
  return {
    // Transform component() calls to regular functions (no runtime helper needed)
    // Use exit phase to ensure child nodes (html``) are transformed first
    CallExpression: {
      exit(path) {
        const { callee, arguments: args } = path.node;

        // Check if this is a component() call
        if (!t.isIdentifier(callee, { name: 'component' })) return;
        if (!args || args.length === 0) return;

        // component(fn) -> fn (handles arrow functions, function expressions, and identifiers)
        if (args.length === 1 && (t.isArrowFunctionExpression(args[0]) || t.isFunctionExpression(args[0]) || t.isIdentifier(args[0]))) {
          path.replaceWith(args[0]);
        }
      }
    }
  };
}
