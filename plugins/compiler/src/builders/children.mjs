// Build the children value expression for HellaNodes and component calls.
import {
  arrayExpression,
  callExpression,
  identifier,
  isSpreadElement,
  isStringLiteral,
  memberExpression,
  stringLiteral,
} from "./vnode.mjs";

/**
 * Build the `children` value expression from the processed child list.
 *
 * A bare `{props.children}` in JSX arrives as a SpreadElement marker (from
 * `filterEmptyChildren`). Spreading it into the emitted array is only correct
 * when the value is an array at runtime — a string child would split into
 * per-character children (duplicating trailing siblings under hydration) and
 * a single vnode/null/undefined child would throw. When a spread is present,
 * the whole list is emitted as one `Array.prototype.concat` call: array
 * arguments splice flat, non-array arguments append as-is, so every
 * `HellaChildren` shape degrades safely. Pure lists keep the plain array form
 * (joined into a single string literal when entirely static text).
 * @param {import("estree").Expression[]} children Processed child expressions; may contain SpreadElements
 * @returns {import("estree").Expression} Array expression or concat call expression
 */
export function buildChildrenValue(children) {
  let hasSpread = false;
  let i = 0;
  const len = children.length;
  while (i < len) {
    if (isSpreadElement(children[i++])) {
      hasSpread = true;
      break;
    }
  }

  if (!hasSpread) {
    const allStringLiterals = children.every((child) => isStringLiteral(child));
    if (allStringLiterals) {
      const joinedText = children.map((child) => child.value).join("");
      return arrayExpression([stringLiteral(joinedText)]);
    }
    return arrayExpression(children);
  }

  const parts = [];
  i = 0;
  while (i < len) {
    const child = children[i++];
    // concat flattens one level per array argument — wrap concrete children so
    // they append individually alongside the spliced passthrough.
    parts.push(isSpreadElement(child) ? child.argument : arrayExpression([child]));
  }
  return callExpression(memberExpression(arrayExpression([]), identifier("concat")), parts);
}
