// Process JSX children
import { maybeReactive } from "../utils/reactive.mjs";

/**
 * Filter empty/whitespace children and spread props.children.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXElement["children"]} children
 * @param {boolean} isComponent When false (element/fragment), call-containing child
 *   expressions are auto-wrapped into arrow thunks for reactivity; when true
 *   (component), children pass through unwrapped (components may treat
 *   `props.children` as a value, not a function).
 * @returns {import("@babel/core").Expression[]}
 */
export function filterEmptyChildren(t, children, isComponent) {
  const result = [];

  for (const child of children) {
    if (t.isJSXText(child)) {
      if (typeof child.value === "string" && child.value.trim()) {
        // Normalize whitespace but preserve meaningful spaces
        const normalized = child.value.replace(/\s+/g, " ");
        result.push(t.stringLiteral(normalized));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Skip JSX comments (expression == null or JSXEmptyExpression)
      if (
        child.expression == null ||
        t.isJSXEmptyExpression(child.expression)
      ) continue;

      const expression = child.expression;

      // Check if this is props.children - if so, spread it
      if (t.isMemberExpression(expression) &&
        t.isIdentifier(expression.object, { name: "props" }) &&
        t.isIdentifier(expression.property, { name: "children" })) {
        // Return a spread element for props.children
        result.push(t.spreadElement(expression));
        continue;
      }

      result.push(isComponent ? expression : maybeReactive(t, expression));
    } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      result.push(child);
    }
  }

  return result;
}
