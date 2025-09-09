import { stringify } from "./shared";

/**
 * CSS variable rules storage.
 */
let varsRulesMap = new Map<string, string>();

/**
 * Gets or creates the CSS variables style element.
 * @returns The CSS variables style element.
 */
function styleElement(): HTMLStyleElement {
  if (!document.getElementById('hella-vars')) {
    let style = document.createElement('style');
    style.id = 'hella-vars';
    document.head.appendChild(style);
  }
  return document.getElementById('hella-vars') as HTMLStyleElement;
}

/**
 * Cache for CSS variables.
 */
const cache = new Map<string, { flattened: Record<string, any>, result: Record<string, string> }>();

export function cssVars(vars: Record<string, any>): any {
  const inputHash = hash(stringify(vars));
  const cached = cache.get(inputHash);
  if (cached) {
    applyRules(cached.flattened);
    return cached.result;
  }

  const flat = flattenVars(vars);
  applyRules(flat);

  const result: any = {};
  const flatKeys = Object.keys(flat);
  let i = 0, l = flatKeys.length;

  while (i < l) {
    const key = flatKeys[i++];
    const cssVarValue = `var(--${key.replace(/\./g, '-')})`;

    const keyParts = key.split('.');
    let current = result;
    let j = 0, kl = keyParts.length;

    while (j < kl - 1) {
      const part = keyParts[j++];
      current[part] = current[part] || {};
      current = current[part];
    }

    current[keyParts[keyParts.length - 1]] = cssVarValue;
  }

  cache.size >= 100 && cache.clear();
  cache.set(inputHash, { flattened: flat, result });
  return result;
}

/**
 * Resets all CSS variable caches and rules.
 */
export function cssVarsReset() {
  setRules(new Map());
  styleElement().textContent = '';
  cache.clear();
}

/**
 * Applies flattened CSS variable rules.
 * @param flat The flattened CSS variable rules.
 */
function applyRules(flat: Record<string, any>) {
  const entries = Object.entries(flat);
  let i = 0;
  const rules = new Map<string, string>();
  while (i < entries.length) {
    const [k, v] = entries[i++];
    rules.set(k, String(v));
  }
  setRules(rules);
}


/**
 * Flattens a nested object into a single-level object with dot-separated keys.
 * @param obj The object to flatten.
 * @param prefix The prefix for the keys.
 * @param result The object to store the flattened key-value pairs.
 * @returns The flattened object.
 */
function flattenVars(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  const keys = Object.keys(obj);
  let i = 0, l = keys.length;

  while (i < l) {
    const key = keys[i++];
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    value && typeof value === 'object' && !Array.isArray(value)
      ? flattenVars(value, newKey, result)
      : result[newKey] = value;
  }
  return result;
}

/**
 * Set CSS variable rules and update DOM.
 * @param rules The CSS variable rules to set.
 */
function setRules(rules: Map<string, string>): void {
  varsRulesMap = rules;
  if (varsRulesMap.size > 0) {
    let cssVars = '';
    const iterator = varsRulesMap.entries();
    let next = iterator.next();
    while (!next.done) {
      const [key, value] = next.value;
      cssVars += `--${key.replace(/\./g, '-')}: ${value};`;
      next = iterator.next();
    }
    styleElement().textContent = `:root{${cssVars}}`;
  } else {
    styleElement().textContent = '';
  }
}

/**
 * Creates a hash from a string.
 * @param str The string to hash.
 * @returns A hash string.
 */
function hash(str: string): string {
  let hash = 5381;
  const strLength = str.length;
  let i = strLength;
  while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
  return (hash >>> 0).toString(36);
}
