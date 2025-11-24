// Process attribute values

export function processAttributeValue(value, isComponent, attributeName = '') {
  if (!value) return value;

  // Extract the actual value from JSXExpressionContainer if needed
  const actualValue = value.expression !== undefined ? value.expression : value;

  return actualValue;
}
