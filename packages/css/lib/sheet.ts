/**
 * Manages a <style> element for CSS variables via CSSOM.
 * Each scope (e.g. ":root", ".theme") maps to one sheet rule for surgical updates.
 */

const indexMap = new Map<string, number>();
let sheet: CSSStyleSheet | null = null;

/**
 * Gets or creates the CSSStyleSheet for the given style element ID.
 */
function getSheet(id: string): CSSStyleSheet {
  if (sheet) return sheet;

  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  sheet = el.sheet as CSSStyleSheet;
  return sheet;
}

/**
 * Insert or replace a single rule by key.
 * Uses the index map to avoid unnecessary DOM operations.
 */
export function upsertRule(id: string, key: string, cssText: string): void {
  const s = getSheet(id);
  const existing = indexMap.get(key);

  if (existing !== undefined) {
    try {
      if (s.cssRules[existing]?.cssText === cssText) return;
    } catch { /* rule invalidated */ }

    try { s.deleteRule(existing); } catch { /* ignore */ }
    s.insertRule(cssText, existing);
    return;
  }

  const index = s.cssRules.length;
  s.insertRule(cssText, index);
  indexMap.set(key, index);
}

/**
 * Clear all rules and reset state.
 */
export function resetSheet(id: string): void {
  const el = document.getElementById(id) as HTMLStyleElement | null;
  if (el) el.textContent = '';

  sheet = null;
  indexMap.clear();
}
