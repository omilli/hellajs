import { isPlainObject, isString } from "./internal/core";
import { registerText } from "./internal/injection";
import { scopedRule } from "./internal/identity";
import type { StyleObject, StyleOptions } from "./types";

/**
 * @internal
 * Resolution shared by `style()` and `removeStyle()`: the full class list, the
 * emitted rule text (the registration identity), and the resolved host.
 */
export interface ResolvedStyle {
  /** Class list for a `class` attribute — the derived (possibly labeled) class. */
  classList: string;
  /** Emitted rule text — the injectedMap identity. */
  text: string;
  /** Host the rules belong to, if any. */
  host?: ParentNode;
}

/**
 * Deep-merges two style objects: plain-object values merge recursively,
 * everything else — arrays included — replaces the base value. Returns a new
 * object; inputs stay untouched.
 */
function mergeStyles(base: StyleObject, override: StyleObject): StyleObject {
  const merged: Record<string, unknown> = { ...base };
  const keys = Object.keys(override);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    const value = (override as Record<string, unknown>)[key];
    const existing = merged[key];
    merged[key] =
      isPlainObject(value) && isPlainObject(existing)
        ? mergeStyles(existing as StyleObject, value as StyleObject)
        : value;
  }
  return merged as StyleObject;
}

/**
 * @internal
 * Normalizes the shared style()/removeStyle() overloads and derives their
 * deterministic identity — no registration, no DOM. A string base is a
 * positional label (it wins over a bag `label`); an array base deep-merges
 * its style objects left to right into one class; a lone object hashes
 * directly. The class is derived from the object alone (never the emitted
 * text), so the same arguments always resolve identically — which is what
 * lets removeStyle() locate what style() registered.
 * @param fn Caller name for error messages
 * @param base Style object, an array of style objects, or a label for the generated class
 * @param objOrOptions Style object under a positional label, otherwise the options bag
 * @param optionsArg Options under a positional label
 * @returns The resolved class list, rule text, and host
 * @throws {Error} When base is neither a string, a plain object, nor a non-empty array of plain objects, when a label-form style object is not a plain object, or when the options bag `label` is not a string.
 */
export function resolveStyle(
  fn: string,
  base: string | StyleObject | readonly StyleObject[],
  objOrOptions?: StyleObject | StyleOptions,
  optionsArg?: StyleOptions,
): ResolvedStyle {
  let obj: StyleObject;
  let options: StyleOptions;

  if (isString(base)) {
    if (!isPlainObject(objOrOptions)) {
      throw new Error(`[css] ${fn}: expected a CSS object, received ${String(objOrOptions)}`);
    }
    obj = objOrOptions;
    options = { ...optionsArg, label: base };
  } else if (Array.isArray(base)) {
    if (base.length === 0) {
      throw new Error(`[css] ${fn}: expected at least one style object`);
    }
    let i = 0;
    const len = base.length;
    while (i < len) {
      const element = base[i++];
      if (!isPlainObject(element)) {
        throw new Error(`[css] ${fn}: expected a CSS object, received ${String(element)}`);
      }
    }
    obj = base.reduce(mergeStyles);
    options = (objOrOptions as StyleOptions | undefined) ?? {};
  } else {
    if (!isPlainObject(base)) {
      throw new Error(`[css] ${fn}: expected a CSS object, received ${String(base)}`);
    }
    obj = base;
    options = (objOrOptions as StyleOptions | undefined) ?? {};
  }

  if (options.label !== undefined && !isString(options.label)) {
    throw new Error(`[css] ${fn}: label must be a string, received ${String(options.label)}`);
  }

  const { cls, cssText: text } = scopedRule(obj, options);
  return {
    classList: cls,
    text,
    host: options.host,
  };
}

/**
 * Creates a scoped style from a declarations-first object and returns a
 * content-hashed class name — the same string on client and server. Nested
 * selectors (`&` pseudo-states, descendants, at-rules) compose under the
 * generated class. On the client the rules are injected into the CSSOM; on
 * the server the registration is state-only (collect it with
 * [`cssText`](/reference/css/csstext)).
 * @param obj Style object to scope under the generated class
 * @param options Optional configuration. `label` embeds a readable segment in the class name; `layer` wraps the emitted rules in a named `@layer` (layered rules lose to unlayered author CSS); `host` creates the `<style>` element in a shadow root or other parent node instead of `document.head`.
 * @returns The class name (`{label}-{hash}` / a bare letter-only `{hash}`) for `class` attributes.
 * @throws {Error} When obj is not a plain object, when `label` is not a string, or when a property value is a function — use `vars()` for reactive values.
 */
export function style(obj: StyleObject, options?: StyleOptions): string;
/**
 * Creates a scoped style under a positional label — the string wins over a
 * bag `label`. Same derivation and options as the options-bag form.
 * @param label Readable segment embedded in the class name (`{label}-{hash}`); sanitized exactly like the bag `label`
 * @param obj Style object to scope under the generated class
 * @param options Optional configuration. `layer` wraps the emitted rules in a named `@layer` (layered rules lose to unlayered author CSS); `host` creates the `<style>` element in a shadow root or other parent node instead of `document.head`. A bag `label` loses to the positional one.
 * @returns The class name (`{label}-{hash}` / a bare letter-only `{hash}` when the label sanitizes to nothing) for `class` attributes.
 * @throws {Error} When obj is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function style(label: string, obj: StyleObject, options?: StyleOptions): string;
/**
 * Merges style objects: an array of one or more objects deep-merges left to
 * right into a single class (later entries win, nested plain objects merge
 * recursively, arrays and scalars replace). Class strings are not accepted;
 * compose existing classes with `cx`.
 * @param objs Style objects merged left to right into one class
 * @param options Optional configuration. `label` embeds a readable segment in the class name; `layer` wraps the emitted rules in a named `@layer` (layered rules lose to unlayered author CSS); `host` creates the `<style>` element in a shadow root or other parent node instead of `document.head`.
 * @returns The class name (`{label}-{hash}` / a bare letter-only `{hash}`) for `class` attributes.
 * @throws {Error} When the array is empty, when an element is not a plain object, when `label` is not a string, or when a property value is a function — use `vars()` for reactive values.
 */
export function style(objs: readonly StyleObject[], options?: StyleOptions): string;
export function style(
  base: string | StyleObject | readonly StyleObject[],
  objOrOptions?: StyleObject | StyleOptions,
  optionsArg?: StyleOptions,
): string {
  const resolved = resolveStyle("style", base, objOrOptions, optionsArg);
  registerText(resolved.text, resolved.host);
  return resolved.classList;
}
