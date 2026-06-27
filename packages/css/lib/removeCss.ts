import { hasDocument, isPlainObject } from "./internal/core";
import { removeRule } from "./internal/sheet";
import { STYLE_ID, refCounts, inlineCache, cssRulesMap, ruleCounts, hashKey, syncTextContent } from "./internal/cssStore";
import type { CSSObject, CSSOptions } from "./types";

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 * @param obj CSS object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in css())
 */
export function cssRemove(obj: CSSObject, options: CSSOptions = {}): void {
  if (!isPlainObject(obj)) throw new Error(`[css] cssRemove: expected a CSS object, received ${String(obj)}`);

  const key = hashKey(obj, options);

  if (!refCounts.has(key)) return;

  const currentCount = refCounts.get(key)!;
  if (currentCount > 1) {
    refCounts.set(key, currentCount - 1);
  } else {
    refCounts.delete(key);
    inlineCache.delete(key);
    const count = ruleCounts.get(key);
    if (hasDocument() && count !== undefined) {
      let i = 0;
      while (i < count) removeRule(STYLE_ID, `${key}:${i++}`);
    }
    ruleCounts.delete(key);
    cssRulesMap.delete(key);
    syncTextContent();
  }
}
