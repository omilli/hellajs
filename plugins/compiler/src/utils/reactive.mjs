// Auto-wrap heuristic for reactive template expressions.
//
// Wrap a call-containing expression in an arrow thunk so dom's effect machinery
// tracks it (mirrors SolidJS's compiled reactivity). Applies to element children
// AND element attribute values — never to component children/props (which may
// treat the value as a plain value, not a function).

import { arrowFunctionExpression, isIdentifier } from "../builders/vnode.mjs";

/**
 * Wrap `expr` in `() => expr` iff it is "reactive-looking": its subtree contains
 * a CallExpression (signal read, method call, etc.) AND its top-level node is not
 * already a function.
 *
 * The top-level function check is the mandatory double-wrap guard: without it an
 * explicit `() => foo()` becomes `() => (() => foo())`, and `resolveNode`'s reactive
 * arm would stringify the inner arrow (render its source text) instead of calling it.
 * @param {import("estree").Expression} expr
 * @returns {import("estree").Expression}
 */
export function maybeReactive(expr) {
  if (expr.type === "ArrowFunctionExpression" || expr.type === "FunctionExpression") return expr;
  // A top-level raw() call is a value sentinel (opaque HTML), not a reactive read —
  // wrapping it would turn the child into a getter region and change both the
  // marker shape and the ssr classification. Deeper raw calls inside a larger
  // expression still wrap (the expression's own reactivity wins).
  if (expr.type === "CallExpression" && isIdentifier(expr.callee, "raw")) return expr;
  return containsCall(expr) ? arrowFunctionExpression([], expr) : expr;
}

/**
 * True if `node`'s subtree contains any call-like expression
 * (CallExpression / NewExpression; estree wraps optional calls in a
 * ChainExpression whose inner CallExpression this walk reaches). Recurses over
 * every child slot generically — estree nodes carry no visitor-key table, and
 * JSX-carrying subtrees are safe (a JSX attribute value containing a call still
 * reads as reactive-looking).
 * @param {import("estree").Node} node
 * @returns {boolean}
 */
function containsCall(node) {
  if (!node || typeof node.type !== "string") return false;
  if (node.type === "CallExpression" || node.type === "NewExpression") return true;
  const keys = Object.keys(node);
  let i = 0;
  while (i < keys.length) {
    const val = node[keys[i]];
    i++;
    if (Array.isArray(val)) {
      let j = 0;
      while (j < val.length) {
        const child = val[j];
        j++;
        if (child && typeof child.type === "string" && containsCall(child)) return true;
      }
    } else if (val && typeof val.type === "string" && containsCall(val)) {
      return true;
    }
  }
  return false;
}
