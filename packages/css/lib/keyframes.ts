import { isPlainObject } from "./internal/core";
import { registerText } from "./internal/injection";
import { hash, stringify } from "./internal/shared";
import { process } from "./css";
import type { KeyframesObject } from "./types";

/**
 * Recursively key-sorts a plain object — the object-form counterpart of
 * `stringify`'s sorted stringification. Keyframes steps and declarations are
 * order-insensitive, so the canonical form makes the emitted rule text a
 * function of content alone, keeping it in bijection with the hashed name
 * (structurally equal objects register one rule under one name, any key
 * order). Arrays and non-plain values pass through untouched.
 */
function canonicalSteps<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    const value = obj[key];
    out[key] = isPlainObject(value) ? canonicalSteps(value as Record<string, unknown>) : value;
  }
  return out as T;
}

/**
 * @internal
 * Derives the deterministic keyframes identity: the hashed name and the
 * emitted rule text (the registration identity). The hash covers the object
 * only, and the text derives from the same canonical form, so the same step
 * definitions always derive the same pair — which is what lets
 * `removeKeyframes()` locate what `keyframes()` registered.
 * @param obj Keyframes object: step keys mapped to declaration objects
 * @returns The hashed animation name and its emitted `@keyframes` rule text
 */
export function keyframesRule(obj: KeyframesObject): { name: string; cssText: string } {
  const steps = canonicalSteps(obj);
  const name = `h-kf-${hash(stringify(steps))}`;
  return { name, cssText: `@keyframes ${name}{${process(steps, "", true)}}` };
}

/**
 * Creates a `@keyframes` rule from a step-keyed object and returns its
 * content-hashed animation name — the same string on client and server.
 * Step keys (`from`, `to`, `50%`) map to declaration objects; the hashed
 * name makes hand-named keyframes collision-free by construction. Registers
 * the rule text on both platforms (collect it with
 * [`cssText`](/reference/css/csstext) on the server); a repeat call with a
 * structurally equal object returns the same name and bumps the reference
 * count. Reference-counted removal via
 * [`removeKeyframes`](/reference/css/removekeyframes).
 * @param obj Keyframes object: step keys (`from`, `to`, percentage stops) mapped to declaration objects
 * @returns The animation name (`h-kf-{hash}`) for `animation` / `animation-name` values.
 * @throws {Error} When obj is not a plain object, or when a property value is a function — use `vars()` for reactive values.
 */
export function keyframes(obj: KeyframesObject): string {
  if (!isPlainObject(obj)) throw new Error(`[css] keyframes: expected a CSS object, received ${String(obj)}`);

  const { name, cssText: text } = keyframesRule(obj);
  registerText(text);
  return name;
}
