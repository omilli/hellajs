import { stringify } from './shared';
import type { CSSObject, CSSOptions } from './types';

/**
 * Reference counts for tracking usage of CSS rules.
 */
const refCounts = new Map<string, number>();

/**
 * Inline memoization cache.
 */
const inlineCache = new Map<string, string>();

/**
 * CSS rules storage.
 */
let cssRulesMap = new Map<string, string>();

/**
 * Style element for CSS rules.
 */
let styleCounter = 0;


/**
 * Gets or creates the CSS style element.
 * @returns The CSS style element.
 */
function styleElement(): HTMLStyleElement {
  if (!document.getElementById('hella-css')) {
    let style = document.createElement('style');
    style.id = 'hella-css';
    document.head.appendChild(style);
  }
  return document.getElementById('hella-css') as HTMLStyleElement;
}

/**
 * Creates CSS rules from JavaScript objects and returns a class name for styling elements.
 * @param obj - CSS object containing style properties and nested selectors
 * @param options - Optional configuration object
 * @returns The generated class name string
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  const { scoped, name, global } = options;

  // Generate hash for memoization
  const hashKey = `inline:${stringify(obj)}:${scoped || ''}:${name || ''}:${!!global}`;

  if (inlineCache.has(hashKey)) return inlineCache.get(hashKey)!;

  let className = '';
  let selector = '';

  if (!global) {
    className = name || `c${(++styleCounter).toString(36)}`;
    selector = scoped ? `${scoped} .${className}` : `.${className}`;
  }
  // Generate CSS
  const cssText = global ? process(obj, '', true) : process(obj, selector, false);

  // Store rule and increment reference
  const key = stringify({ obj, selector, global });
  cssRulesMap.get(key) !== cssText && setRules(new Map(cssRulesMap).set(key, cssText));

  refCounts.set(key, (refCounts.get(key) || 0) + 1);

  const result = global ? '' : className;
  inlineCache.set(hashKey, result);

  return result;
};;

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 * @param obj - CSS object to remove (must match exactly the object used in css())
 * @param options - Optional configuration object (must match the options used in css())
 */
export function cssRemove(obj: CSSObject, options: CSSOptions = {}): void {
  const { scoped, name, global } = options;

  // Simple approach: iterate through all existing rules and find ones that match our object
  const objStr = stringify(obj);
  const keysToRemove: string[] = [];

  // Check all keys in refCounts
  for (const [key] of refCounts) {
    // Parse the key to check if it matches our object
    if (key.includes(objStr)) {
      // Check if global flag matches
      const keyGlobal = key.includes('"global":true');
      keyGlobal === !!global && keysToRemove.push(key);
    }
  }

  // Remove matching keys
  for (const key of keysToRemove) {
    const currentCount = refCounts.get(key) || 0;
    if (currentCount > 1) {
      refCounts.set(key, currentCount - 1);
    } else {
      // Remove completely
      refCounts.delete(key);
      if (cssRulesMap.has(key)) {
        const newRules = new Map(cssRulesMap);
        newRules.delete(key);
        setRules(newRules);
      }
    }
  }

  // Also clear from inline cache
  const hashKey = `inline:${stringify(obj)}:${scoped || ''}:${name || ''}:${!!global}`;
  inlineCache.delete(hashKey);
}

/**
 * Clears all CSS rules, caches, and resets the CSS system to initial state.
 */
export function cssReset() {
  inlineCache.clear();
  refCounts.clear();
  setRules(new Map());
  styleElement().textContent = '';
  styleCounter = 0;
}


/**
 * Processes a CSS object into a CSS string.
 * @param obj The CSS object to process.
 * @param selector The current CSS selector.
 * @param isGlobal Whether the CSS is global.
 * @returns The processed CSS string.
 */
function process(obj: CSSObject, selector: string, isGlobal: boolean): string {
  const rules: string[] = [];
  const properties: string[] = [];
  const keys = Object.keys(obj);
  let i = 0;

  while (i < keys.length) {
    const key = keys[i++];
    const value = obj[key];
    if (value == null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      if (key.startsWith('@')) {
        // For @media, @supports, etc., process content with empty selector to avoid nesting
        const nestedCss = process(value as CSSObject, '', true);
        rules.push(`${key}{${nestedCss}}`);
      } else {
        const nestedSelector = key.startsWith('&')
          ? key.replace(/&/g, selector)
          : !isGlobal
            ? `${selector} ${key}`
            : key;

        rules.push(process(value as CSSObject, nestedSelector, isGlobal));
      }
    } else {
      const property = key.startsWith('--') ? key : key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
      const cssValue = Array.isArray(value) ? value.join(', ') : String(value);
      properties.push(`${property}:${cssValue}`);
    }
  }

  return properties.length > 0 && rules.length > 0
    ? `${selector}{${properties.join(';')}}${rules.join('')}`
    : properties.length > 0
      ? `${selector}{${properties.join(';')}}`
      : rules.join('');
}

/**
 * Set CSS rules and update DOM.
 */
function setRules(rules: Map<string, string>): void {
  cssRulesMap = rules;
  styleElement().textContent = Array.from(cssRulesMap.values()).join('');
}
