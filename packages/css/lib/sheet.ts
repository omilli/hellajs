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

    // Delete and re-insert at same position
    try { s.deleteRule(existing); } catch { /* ignore */ }
    s.insertRule(cssText, existing);
    return;
  }

  // Append new rule
  const index = s.cssRules.length;
  s.insertRule(cssText, index);
  indexMap.set(key, index);
}

/**
 * Remove a rule by key and adjust all subsequent indices.
 */
export function removeRule(id: string, key: string): void {
  const idx = indexMap.get(key);
  if (idx === undefined) return;

  const s = getSheet(id);
  try { s.deleteRule(idx); } catch { /* ignore */ }

  indexMap.delete(key);

  // Shift all indices above the deleted one
  for (const [k, v] of indexMap) {
    if (v > idx) indexMap.set(k, v - 1);
  }
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

/**
 * Get the style element textContent for assertions.
 * Reconstructs from CSSOM since textContent may not reflect CSSOM writes.
 */
export function getSheetText(id: string): string {
  const el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el || !el.sheet) return '';

  const s = el.sheet;
  let text = '';
  let i = 0;
  const l = s.cssRules.length;
  while (i < l) {
    text += s.cssRules[i++].cssText;
  }
  return text;
}
