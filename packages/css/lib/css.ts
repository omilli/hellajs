import { cache, counter, cssRules, inlineMemo, refCounts, styles } from "./state";
import type { CSSObject, CSSOptions } from "./types";
import { stringify, update, process } from "./utils";

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

  if (!styles()) {
    styles(document.createElement('style'));
    styles()!.setAttribute('hella-css', '');
    document.head.appendChild(styles() as HTMLStyleElement);
  }

  cssRules.set(key, cssText);
  update();
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
  if (cssRules.has(key)) {
    const count = (refCounts.get(key) || 1) - 1;

    if (count <= 0) {
      cssRules.delete(key);
      cache.delete(key);
      refCounts.delete(key);
      update();

      if (cssRules.size === 0 && styles()) {
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
  cssRules.clear();
  inlineMemo.clear();
  refCounts.clear();

  if (styles()) {
    styles()?.remove();
    styles(null);
  }

  counter(0);
}