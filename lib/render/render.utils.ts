import { toError } from "../global";

// Helper to get the root element from a selector
export function getRootElement(rootSelector: string): Element {
  const rootElement = document.querySelector(rootSelector);
  if (!rootElement) {
    throw toError(`Root selector not found: ${rootSelector}`);
  }
  return rootElement;
}
