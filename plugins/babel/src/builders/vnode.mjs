// Build HellaNode AST objects
import { buildChildrenValue } from "./children.mjs";

/**
 * Build HellaNode object expression from categorized attributes.
 * @param {typeof import("@babel/core").types} t
 * @param {string} tag
 * @param {import("@babel/core").ObjectProperty[]} props
 * @param {import("@babel/core").ObjectProperty[]} on
 * @param {import("@babel/core").ObjectProperty[]} e
 * @param {import("@babel/core").ObjectProperty[]} hooks
 * @param {import("@babel/core").Expression[]} children
 * @param {import("@babel/core").ObjectProperty[]} error
 * @returns {import("@babel/core").ObjectExpression}
 */
export function buildHellaNode(t, tag, props, on, e, hooks, children, error) {
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
    vNodeProperties.push(
      t.objectProperty(t.identifier("children"), buildChildrenValue(t, children))
    );
  }

  return t.objectExpression(vNodeProperties);
}
