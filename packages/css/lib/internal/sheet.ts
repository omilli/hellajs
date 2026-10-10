/**
 * Manages <style> elements for CSSOM-based surgical rule updates.
 * Each id (e.g. "hella-css", "hella-vars") gets its own sheet; a per-call
 * `host` (e.g. a ShadowRoot) redirects that sheet into the host instead of
 * `document.head`.
 */

import { hasDocument } from "./core";
import { splitTopLevelRules } from "./shared";

const indexMap = new Map<string, number>();
const sheets = new Map<string, CSSStyleSheet>();

/**
 * Style elements already adopted from SSR delivery. Adoption runs once per
 * element: delivered rules are claimed into the registration state (or, when
 * the delivery cannot be trusted, drained) so hydration never duplicates what
 * the server shipped.
 */
const adoptedElements = new WeakSet<HTMLStyleElement>();

/**
 * Claimed rule texts per adopted sheet: raw rule text → the sheet index the
 * delivered text placed it at. upsertRule's miss path consults the map before
 * inserting, consumes the hit, and adopts the delivered rule in place — no
 * duplicate, no churn. Entries rebase with the sheet's indexes; unconsumed
 * entries die with the sheet (WeakMap).
 */
const adoptedClaims = new WeakMap<CSSStyleSheet, Map<string, number>>();

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
 * Parse-probe sheet for adoption: replays delivered segments where writing
 * the live sheet would duplicate rules. Constructable stylesheets where the
 * platform has them; otherwise a style element in an inert document (never
 * rendered). Undefined when neither is available — adoption then drains.
 */
function createProbeSheet(): CSSStyleSheet | undefined {
  try {
    return new CSSStyleSheet();
  } catch {
    try {
      const doc = document.implementation.createHTMLDocument("");
      const el = doc.createElement("style");
      doc.body.appendChild(el);
      return el.sheet as CSSStyleSheet;
    } catch {
      return undefined;
    }
  }
}

/**
 * Adopts a pre-existing (SSR-emitted) style element's rules, once per element.
 * The delivered text splits on blank lines into registrations, each through
 * the same quote-aware top-level splitter registration uses, so a matching
 * client registration byte-equals its segment — both sides come from the same
 * deterministic composer, no CSSOM round-trip. Each segment then replays into
 * a parse-probe sheet: a segment the platform rejected when it parsed the
 * delivered text (a vendor-prefixed selector, a dropped statement) rejects
 * here too, so accepted segments align one-to-one with the sheet's rules no
 * matter what the platform dropped. When the accepted count equals the parsed
 * rule count, every accepted segment is seeded as a claim at its probe index
 * and nothing is deleted: a miss-path upsert adopts its delivered rule in
 * place instead of inserting a duplicate (no flash window). Otherwise the
 * text cannot be aligned with the sheet (a quoted blank line mis-splits a
 * rule into pieces that both reject; no probe sheet is available) and the
 * drain runs: bottom-up deleteRule of braced rules, statements stay — the
 * client never re-emits them (a leading cascade layer-order statement is
 * exactly what keeps `hella` declared after the linked stylesheet's layers
 * once hydration re-inserts its `@layer` blocks; draining it re-declares
 * `hella` first and hands the cascade back to preflight). Bottom-up
 * deleteRule; a rule the platform rejects (exotic types, e.g. @layer in
 * happy-dom) stays rather than aborting the drain — client registrations
 * still repopulate around it.
 */
function adoptElementRules(el: HTMLStyleElement): void {
  if (adoptedElements.has(el)) return;
  adoptedElements.add(el);
  const s = el.sheet as CSSStyleSheet | null;
  if (!s) return;
  const chunks = (el.textContent ?? "").split("\n\n");
  const segments: string[] = [];
  let ci = 0;
  while (ci < chunks.length) {
    const rules = splitTopLevelRules(chunks[ci++]!);
    let ri = 0;
    while (ri < rules.length) segments.push(rules[ri++]!);
  }
  const probe = createProbeSheet();
  const claims = new Map<string, number>();
  let accepted = 0;
  let i = 0;
  const len = segments.length;
  while (probe && i < len) {
    try {
      probe.insertRule(segments[i]!, accepted);
      claims.set(segments[i]!, accepted);
      accepted++;
    } catch {
      // Platform-rejected segment: the live parse dropped it too — seed no
      // claim and shift no index for it.
    }
    i++;
  }
  if (probe && accepted === s.cssRules.length) {
    adoptedClaims.set(s, claims);
    return;
  }
  i = s.cssRules.length;
  while (i--) {
    if (!ruleIsBraced(s, i)) continue;
    try {
      s.deleteRule(i);
    } catch {
      // Undeleteable rule — skip; repopulation does not depend on it.
    }
  }
}

/**
 * Returns or creates the CSSStyleSheet for the given style element id.
 * With a host, skips the id lookup entirely (id collisions across hosts are
 * fine — the created <style> carries no id) and creates one <style> per id
 * inside the host, cached weakly by host. On the default path, creation
 * enforces the canonical document order (`hella-css` before `hella-vars`,
 * regardless of first-write order) so the cascade matches cssText()'s
 * css-side-then-vars emission. A pre-existing element (SSR hydration) is
 * adopted once: delivered rules are claimed (upserts adopt them in place —
 * no duplicates), or drained when the delivery cannot be trusted to the
 * claim split.
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
  if (el) {
    adoptElementRules(el);
  } else {
    el = document.createElement("style");
    el.id = id;
    // hella-css slots before an existing hella-vars so cross-sheet cascade
    // order is first-write-independent and matches cssText()'s emission;
    // a null anchor (css registered first, or this is hella-vars) appends.
    const anchor = id === "hella-css" ? document.getElementById("hella-vars") : null;
    document.head.insertBefore(el, anchor ?? null);
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
 * Unconsumed adoption claims rebase with them (a later upsert claims the
 * rule's post-shift index). Scoped by the qualified sheet key: indexMap
 * spans both sheet ids and all hosts.
 */
function rebaseIndexes(s: CSSStyleSheet, qid: string, removedIndex: number): void {
  const prefix = `${qid}:`;
  indexMap.forEach((v, k) => {
    if (v > removedIndex && k.startsWith(prefix)) indexMap.set(k, v - 1);
  });
  const claims = adoptedClaims.get(s);
  if (claims) {
    claims.forEach((v, k) => {
      if (v > removedIndex) claims.set(k, v - 1);
    });
  }
}

/**
 * Increments every indexMap entry of the given sheet at or above
 * `insertedIndex` — a mid-sheet insertRule shifts all later rules up one,
 * so their stored indexes must follow or the next deleteRule/upsert hits
 * the wrong rule. The mirror of rebaseIndexes' post-deleteRule decrement;
 * unconsumed adoption claims rebase with them. Scoped by the qualified
 * sheet key: indexMap spans both sheet ids and all hosts.
 */
function shiftIndexesUp(s: CSSStyleSheet, qid: string, insertedIndex: number): void {
  const prefix = `${qid}:`;
  indexMap.forEach((v, k) => {
    if (v >= insertedIndex && k.startsWith(prefix)) indexMap.set(k, v + 1);
  });
  const claims = adoptedClaims.get(s);
  if (claims) {
    claims.forEach((v, k) => {
      if (v >= insertedIndex) claims.set(k, v + 1);
    });
  }
}

/**
 * Whether the rule at `index` is braced (a real rule) versus a block-less
 * statement (`@import`, `@charset`, a layer-order `@layer a, b;`). cssText
 * access throws on a rule the platform has invalidated; such a rule counts
 * as braced — the placement-safe side for inserts and the drained side for
 * adoption.
 */
function ruleIsBraced(s: CSSStyleSheet, index: number): boolean {
  try {
    return s.cssRules[index]!.cssText.includes("{");
  } catch {
    return true;
  }
}

/**
 * Insert position for a rule: block-less statements (@import, @charset)
 * land ahead of the first braced rule — the CSSOM rejects a statement placed
 * after any real rule (check-for-import-rule) — so they take the first braced
 * rule's index, or append when the sheet holds only statements. Braced rules
 * always append.
 */
function resolveInsertIndex(s: CSSStyleSheet, cssText: string): number {
  if (cssText.includes("{")) return s.cssRules.length;
  const len = s.cssRules.length;
  let i = 0;
  while (i < len) {
    if (ruleIsBraced(s, i)) return i;
    i++;
  }
  return len;
}

/**
 * @internal
 * Insert or replace a single rule by key.
 * Uses the index map to avoid unnecessary DOM operations. Block-less statement
 * segments insert ahead of the first braced rule (CSSOM statements must
 * precede all rules); a mid-sheet insert shifts later rules up, and their
 * stored indexes rebase to match.
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
      if (shifted) rebaseIndexes(s, qid, existing);
      console.warn(`[css] rule rejected by the platform and skipped: ${cssText}`);
    }
    return;
  }

  const claims = adoptedClaims.get(s);
  const claimed = claims?.get(cssText);
  if (claimed !== undefined) {
    // Claimed delivery: adopt the sheet's rule in place — no insert, no
    // churn. Consumed so a later removal re-registration inserts fresh.
    claims!.delete(cssText);
    indexMap.set(ruleKey, claimed);
    return;
  }

  const index = resolveInsertIndex(s, cssText);
  try {
    // A mid-sheet insert (statement placed before braced rules) shifts every
    // later rule up one — stored indexes must follow. Computed before the
    // insert: appending shifts nothing.
    const shifts = index < s.cssRules.length;
    s.insertRule(cssText, index);
    if (shifts) shiftIndexesUp(s, qid, index);
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
    rebaseIndexes(s, qid, existing);
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
  // Adopted claims need no cleanup: they are keyed by the sheet object this
  // deletion drops, so the WeakMap entry garbage-collects with it.
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
