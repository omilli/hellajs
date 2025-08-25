import { signal, effect } from '@hellajs/core';

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

// Non-reactive Maps (cache, refCounts, inlineMemo don't need reactivity)
export const cache = new Map<string, string>();
export const inlineMemo = new Map<string, string>();
export const refCounts = new Map<string, number>();

// Reactive signals for CSS rules
export const cssRules = signal(new Map<string, string>());

// CSS variables state (will be made reactive in vars.ts)
export const varsRules = signal(new Map<string, string>());

let styleSheet: HTMLStyleElement | null = null;
let styleCounter = 0;

// Auto-update stylesheet when CSS rules change
let stylesEffectInitialized = false;
export function initializeStylesEffect() {
  if (stylesEffectInitialized) return;
  stylesEffectInitialized = true;

  effect(() => {
    const rules = cssRules();
    const sheet = styles();
    if (!sheet || !rules) return;
    
    // Convert Map values to array and join
    sheet.textContent = Array.from(rules.values()).join('');
  });
}