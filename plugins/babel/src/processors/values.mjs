// Process attribute values

/**
 * Unwrap JSXExpressionContainer to get the actual value.
 * @param {import("@babel/core").JSXAttribute["value"]} value
 * @returns {import("@babel/core").Expression | import("@babel/core").JSXElement | null}
 */
export function processAttributeValue(value) {
  if (!value) return value;

  // Extract the actual value from JSXExpressionContainer if needed
  const actualValue = value.expression !== undefined ? value.expression : value;

  return actualValue;
}
