/**
 * Manages <style> elements for CSSOM-based surgical rule updates.
 * Each id (e.g. "hella-css", "hella-vars") gets its own sheet.
 */

import { hasDocument } from "./internal/core";

const indexMap = new Map<string, number>();
const sheets = new Map<string, CSSStyleSheet>();

function getSheet(id: string): CSSStyleSheet | undefined {
  if (!hasDocument()) return undefined;
  let s = sheets.get(id);
  if (s) return s;

  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  s = el.sheet as CSSStyleSheet;
  sheets.set(id, s);
  return s;
}

function mapKey(id: string, key: string): string {
  return `${id}:${key}`;
}

/**
 * Insert or replace a single rule by key.
 * Uses the index map to avoid unnecessary DOM operations.
 */
export function upsertRule(id: string, key: string, cssText: string): void {
  const s = getSheet(id);
  if (!s) return;
  const mk = mapKey(id, key);
  const existing = indexMap.get(mk);

  if (existing !== undefined) {
    try {
      if (s.cssRules[existing]?.cssText === cssText) return;
    } catch {
      // cssRules access throws when the underlying rule has been invalidated by the browser; rebuild below.
    }

    try { s.deleteRule(existing); } catch {
      // Index already invalidated; the insertRule below will repopulate it.
    }
    try { s.insertRule(cssText, existing); } catch {
      // Some CSS rule types may not be parseable by the platform (e.g. @layer in happy-dom);
      // the textContent mirror still carries them.
    }
    return;
  }

  const index = s.cssRules.length;
  try { s.insertRule(cssText, index); } catch {
    // Some CSS rule types may not be parseable by the platform; skip.
  }
  indexMap.set(mk, index);
}

/**
 * Remove a single rule by key.
 */
export function removeRule(id: string, key: string): void {
  const s = getSheet(id);
  if (!s) return;
  const mk = mapKey(id, key);
  const existing = indexMap.get(mk);
  if (existing === undefined) return;

  try { s.deleteRule(existing); } catch {
    // Index already invalidated; the remove caller already handles cleanup.
  }
  indexMap.delete(mk);
}

/**
 * Clear all rules and reset state for the given id.
 */
export function resetSheet(id: string): void {
  if (hasDocument()) {
    const el = document.getElementById(id) as HTMLStyleElement | null;
    if (el) {
      el.textContent = '';
      const s = el.sheet;
      if (s) {
        let i = s.cssRules.length;
        while (i--) s.deleteRule(i);
      }
    }
  }

  sheets.delete(id);
  const prefix = `${id}:`;
  for (const k of indexMap.keys()) {
    if (k.startsWith(prefix)) indexMap.delete(k);
  }
}
