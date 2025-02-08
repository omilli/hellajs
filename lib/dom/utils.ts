// Helper to get the root element from a selector
export function getRootElement(rootSelector: string): Element {
  const rootElement = document.querySelector(rootSelector);
  if (!rootElement) {
    throw new Error(`Root selector not found: ${rootSelector}`);
  }
  return rootElement;
}
