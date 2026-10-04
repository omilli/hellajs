import { deregisterText } from "./internal/injection";
import { resolveStyle } from "./style";
import type { StyleObject, StyleOptions } from "./types";

/**
 * Removes a style created by `style()` and decrements its reference count for
 * memory management.
 *
 * Re-derives the class and rule text from the same arguments — the
 * deterministic transform `style()` uses — so identical arguments always
 * locate the injected entry. Registration state is decremented on both
 * platforms; the CSSOM rules drop at zero references (a no-op without a DOM).
 * @param obj Style object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in style())
 * @throws {Error} When obj is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function removeStyle(obj: StyleObject, options?: StyleOptions): void;
/**
 * Removes a labeled style created by the matching `style()` label overload —
 * `removeStyle("card", obj)` locates what `style("card", obj)` registered.
 * @param label Label used when creating the style
 * @param obj Style object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in style(); a bag `label` loses to the positional one)
 * @throws {Error} When obj is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function removeStyle(label: string, obj: StyleObject, options?: StyleOptions): void;
/**
 * Removes a composed style created by the matching `style()` overload — the
 * same base/override pair re-derives the same registration.
 * @param base Style object used in the style() call
 * @param override Style object used in the style() call
 * @param options Optional configuration object (must match the options used in style())
 * @throws {Error} When a style argument is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function removeStyle(base: StyleObject, override: StyleObject, options?: StyleOptions): void;
export function removeStyle(base: string | StyleObject, overrideOrOptions?: StyleObject | StyleOptions, optionsArg?: StyleOptions): void {
  const resolved = resolveStyle("removeStyle", base, overrideOrOptions, optionsArg);
  deregisterText(resolved.text, resolved.host);
}
