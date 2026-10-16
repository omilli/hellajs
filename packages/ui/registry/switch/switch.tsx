import { signal } from "@hellajs/core";
import type { SwitchProps } from "./switch-types.js";

// @hella:styles
declare const base: string;
declare const thumb: string;
// @hella:end

export function Switch({
  checked: checkedProp,
  onCheckedChange,
  disabled,
  "on:click": userClick,
  class: cls,
  ...attrs
}: SwitchProps): JSX.Element {
  const checkedAccessor = typeof checkedProp === "function" ? checkedProp : undefined;
  const internal = signal(typeof checkedProp === "boolean" ? checkedProp : false);
  const checked = (): boolean => (checkedAccessor ? checkedAccessor() : internal());

  const toggle = (): void => {
    if (disabled) return;
    const next = !checked();
    if (!checkedAccessor) internal(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      data-slot="switch"
      data-size="default"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      disabled={disabled ? true : undefined}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        toggle();
      }}
      {...attrs}
    >
      <span
        data-slot="switch-thumb"
        data-state={checked() ? "checked" : "unchecked"}
        class={
          // @hella:compose
          [thumb]
          // @hella:end
        }
      />
    </button>
  );
}
