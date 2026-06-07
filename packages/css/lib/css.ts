import { stringify } from './shared';
import type { CSSObject, CSSOptions } from './types';

const STYLE_ID = 'hella-css';

const refCounts = new Map<string, number>();
const inlineCache = new Map<string, string>();
const cssRulesMap = new Map<string, string>();

function styleElement(): HTMLStyleElement {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  return document.getElementById(STYLE_ID) as HTMLStyleElement;
}

function hashKey(obj: CSSObject, options: CSSOptions): string {
  return `${stringify(obj)}:${options.name || ''}`;
}

/**
 * Creates CSS rules from JavaScript objects. Global by default. Returns a class name when `name` is provided.
 * @param obj CSS object containing style properties and nested selectors
 * @param options Optional configuration. Provide `name` to create a scoped `.{name}` selector and get a return value for `class` attributes.
 * @returns The provided `name` string, or empty string for global styles
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  const key = hashKey(obj, options);

  if (inlineCache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    return inlineCache.get(key)!;
  }

  const { name } = options;
  const isGlobal = !name;
  const selector = name ? `.${name}` : '';
  const cssText = process(obj, selector, isGlobal);

  if (cssRulesMap.get(key) !== cssText) {
    cssRulesMap.set(key, cssText);
    styleElement().textContent = Array.from(cssRulesMap.values()).join('');
  }

  refCounts.set(key, (refCounts.get(key) || 0) + 1);

  const result = name || '';
  inlineCache.set(key, result);

  return result;
}

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 * @param obj CSS object to remove (structurally identical objects match, same reference not required)
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
}

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

      if (property === 'content' && typeof value === 'string' && !value.startsWith('"') && !value.startsWith("'")) {
        cssValue = `"${value}"`;
      }

      properties.push(`${property}:${cssValue}`);
    }
  }

  if (properties.length === 0) return rules.join('');
  return `${selector}{${properties.join(';')}}${rules.join('')}`;
}
