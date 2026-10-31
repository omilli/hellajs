// Process JSX children
import { maybeReactive } from "../utils/reactive.mjs";
import { isIdentifier, spreadElement, stringLiteral } from "../builders/vnode.mjs";

/**
 * Filter empty/whitespace children and spread props.children.
 * @param {(import("estree-jsx").JSXText | import("estree-jsx").JSXExpressionContainer | import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment)[]} children
 * @param {boolean} isComponent When false (element/fragment), call-containing child
 *   expressions are auto-wrapped into arrow thunks for reactivity; when true
 *   (component), children pass through unwrapped (components may treat
 *   `props.children` as a value, not a function).
 * @returns {import("estree").Expression[]}
 */
export function filterEmptyChildren(children, isComponent) {
  const result = [];

  let i = 0;
  const len = children.length;
  while (i < len) {
    const child = children[i++];
    if (child.type === "JSXText") {
      if (typeof child.value === "string" && child.value.trim()) {
        // JSX whitespace semantics: padding whitespace that touches a newline
        // is a reflow artifact, never meaningful space, and strips; interior
        // whitespace runs collapse to one space.
        let value = child.value;
        if (/^\s*\n/.test(value)) value = value.replace(/^\s+/, "");
        if (/\n\s*$/.test(value)) value = value.replace(/\s+$/, "");
        const normalized = value.replace(/\s+/g, " ");
        if (normalized) result.push(stringLiteral(normalized));
      }
    } else if (child.type === "JSXExpressionContainer") {
      // Skip JSX comments (expression == null or JSXEmptyExpression)
      if (child.expression == null || child.expression.type === "JSXEmptyExpression") continue;

      const expression = child.expression;

      // Check if this is props.children - if so, spread it
      if (
        expression.type === "MemberExpression" &&
        isIdentifier(expression.object, "props") &&
        isIdentifier(expression.property, "children")
      ) {
        // Return a spread element for props.children
        result.push(spreadElement(expression));
        continue;
      }

      result.push(isComponent ? expression : maybeReactive(expression));
    } else if (child.type === "JSXElement" || child.type === "JSXFragment") {
      result.push(child);
    }
  }

  return result;
}
