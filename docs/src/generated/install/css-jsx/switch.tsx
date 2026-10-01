import { signal } from "@hellajs/core";

import { style } from "@hellajs/css";

const base = style({
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-state='checked']": {
    backgroundColor: "var(--primary)",
  },
  "&[data-state='unchecked']": {
    backgroundColor: "var(--input)",
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: "color-mix(in oklab, var(--input) 80%, transparent)",
  },
}, { label: "hella-switch", layer: "hella" });

const thumb = style({
  backgroundColor: "var(--background)",
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
    backgroundColor: "var(--primary-foreground)",
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: "var(--foreground)",
  },
}, { label: "hella-switch-thumb", layer: "hella" });

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
        [base, props.class]
      }
      on:click={toggle}
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
