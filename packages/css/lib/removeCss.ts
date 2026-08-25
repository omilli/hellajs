import { hasDocument, isPlainObject } from "./internal/core";
import { removeRule } from "./internal/sheet";
import { STYLE_ID, injectedMap } from "./internal/injection";
import { process } from "./css";
import type { CSSObject, CSSOptions } from "./types";

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 *
 * Re-derives the CSS text from `(obj, options)` — the same deterministic transform
 * `css()` uses — so the same arguments always locate the injected entry. Client-only:
 * a no-op when no DOM is available.
 * @param obj CSS object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in css())
 * @throws {Error} When obj is not a plain object.
 */
export function removeCss(obj: CSSObject, options: CSSOptions = {}): void {
  if (!isPlainObject(obj)) throw new Error(`[css] removeCss: expected a CSS object, received ${String(obj)}`);

  if (!hasDocument()) return;

  const selector = options.name ? `.${options.name}` : "";
  const isGlobal = !options.name;
  const cssText = process(obj, selector, isGlobal);

  const entry = injectedMap.get(cssText);
  if (!entry) return;

  entry.count--;
  if (entry.count > 0) return;

  let i = 0;
  const ruleCount = entry.ruleCount;
  while (i < ruleCount) {
    removeRule(STYLE_ID, `${cssText}:${i}`);
    i++;
  }
  injectedMap.delete(cssText);
}
