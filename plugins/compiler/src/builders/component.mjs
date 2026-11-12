// Build component() or passthrough Tag() call expression.
import { PASSTHROUGH_NAMES } from "../constants.mjs";
import { buildChildrenValue } from "./children.mjs";
import {
  callExpression,
  identifier,
  isIdentifier,
  objectExpression,
  objectProperty,
} from "./vnode.mjs";

/**
 * Build component() or passthrough Tag() call expression. The wrap branch emits
 * the transform-collected runtime uid identifier for `component` (aliased in the
 * Program-exit runtime import); the passthrough branch calls the tag directly
 * and never touches it.
 * @param {import("estree").Expression} tagCallee
 * @param {import("estree").Property[]} props
 * @param {import("estree").Expression[]} children
 * @param {import("estree").Identifier} componentCallee Runtime uid identifier for `component` (unused on the passthrough branch).
 * @returns {import("estree").CallExpression}
 */
export function buildComponentCall(tagCallee, props, children, componentCallee) {
  let finalProps;

  if (children && children.length > 0) {
    finalProps = objectExpression([
      ...props,
      objectProperty(identifier("children"), buildChildrenValue(children)),
    ]);
  } else if (props.length > 0) {
    finalProps = objectExpression(props);
  } else {
    finalProps = objectExpression([]);
  }

  // Check if this is a passthrough component (direct call without component)
  const tagName = isIdentifier(tagCallee) ? tagCallee.name : null;
  if (tagName && PASSTHROUGH_NAMES.has(tagName)) {
    return callExpression(tagCallee, [finalProps]);
  }

  // Wrap component call in component for automatic scope management; the callee
  // is the transform-collected runtime uid, not a bare specifier.
  return callExpression(componentCallee, [tagCallee, finalProps]);
}
