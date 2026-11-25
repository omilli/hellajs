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
 * @throws {Error} When obj is not a plain object, when `label` is not a string, or when a property value is a function — use `vars()` for reactive values.
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
 * Removes a merged style created by the matching `style()` array overload —
 * the same objects in the same order re-derive the same registration.
 * @param objs Style objects used in the style() call, in the same order
 * @param options Optional configuration object (must match the options used in style())
 * @throws {Error} When the array is empty, when an element is not a plain object, when `label` is not a string, or when a property value is a function — use `vars()` for reactive values.
 */
export function removeStyle(objs: readonly StyleObject[], options?: StyleOptions): void;
export function removeStyle(
  base: string | StyleObject | readonly StyleObject[],
  objOrOptions?: StyleObject | StyleOptions,
  optionsArg?: StyleOptions,
): void {
  const resolved = resolveStyle("removeStyle", base, objOrOptions, optionsArg);
  deregisterText(resolved.text, resolved.host);
}
