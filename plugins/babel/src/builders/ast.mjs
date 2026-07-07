import { processComponentAttributes, setComponentNodeToBabel } from "../processors/attributes.mjs";
import { buildHellaNode } from "./vnode.mjs";
import { buildComponentCall } from "./component.mjs";

/**
 * Convert intermediate component AST node to Babel AST.
 * @param {typeof import("@babel/core").types} t
 * @param {import("../parsers/html.mjs").HtmlNode} node
 * @param {any[]} expressions
 * @returns {import("@babel/core").Expression}
 */
export function componentNodeToBabel(t, node, expressions) {
  // Inject this function into processors/attributes.mjs to avoid circular dependency
  setComponentNodeToBabel(componentNodeToBabel);

  // Handle slot markers
  if (node.__slot !== undefined) {
    return expressions[node.__slot];
  }

  // Handle string primitives
  if (typeof node === "string") {
    return t.stringLiteral(node);
  }

  // Handle arrays (mixed content in attributes)
  if (Array.isArray(node)) {
    // Concatenate parts - build component literal
    const parts = node.map(part => {
      if (part.__slot !== undefined) {
        return expressions[part.__slot];
      }
      return t.stringLiteral(String(part));
    });

    // Build concatenation expression
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      result = t.binaryExpression("+", result, parts[i]);
    }
    return result;
  }

  // Detect component: uppercase first letter OR __SLOT_X__ (dynamic component)
  const isSlotTag = /^__SLOT_\d+__$/.test(node.tag);
  const isComponent = isSlotTag || /^[A-Z]/.test(node.tag);

  if (isComponent) {
    const { props, on, e, bind, hooks, error } = processComponentAttributes(t, node.props || {}, expressions);
    const allProps = [...props];
    if (on.length > 0) allProps.push(...on);
    if (e.length > 0) allProps.push(...e);
    if (bind.length > 0) allProps.push(...bind);
    if (hooks.length > 0) allProps.push(...hooks);
    if (error.length > 0) allProps.push(...error);

    // For dynamic components, extract the actual component from expressions
    let tagCallee;
    if (isSlotTag) {
      const match = node.tag.match(/__SLOT_(\d+)__/);
      const index = match ? parseInt(match[1]) : 0;
      tagCallee = expressions[index];
    } else {
      tagCallee = t.identifier(node.tag);
    }

    // Process children recursively
    const processedChildren = [];
    for (const child of node.children || []) {
      processedChildren.push(componentNodeToBabel(t, child, expressions));
    }

    return buildComponentCall(t, tagCallee, allProps, processedChildren);
  } else {
    const { props, on, e, bind, hooks, error } = processComponentAttributes(t, node.props || {}, expressions);

    // Process children recursively
    const processedChildren = [];
    for (const child of node.children || []) {
      processedChildren.push(componentNodeToBabel(t, child, expressions));
    }

    return buildHellaNode(
      t,
      node.tag,
      props,
      on,
      e,
      bind,
      hooks,
      processedChildren,
      error
    );
  }
}
