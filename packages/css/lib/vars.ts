import { varsRules, createStyleManager, batchUpdates, hash, globalState } from './shared';

/**
 * Cache for CSS variables.
 */
const cache = new Map<string, { flattened: Record<string, any>, result: Record<string, string> }>();

/**
 * Flattens a nested object into a single-level object with dot-separated keys.
 * @param obj The object to flatten.
 * @param prefix The prefix for the keys.
 * @param result The object to store the flattened key-value pairs.
 * @returns The flattened object.
 */
function flattenVars(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenVars(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Gets or creates the style element for CSS variables in the document head.
 * @returns The HTMLStyleElement for CSS variables.
 */
function getVarsElement(): HTMLStyleElement {
  if (!globalState.varsSheet) {
    globalState.varsSheet = document.createElement('style');
    globalState.varsSheet.setAttribute('hella-vars', '');
    document.head.appendChild(globalState.varsSheet);
  }
  return globalState.varsSheet;
}

/**
 * Manages CSS variable rules and their application to the DOM.
 */
const varsManager = createStyleManager({
  signal: varsRules,
  contentGenerator: (rules) => {
    if (rules.size === 0) return '';
    const varLines = Array.from(rules.entries()).map(([k, v]) => `--${k.replace(/\./g, '-')}: ${v};`);
    return `:root{${varLines.join('')}}`;
  },
  domUpdater: (content) => {
    const sheet = getVarsElement();
    if (sheet.textContent !== content) {
      sheet.textContent = content;
    }
  },
  cachePrefix: 'vars'
});

/**
 * Initializes the CSS variables system.
 */
function initVars() {
  varsManager.init();
}

/**
 * Sets the CSS variable rules.
 * @param vars The map of CSS variable rules.
 */
function setVarsRules(vars: Map<string, string>) {
  varsRules(new Map(vars));
}

/**
 * Resets all CSS variable rules and removes the style element from the DOM.
 */
function resetVars() {
  varsRules(new Map());
  // Remove DOM element when resetting
  if (globalState.varsSheet) {
    globalState.varsSheet.remove();
    globalState.varsSheet = null;
  }
}

/**
 * Flushes pending CSS variable updates to the DOM.
 */
function flushVars() {
  varsManager.flush();
}

/**
 * Generates CSS variables from an object and returns an object with CSS variable references.
 * @param vars The object containing CSS variables.
 * @returns An object with CSS variable references.
 */
export function cssVars(vars: Record<string, any>): Record<string, string> {
  const inputHash = hash(JSON.stringify(vars));

  // Check cache first
  const cached = cache.get(inputHash);
  if (cached) {
    // Update CSS variables in DOM
    initVars();
    setVarsRules(new Map(Object.entries(cached.flattened).map(([k, v]) => [k, String(v)])));
    return cached.result;
  }

  // Flatten variables
  const flat = flattenVars(vars);
  
  // Initialize and update DOM
  initVars();
  setVarsRules(new Map(Object.entries(flat).map(([k, v]) => [k, String(v)])));

  // Create result object with var() references  
  const result: Record<string, string> = {};
  for (const k in flat) {
    const resultKey = k.replace(/\./g, '-');
    result[resultKey] = `var(--${resultKey})`;
  }

  // Cache result
  if (cache.size >= 100) cache.clear();
  cache.set(inputHash, { flattened: flat, result });

  return result;
}

/**
 * Resets all CSS variable caches and rules.
 */
export function cssVarsReset() {
  batchUpdates(() => {
    resetVars();
  });
  
  flushVars();
  cache.clear();
}