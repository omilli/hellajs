import { signal } from "@hellajs/core";

// @hella:styles
declare const base: string;
declare const thumb: string;
// @hella:end

interface SwitchProps {
  /** Checked state. A boolean seeds the internal signal; an accessor makes the switch controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
}

export default function Switch(props: SwitchProps): JSX.Element {
  const checkedAccessor = typeof props.checked === "function" ? props.checked : undefined;
  const internal = signal(typeof props.checked === "boolean" ? props.checked : false);
  const checked = (): boolean => (checkedAccessor ? checkedAccessor() : internal());

  const toggle = (): void => {
    if (props.disabled) return;
    const next = !checked();
    if (!checkedAccessor) internal(next);
    props.onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      data-slot="switch"
      data-size="default"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      disabled={props.disabled ? true : undefined}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
      on:click={() => toggle()}
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
