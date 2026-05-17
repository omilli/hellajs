import { stringify } from './shared';
import type { CSSObject, CSSOptions } from './types';

const STYLE_ID = 'hella-css';

const refCounts = new Map<string, number>();
const inlineCache = new Map<string, string>();
const cssRulesMap = new Map<string, string>();
let styleCounter = 0;

/**
 * Gets or creates the CSS style element.
 */
function styleElement(): HTMLStyleElement {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  return document.getElementById(STYLE_ID) as HTMLStyleElement;
}

/**
 * Computes a deterministic hash key from CSS object and options.
 */
function hashKey(obj: CSSObject, options: CSSOptions): string {
  const { scoped, name, global } = options;
  return `${stringify(obj)}:${scoped || ''}:${name || ''}:${!!global}`;
}

/**
 * Creates CSS rules from JavaScript objects and returns a class name for styling elements.
 * @param obj CSS object containing style properties and nested selectors
 * @param options Optional configuration object
 * @returns The generated class name string
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  const key = hashKey(obj, options);

  if (inlineCache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    return inlineCache.get(key)!;
  }

  const { scoped, name, global } = options;
  let className = '';
  let selector = '';

  if (!global) {
    className = name || `c${(++styleCounter).toString(36)}`;
    selector = scoped ? `${scoped} .${className}` : `.${className}`;
  }

  const cssText = global ? process(obj, '', true) : process(obj, selector, false);

  if (cssRulesMap.get(key) !== cssText) {
    cssRulesMap.set(key, cssText);
    styleElement().textContent = Array.from(cssRulesMap.values()).join('');
  }

  refCounts.set(key, (refCounts.get(key) || 0) + 1);

  const result = global ? '' : className;
  inlineCache.set(key, result);

  return result;
}

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 * @param obj CSS object to remove (must match exactly the object used in css())
 * @param options Optional configuration object (must match the options used in css())
 */
export function cssRemove(obj: CSSObject, options: CSSOptions = {}): void {
  const key = hashKey(obj, options);

  if (!refCounts.has(key)) return;

  const currentCount = refCounts.get(key)!;
  if (currentCount > 1) {
    refCounts.set(key, currentCount - 1);
  } else {
    refCounts.delete(key);
    inlineCache.delete(key);
    if (cssRulesMap.has(key)) {
      cssRulesMap.delete(key);
      styleElement().textContent = Array.from(cssRulesMap.values()).join('');
    }
  }
}

/**
 * Clears all CSS rules, caches, and resets the CSS system to initial state.
 */
export function cssReset() {
  inlineCache.clear();
  refCounts.clear();
  cssRulesMap.clear();
  styleElement().textContent = '';
  styleCounter = 0;
}

/**
 * Processes a CSS object into a CSS string.
 * @param obj The CSS object to process
 * @param selector The current CSS selector
 * @param isGlobal Whether the CSS is global
 * @returns The processed CSS string
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
      let cssValue = Array.isArray(value) ? value.join(', ') : String(value);

      // Auto-quote content property values that aren't already quoted
      if (property === 'content' && typeof value === 'string' && !value.startsWith('"') && !value.startsWith("'")) {
        cssValue = `"${value}"`;
      }

      properties.push(`${property}:${cssValue}`);
    }
  }

  if (properties.length === 0) return rules.join('');
  return `${selector}{${properties.join(';')}}${rules.join('')}`;
}
