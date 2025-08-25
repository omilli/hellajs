import { cache, counter, cssRules, inlineMemo, refCounts, styles, initializeStylesEffect } from "./state";
import type { CSSObject, CSSOptions } from "./types";
import { stringify, process } from "./utils";

// Performance optimization: Reuse Map instance for better performance
const reusableRulesMap = new Map<string, string>();
let pendingDOMOperations: Array<() => void> = [];
let domOperationScheduled = false;

/**
 * Creates and injects CSS rules, returning a class name for styling.
 * Manages styles via reference counting for automatic cleanup.
 * @param obj The CSS object to process.
 * @param [options] Options for scoping, naming, or global application.
 * @returns The generated class name, or an empty string for global styles.
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  const { scoped, name, global = false } = options;
  let selector = '', className = name || '';
  const hashKey = stringify({ obj, scoped, name, global });

  if (inlineMemo.has(hashKey)) return inlineMemo.get(hashKey)!;

  if (!global) {
    className = name || `c${(counter(counter() + 1)).toString(36)}`;
    selector = `.${className}`;
    if (scoped) selector = `.${scoped} ${selector}`;
  }

  const key = stringify({ obj, selector, global });

  if (cache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    inlineMemo.set(hashKey, cache.get(key)!);
    return cache.get(key)!;
  }

  const cssText = global ? process(obj, '', true) : process(obj, selector, false);

  // Performance optimization: Defer DOM operations
  if (!styles()) {
    const createStylesheet = () => {
      if (!styles()) { // Double-check in case another call created it
        const styleEl = document.createElement('style');
        styleEl.setAttribute('hella-css', '');
        document.head.appendChild(styleEl);
        styles(styleEl);
        // Initialize reactive effect for automatic DOM updates
        initializeStylesEffect();
      }
    };
    
    // For CSS creation, we need the stylesheet to exist immediately for caching to work
    // but we can still defer some operations
    createStylesheet();
  }

  // Performance optimization: Reuse Map instead of creating new one
  const currentRules = cssRules();
  currentRules.set(key, cssText);
  
  // Clear and reuse the Map to trigger reactivity without new allocation
  reusableRulesMap.clear();
  currentRules.forEach((value, mapKey) => {
    reusableRulesMap.set(mapKey, value);
  });
  cssRules(reusableRulesMap);
  
  refCounts.set(key, 1);

  const result = global ? '' : className;

  cache.set(key, result);
  inlineMemo.set(hashKey, result);

  return result;
}

/**
 * Decrements the reference count for a set of CSS rules, removing them if no longer used.
 * @param obj The CSS object to remove.
 * @param [options] The same options used to create the CSS rules.
 */
css.remove = function (obj: CSSObject, options: CSSOptions = {}) {
  let selector = '', className = options.name || '';

  if (!options.global) {
    className = options.name || '';
    selector = `.${className}`;

    if (options.scoped) selector = `.${options.scoped} ${selector}`;

    if (!options.name) {
      const hashKey = stringify({ obj, scoped: options.scoped ?? '', name: undefined, global: !!options.global });
      const generatedClass = inlineMemo.get(hashKey);

      if (generatedClass) {
        className = generatedClass;
        selector = `.${className}`;

        if (options.scoped) selector = `.${options.scoped} ${selector}`;
      }
    }
  }
  const key = stringify({ obj, selector, global: !!options.global });
  const currentRules = cssRules();
  if (currentRules.has(key)) {
    const count = (refCounts.get(key) || 1) - 1;

    if (count <= 0) {
      // Performance optimization: Reuse Map instead of creating new one
      currentRules.delete(key);
      reusableRulesMap.clear();
      currentRules.forEach((value, mapKey) => {
        reusableRulesMap.set(mapKey, value);
      });
      cssRules(reusableRulesMap); // Trigger reactivity
      
      cache.delete(key);
      refCounts.delete(key);

      if (currentRules.size === 0 && styles()) {
        styles()!.remove();
        styles(null);
      }
    } else {
      refCounts.set(key, count);
    }
  }
};

/**
 * Resets the entire CSS system, removing all styles and clearing caches.
 */
export function cssReset(): void {
  cache.clear();
  reusableRulesMap.clear();
  cssRules(reusableRulesMap); // Reset reactive signal with reused Map
  inlineMemo.clear();
  refCounts.clear();

  if (styles()) {
    styles()?.remove();
    styles(null);
  }

  counter(0);
}