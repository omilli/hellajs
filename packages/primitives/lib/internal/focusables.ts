/**
 * Selector matching elements that receive keyboard focus: links, enabled form
 * controls, and explicit tabindex targets.
 * @internal
 */
export const FOCUSABLE_SELECTOR =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex=\"-1\"])";

/**
 * Collects `root`'s focusable descendants in document order — or the elements
 * matching `selector` when given.
 * @internal
 */
export function getFocusables(root: ParentNode, selector?: string): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(selector ?? FOCUSABLE_SELECTOR);
  const elements: HTMLElement[] = [];
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    elements.push(nodes[i]!);
    i++;
  }
  return elements;
}
