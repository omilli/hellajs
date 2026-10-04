import { isObject, isPlainObject, isString } from "./internal/core";
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
    merged[key] = isPlainObject(value) && isPlainObject(existing)
      ? mergeStyles(existing as StyleObject, value as StyleObject)
      : value;
  }
  return merged as StyleObject;
}

/**
 * A second plain-object argument is an options bag only when every own key is
 * `label` (string), `layer` (string), or `host` (object) — mirroring the
 * overload types, where a value shaped like `{ label: 'x' }` is assignable to
 * StyleOptions but not to a StyleObject override, and `{ label: { … } }` (a
 * nested `label` element selector) only to the override. The bag reading
 * holds only for the two-argument form: a third argument marks the second as
 * the override per the compose overload.
 */
function isOptionBag(value: StyleObject | StyleOptions): value is StyleOptions {
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    const v = record[key];
    if (key === "label") {
      if (v !== undefined && !isString(v)) return false;
    } else if (key === "host") {
      if (v !== undefined && !isObject(v)) return false;
    } else if (key === "layer") {
      if (v !== undefined && !isString(v)) return false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * @internal
 * Normalizes the shared style()/removeStyle() overloads and derives their
 * deterministic identity — no registration, no DOM. A string base is a
 * positional label (it wins over a bag `label`); an object base deep-merges
 * with the override into one class; a lone object hashes directly. The class
 * is derived from the object alone (never the emitted text), so the same
 * arguments always resolve identically — which is what lets removeStyle()
 * locate what style() registered.
 * @param fn Caller name for error messages
 * @param base Style object, or a label for the generated class
 * @param overrideOrOptions Override object or options bag
 * @param optionsArg Options when an override occupies the second argument
 * @returns The resolved class list, rule text, and host
 * @throws {Error} When base is neither a string nor a plain object, or an override argument is not a plain object.
 */
export function resolveStyle(
  fn: string,
  base: string | StyleObject,
  overrideOrOptions?: StyleObject | StyleOptions,
  optionsArg?: StyleOptions,
): ResolvedStyle {
  let obj: StyleObject;
  let options: StyleOptions;

  if (isString(base)) {
    if (!isPlainObject(overrideOrOptions)) {
      throw new Error(`[css] ${fn}: expected a CSS object, received ${String(overrideOrOptions)}`);
    }
    obj = overrideOrOptions;
    options = { ...optionsArg, label: base };
  } else {
    if (!isPlainObject(base)) {
      throw new Error(`[css] ${fn}: expected a CSS object, received ${String(base)}`);
    }
    if (
      overrideOrOptions === undefined ||
      (optionsArg === undefined && isOptionBag(overrideOrOptions))
    ) {
      options = (overrideOrOptions as StyleOptions | undefined) ?? optionsArg ?? {};
      obj = base;
    } else {
      obj = mergeStyles(base, overrideOrOptions as StyleObject);
      options = optionsArg ?? {};
    }
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
 * @throws {Error} When obj is not a plain object, or when a property value is a function — use `vars()` for reactive values.
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
 * Composes styles: an object base deep-merges with the override into a
 * single class (override wins, nested objects merge, arrays replace).
 * @param base Style object to compose onto
 * @param override Style object contributing the new declarations
 * @param options Optional configuration. `label` embeds a readable segment in the class name; `layer` wraps the emitted rules in a named `@layer` (layered rules lose to unlayered author CSS); `host` creates the `<style>` element in a shadow root or other parent node instead of `document.head`.
 * @returns The composed class for `class` attributes.
 * @throws {Error} When a style argument is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function style(base: StyleObject, override: StyleObject, options?: StyleOptions): string;
export function style(base: string | StyleObject, overrideOrOptions?: StyleObject | StyleOptions, optionsArg?: StyleOptions): string {
  const resolved = resolveStyle("style", base, overrideOrOptions, optionsArg);
  registerText(resolved.text, resolved.host);
  return resolved.classList;
}
