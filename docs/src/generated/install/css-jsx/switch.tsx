import { signal } from "@hellajs/core";
import type { HTMLAttributes } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("switch", {
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "inline-flex",
  flexShrink: "0",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-size='default']": {
    height: "1.15rem",
    width: "2rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-state='checked']": {
    backgroundColor: tokens.primary,
  },
  "&[data-state='unchecked']": {
    backgroundColor: tokens.input,
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 80%, transparent)`,
  },
});

const thumb = style("switch-thumb", {
  backgroundColor: tokens.background,
  borderRadius: "9999px",
  display: "block",
  height: "1rem",
  pointerEvents: "none",
  transition: "translate 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&[data-state='checked']": {
    translate: "calc(100% - 2px)",
  },
  "&[data-state='unchecked']": {
    translate: "0",
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: tokens.primaryForeground,
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: tokens.foreground,
  },
});

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
        [base, cls]
      }
      on:click={function (e) { userClick?.call(this, e); toggle(); }}
      {...attrs}
    >
      <span
        data-slot="switch-thumb"
        data-state={checked() ? "checked" : "unchecked"}
        class={
          [thumb]
        }
      />
    </button>
  );
}
