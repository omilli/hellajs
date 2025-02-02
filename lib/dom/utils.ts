export function getRootElement(rootSelector: string): Element {
  const rootElement = document.querySelector(rootSelector);
  if (!rootElement) {
    throw new Error(`Mount not found: ${rootSelector}`);
  }
  return rootElement;
}
