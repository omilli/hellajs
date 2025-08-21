/**
 * Manages the stylesheet element in the document head.
 * @param [el] The stylesheet element to set.
 * @returns The current stylesheet element.
 */
export function styles(el?: HTMLStyleElement | null) {
  if (typeof el !== 'undefined') {
    styleSheet = el;
  }

  return styleSheet;
}

/**
 * Manages a counter for generating unique class names.
 * @param [val] The value to set the counter to.
 * @returns The current counter value.
 */
export function counter(val?: number): number {
  if (val) {
    styleCounter = val;
  }
  return styleCounter;
}

export const cache = new Map<string, string>();
export const cssRules = new Map<string, string>();
export const inlineMemo = new Map<string, string>();
export const refCounts = new Map<string, number>();

let styleSheet: HTMLStyleElement | null = null;
let styleCounter = 0;