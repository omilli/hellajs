import { isPlainObject } from "./internal/core";
import { deregisterText } from "./internal/injection";
import { process } from "./css";
import type { CSSObject, CSSOptions } from "./types";

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 *
 * Re-derives the CSS text from `(obj, options)` — the same deterministic transform
 * `css()` uses — so the same arguments always locate the injected entry.
 * Registration state is decremented on both platforms; the CSSOM rules drop
 * at zero references (a no-op without a DOM).
 * @param obj CSS object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in css())
 * @throws {Error} When obj is not a plain object, when a property value is a function — use `vars()`
 * for reactive values, or when the object contains declarations with no selector in scope (top-level
 * or directly under a conditional at-rule) — the same rejections `css()` makes on the same object.
 */
export function removeCss(obj: CSSObject, options: CSSOptions = {}): void {
  if (!isPlainObject(obj)) throw new Error(`[css] removeCss: expected a CSS object, received ${String(obj)}`);

  const host = options.host;
  const cssText = process(obj, "", true);

  deregisterText(cssText, host);
}
