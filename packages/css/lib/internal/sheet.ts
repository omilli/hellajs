/**
 * Manages <style> elements for CSSOM-based surgical rule updates.
 * Each id (e.g. "hella-css", "hella-vars") gets its own sheet; a per-call
 * `host` (e.g. a ShadowRoot) redirects that sheet into the host instead of
 * `document.head`.
 */

import { hasDocument } from "./core";

const indexMap = new Map<string, number>();
const sheets = new Map<string, CSSStyleSheet>();

/**
 * Stable serial per host node. Never reset: qualified registry keys derived
 * from it stay valid across resets, so a re-created hosted sheet reuses the
 * same key space instead of allocating new serials forever.
 */
const hostIds = new WeakMap<ParentNode, number>();
let hostCount = 0;

/**
 * @internal
 * Registry-key qualifier for a host: "" on the default document path (keys
 * stay byte-identical to the no-host form), `#n` per host node.
 */
export function hostQualifier(host?: ParentNode): string {
  if (!host) return "";
  let n = hostIds.get(host);
  if (n === undefined) {
    hostCount++;
    n = hostCount;
    hostIds.set(host, n);
  }
  return `#${n}`;
}

/**
 * Hosted sheets, one registry entry per id — a WeakMap keyed by host so a
 * discarded host drops its sheets. Each id keeps its own <style> per host
 * (mirroring the two-element document split) so css-rule and vars-rule
 * indexes never share a cssRules list. Reset drops the id's entry (WeakMap
 * cannot be enumerated); the abandoned <style> elements keep their rules.
 */
const hostSheets = new Map<string, WeakMap<ParentNode, CSSStyleSheet>>();

/**
 * Composite key qualifying a sheet id (and its indexMap entries) by host.
 */
function sheetKey(id: string, host?: ParentNode): string {
  return host ? `${id}${hostQualifier(host)}` : id;
}

/**
 * Returns or creates the CSSStyleSheet for the given style element id.
 * With a host, skips the id lookup entirely (id collisions across hosts are
 * fine — the created <style> carries no id) and creates one <style> per id
 * inside the host, cached weakly by host.
 */
function getSheet(id: string, host?: ParentNode): CSSStyleSheet | undefined {
  if (!hasDocument()) return undefined;

  if (host) {
    let hostSheetMap = hostSheets.get(id);
    if (!hostSheetMap) {
      hostSheetMap = new WeakMap();
      hostSheets.set(id, hostSheetMap);
    }
    let hs = hostSheetMap.get(host);
    if (!hs) {
      const el = document.createElement("style");
      host.appendChild(el);
      hs = el.sheet as CSSStyleSheet;
      hostSheetMap.set(host, hs);
    }
    return hs;
  }

  let s = sheets.get(id);
  if (s) return s;

  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  s = el.sheet as CSSStyleSheet;
  sheets.set(id, s);
  return s;
}

/**
 * Builds a composite key from the id and rule key.
 */
function mapKey(id: string, key: string): string {
  return `${id}:${key}`;
}

/**
 * Decrements every indexMap entry of the given sheet above `removedIndex` —
 * a successful deleteRule shifts all later rules down one, so their stored
 * indexes must follow or the next deleteRule/upsert hits the wrong rule.
 * Scoped by the qualified sheet key: indexMap spans both sheet ids and all hosts.
 */
function rebaseIndexes(qid: string, removedIndex: number): void {
  const prefix = `${qid}:`;
  indexMap.forEach((v, k) => {
    if (v > removedIndex && k.startsWith(prefix)) indexMap.set(k, v - 1);
  });
}

/**
 * @internal
 * Insert or replace a single rule by key.
 * Uses the index map to avoid unnecessary DOM operations.
 */
export function upsertRule(id: string, key: string, cssText: string, host?: ParentNode): void {
  const s = getSheet(id, host);
  if (!s) return;
  const qid = sheetKey(id, host);
  const ruleKey = mapKey(qid, key);
  const existing = indexMap.get(ruleKey);

  if (existing !== undefined) {
    try {
      if (s.cssRules[existing]?.cssText === cssText) return;
    } catch {
      // cssRules access throws when the underlying rule has been invalidated by the browser; rebuild below.
    }

    indexMap.delete(ruleKey);
    let shifted = false;
    try {
      s.deleteRule(existing);
      shifted = true;
    } catch {
      // Index already invalidated; the insertRule below will repopulate it.
    }
    try {
      s.insertRule(cssText, existing);
      indexMap.set(ruleKey, existing);
    } catch {
      // Some CSS rule types may not be parseable by the platform (e.g. @layer in happy-dom);
      // the rule is skipped entirely — indexMap stays clean, no fallback path carries it.
      // A successful deleteRule above shifted later rules down and the rejected insert never
      // refilled the hole — rebase so remaining stored indexes match the sheet again.
      if (shifted) rebaseIndexes(qid, existing);
      console.warn(`[css] rule rejected by the platform and skipped: ${cssText}`);
    }
    return;
  }

  const index = s.cssRules.length;
  try {
    s.insertRule(cssText, index);
    indexMap.set(ruleKey, index);
  } catch {
    // skip — rule not supported by runtime; indexMap stays clean
    console.warn(`[css] rule rejected by the platform and skipped: ${cssText}`);
  }
}

/**
 * @internal
 * Remove a single rule by key.
 */
export function removeRule(id: string, key: string, host?: ParentNode): void {
  const s = getSheet(id, host);
  if (!s) return;
  const qid = sheetKey(id, host);
  const ruleKey = mapKey(qid, key);
  const existing = indexMap.get(ruleKey);
  if (existing === undefined) return;

  try {
    s.deleteRule(existing);
    rebaseIndexes(qid, existing);
  } catch {
    // Index already invalidated; the remove caller already handles cleanup.
  }
  indexMap.delete(ruleKey);
}

/**
 * @internal
 * Clear all rules and reset state for the given id.
 */
export function resetSheet(id: string): void {
  if (hasDocument()) {
    const el = document.getElementById(id) as HTMLStyleElement | null;
    if (el) {
      el.textContent = "";
      const s = el.sheet;
      if (s) {
        let i = s.cssRules.length;
        while (i--) s.deleteRule(i);
      }
    }
  }

  sheets.delete(id);
  // Hosted sheets cannot be enumerated — abandon them (their <style> elements
  // keep their rules), drop the id's host registry (lazily re-created on the
  // next hosted call), and delete every qualified indexMap entry for this id.
  hostSheets.delete(id);
  const docPrefix = `${id}:`;
  const hostedPrefix = `${id}#`;
  const keys = Array.from(indexMap.keys());
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const k = keys[i++] as string;
    if (k.startsWith(docPrefix) || k.startsWith(hostedPrefix)) indexMap.delete(k);
  }
}
