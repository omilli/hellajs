import { signal } from "@hellajs/core";
import type { HTMLAttributes } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SwitchProps extends HTMLAttributes<"button"> {
  class?: string;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the switch controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

export default function Switch({ checked: checkedProp, onCheckedChange, disabled, "on:click": userClick, class: cls, ...attrs }: SwitchProps): JSX.Element {
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
        cn("peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80", cls)
      }
      on:click={function (e) { userClick?.call(this, e); toggle(); }}
      {...attrs}
    >
      <span
        data-slot="switch-thumb"
        data-state={checked() ? "checked" : "unchecked"}
        class={
          cn("pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground")
        }
      />
    </button>
  );
}
