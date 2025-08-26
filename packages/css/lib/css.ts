import { cache, refCounts, cssRules, createStyleManager, batchUpdates, stringify, globalState } from './shared';
import type { CSSObject, CSSOptions } from './types';

/**
 * Inline memoization cache.
 */
const inlineCache = new Map<string, string>();

/**
 * Converts a camelCase string to kebab-case.
 * @param str The string to convert.
 * @returns The kebab-cased string.
 */
function kebab(str: string): string {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
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

  for (const key in obj) {
    const value = obj[key];
    if (value == null) continue;

    if (key.startsWith('&') || key.startsWith('@') || key.startsWith(':') || key.includes(' ') ||
      (isGlobal && typeof value === 'object' && !Array.isArray(value))) {
      // Nested rule or global selector
      let nestedSelector = key;
      if (key.startsWith('&')) {
        nestedSelector = key.replace(/&/g, selector);
      } else if (!key.startsWith('@') && !isGlobal) {
        nestedSelector = `${selector} ${key}`;
      } else if (isGlobal && typeof value === 'object') {
        nestedSelector = key; // For global styles, use key as selector directly
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        rules.push(process(value as CSSObject, nestedSelector, isGlobal));
      }
    } else {
      // CSS property
      const property = kebab(key);
      const cssValue = Array.isArray(value) ? value.join(', ') : String(value);
      properties.push(`${property}:${cssValue}`);
    }
  }

  let result = '';
  if (properties.length > 0) {
    const block = properties.join(';');
    result += `${selector}{${block}}`;
  }
  if (rules.length > 0) {
    result += rules.join('');
  }

  return result;
}

/**
 * Gets or creates the main style element in the document head.
 * @returns The HTMLStyleElement for CSS rules.
 */
function getStyleElement(): HTMLStyleElement {
  if (!globalState.styleSheet) {
    globalState.styleSheet = document.createElement('style');
    globalState.styleSheet.setAttribute('hella-css', '');
    document.head.appendChild(globalState.styleSheet);
  }
  return globalState.styleSheet;
}

/**
 * Generates the next unique class name.
 * @returns A unique class name string.
 */
function nextClassName(): string {
  return `c${(++globalState.styleCounter).toString(36)}`;
}

/**
 * Manages CSS rules and their application to the DOM.
 */
const cssManager = createStyleManager({
  signal: cssRules,
  contentGenerator: (rules) => Array.from(rules.values()).join(''),
  domUpdater: (content) => {
    const sheet = getStyleElement();
    if (sheet.textContent !== content) {
      sheet.textContent = content;
    }
  },
  cachePrefix: 'css'
});

/**
 * Initializes the CSS system.
 */
function initCSS() {
  cssManager.init();
}

/**
 * Sets a CSS rule for a given key.
 * @param key The key for the CSS rule.
 * @param value The CSS rule string.
 */
function setCSSRule(key: string, value: string) {
  const current = cssRules();
  if (current.get(key) === value) return;
  
  const newRules = new Map(current);
  newRules.set(key, value);
  cssRules(newRules);
}

/**
 * Deletes a CSS rule by its key.
 * @param key The key of the CSS rule to delete.
 */
function deleteCSSRule(key: string) {
  const current = cssRules();
  if (!current.has(key)) return;
  
  const newRules = new Map(current);
  newRules.delete(key);
  cssRules(newRules);
}

/**
 * Resets all CSS rules and removes the style element from the DOM.
 */
function resetCSS() {
  cssRules(new Map());
  // Remove DOM element when resetting
  if (globalState.styleSheet) {
    globalState.styleSheet.remove();
    globalState.styleSheet = null;
  }
}

/**
 * Generates CSS from a CSS object and returns a class name.
 * @param obj The CSS object.
 * @param options Options for CSS generation.
 * @returns The generated class name.
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  const { scoped, name, global } = options;
  
  // Generate hash for inline memoization
  const baseHash = stringify(obj);
  const hashKey = `inline:${baseHash}:${scoped || ''}:${name || ''}:${!!global}`;
  
  if (inlineCache.has(hashKey)) {
    return inlineCache.get(hashKey)!;
  }

  let className = '';
  let selector = '';

  if (!global) {
    className = name || nextClassName();
    selector = `.${className}`;
    if (scoped) selector = `.${scoped} ${selector}`;
  }

  // Check if rule already exists
  const key = stringify({ obj, selector, global });
  
  if (cache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    inlineCache.set(hashKey, cache.get(key)!);
    return cache.get(key)!;
  }

  // Initialize CSS system on first use
  initCSS();

  // Generate CSS
  const cssText = global ? process(obj, '', true) : process(obj, selector, false);
  
  // Store rule and increment reference
  setCSSRule(key, cssText);
  refCounts.set(key, 1);

  const result = global ? '' : className;
  cache.set(key, result);
  inlineCache.set(hashKey, result);

  return result;
}

/**
 * Removes CSS rules associated with a given CSS object and options.
 * @param obj The CSS object.
 * @param options Options for CSS removal.
 */
css.remove = function(obj: CSSObject, options: CSSOptions = {}) {
  let className = options.name;
  
  if (!options.global && !className) {
    // Try to find className in inline cache
    const baseHash = stringify(obj);
    const hashKey = `inline:${baseHash}:${options.scoped || ''}::${!!options.global}`;
    className = inlineCache.get(hashKey);
  }

  if (!className && !options.global) return;

  let selector = '';
  if (!options.global) {
    selector = `.${className}`;
    if (options.scoped) selector = `.${options.scoped} ${selector}`;
  }

  const key = stringify({ obj, selector, global: !!options.global });
  
  const currentRefs = refCounts.get(key) || 0;
  if (currentRefs <= 1) {
    // Last reference - remove rule
    deleteCSSRule(key);
    refCounts.delete(key);
    cache.delete(key);
  } else {
    // Decrement reference count
    refCounts.set(key, currentRefs - 1);
  }
};

/**
 * Resets all CSS caches and rules.
 */
export function cssReset() {
  batchUpdates(() => {
    cache.clear();
    inlineCache.clear();
    refCounts.clear();
    resetCSS();
  });
}