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
 * Build component() or passthrough Tag() call expression.
 * @param {import("estree").Expression} tagCallee
 * @param {import("estree").Property[]} props
 * @param {import("estree").Expression[]} children
 * @returns {import("estree").CallExpression}
 */
export function buildComponentCall(tagCallee, props, children) {
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

  // Wrap component call in component for automatic scope management
  return callExpression(identifier("component"), [tagCallee, finalProps]);
}
