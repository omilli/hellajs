import { isBoolean, isFunction, signal } from "@hellajs/core";

/**
 * One controlled-or-internal boolean channel — the press family's state
 * seam: an accessor prop reads through (controlled), anything else seeds the
 * internal signal (uncontrolled). `write` lands only when uncontrolled;
 * controlled channels report through the factory's `on*Change` instead.
 * @internal
 */
export interface PressChannel {
  /** Resolves the live pressed/checked value. */
  read: () => boolean;
  /** Lands the next value when uncontrolled; a no-op when controlled. */
  write: (next: boolean) => void;
}

/**
 * Builds a boolean channel over the templates' resolution pattern —
 * `isFunction(prop) ? prop() : internal()` with an `isBoolean` seed.
 * @internal
 * @param prop The controlled accessor or uncontrolled seed; `undefined` seeds `seed`.
 * @param seed The uncontrolled seed when `prop` is not given. Default `false`.
 * @returns The read/write channel over the resolved mode.
 */
export function pressChannel(
  prop: boolean | (() => boolean) | undefined,
  seed = false,
): PressChannel {
  const accessor = isFunction(prop) ? prop : undefined;
  const internal = signal(accessor ? seed : isBoolean(prop) ? prop : seed);
  return {
    read: () => (accessor ? accessor() : internal()),
    write: (next: boolean) => {
      if (!accessor) internal(next);
    },
  };
}

/**
 * The templates' tri-state resolution: the mixed flag wins over the boolean
 * for both `data-state` and `aria-checked`.
 * @internal
 * @param checked The resolved checked boolean.
 * @param indeterminate The resolved mixed flag.
 * @returns The `data-state` value.
 */
export function checkStateOf(
  checked: boolean,
  indeterminate: boolean,
): "checked" | "unchecked" | "indeterminate" {
  return indeterminate ? "indeterminate" : checked ? "checked" : "unchecked";
}

/**
 * The tri-state's `aria-checked` value: `"mixed"` while the mixed flag holds.
 * @internal
 * @param checked The resolved checked boolean.
 * @param indeterminate The resolved mixed flag.
 * @returns The `aria-checked` token.
 */
export function checkAriaOf(checked: boolean, indeterminate: boolean): "true" | "false" | "mixed" {
  return indeterminate ? "mixed" : checked ? "true" : "false";
}

/**
 * Single-value exclusion — activating the active value deselects it (`""`),
 * any other value replaces the selection (the toggle-group single mode).
 * @internal
 * @param current The active value, `""` when none.
 * @param value The activated item's value.
 * @returns The next single-mode selection.
 */
export function excludeSingle(current: string, value: string): string {
  return current === value ? "" : value;
}

/**
 * Multiple-value toggle — membership flip preserving insertion order (the
 * toggle-group multiple mode).
 * @internal
 * @param current The active values in activation order.
 * @param value The activated item's value.
 * @returns The next membership array.
 */
export function flipMulti(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
}
