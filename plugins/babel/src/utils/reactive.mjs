// Auto-wrap heuristic for reactive template expressions.
//
// Wrap a call-containing expression in an arrow thunk so dom's effect machinery
// tracks it (mirrors SolidJS's compiled reactivity). Applies to element children
// and element `bind:` only — never to regular props or component children (which
// may treat the value as a plain value, not a function).

/**
 * Wrap `expr` in `() => expr` iff it is "reactive-looking": its subtree contains
 * a CallExpression (signal read, method call, etc.) AND its top-level node is not
 * already a function.
 *
 * The top-level function check is the mandatory double-wrap guard: without it an
 * explicit `() => foo()` becomes `() => (() => foo())`, and dom's
 * `resolveNode`/`appendToParent` would stringify the inner arrow (render its source
 * text) instead of calling it.
 * @param {typeof import("@babel/core").types} t
 * @param {any} expr
 * @returns {any}
 */
export function maybeReactive(t, expr) {
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) return expr;
  return containsCall(t, expr) ? t.arrowFunctionExpression([], expr) : expr;
}

/**
 * True if `node`'s subtree contains any call-like expression
 * (CallExpression / NewExpression / OptionalCallExpression). Recurses via babel's
 * `VISITOR_KEYS`. The top-level function guard in {@link maybeReactive} handles bare
 * `() => …`; recursion into deeper nodes is safe and intended (a ternary or member
 * chain containing a call is still reactive-looking).
 * @param {typeof import("@babel/core").types} t
 * @param {any} node
 * @returns {boolean}
 */
function containsCall(t, node) {
  if (!node || typeof node.type !== "string") return false;
  if (
    t.isCallExpression(node) ||
    t.isNewExpression(node) ||
    t.isOptionalCallExpression(node)
  ) {
    return true;
  }
  const keys = t.VISITOR_KEYS[node.type];
  if (!keys) return false;
  let i = 0;
  while (i < keys.length) {
    const val = node[keys[i]];
    i++;
    if (Array.isArray(val)) {
      let j = 0;
      while (j < val.length) {
        const child = val[j];
        j++;
        if (child && typeof child.type === "string" && containsCall(t, child)) return true;
      }
    } else if (val && typeof val.type === "string" && containsCall(t, val)) {
      return true;
    }
  }
  return false;
}
