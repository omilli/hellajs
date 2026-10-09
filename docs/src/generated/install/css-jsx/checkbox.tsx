import { signal } from "@hellajs/core";
import type { HTMLAttributes } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("checkbox", {
  boxSizing: "border-box",
  borderRadius: "4px",
  border: `1px solid ${tokens.input}`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "&[data-state='checked']": {
    backgroundColor: tokens.primary,
    borderColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: tokens.primary,
  },
});

const indicator = style("checkbox-indicator", {
  color: "currentColor",
  display: "grid",
  placeContent: "center",
  transition: "none",
});

const icon = style("checkbox-icon", {
  height: "0.875rem",
  width: "0.875rem",
});

interface CheckboxProps extends HTMLAttributes<"button"> {
  class?: string;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the checkbox controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  /** Indeterminate (mixed) state. A boolean seeds the internal signal; an accessor makes it controlled. Wins over `checked` for rendering. */
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={
      [icon]
    }
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function Checkbox({ checked: checkedProp, indeterminate: indeterminateProp, onCheckedChange, id, disabled, "on:click": userClick, class: cls, ...attrs }: CheckboxProps): JSX.Element {
  const checkedAccessor = typeof checkedProp === "function" ? checkedProp : undefined;
  const indeterminateAccessor = typeof indeterminateProp === "function" ? indeterminateProp : undefined;
  const internalChecked = signal(typeof checkedProp === "boolean" ? checkedProp : false);
  const internalIndeterminate = signal(typeof indeterminateProp === "boolean" ? indeterminateProp : false);

  const checked = (): boolean => (checkedAccessor ? checkedAccessor() : internalChecked());
  const indeterminate = (): boolean => (indeterminateAccessor ? indeterminateAccessor() : internalIndeterminate());
  const state = (): "checked" | "unchecked" | "indeterminate" =>
    indeterminate() ? "indeterminate" : checked() ? "checked" : "unchecked";
  const ariaChecked = (): "true" | "false" | "mixed" =>
    indeterminate() ? "mixed" : checked() ? "true" : "false";

  const toggle = (): void => {
    if (disabled) return;
    const next = !checked();
    if (!checkedAccessor) internalChecked(next);
    if (!indeterminateAccessor) internalIndeterminate(false);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="checkbox"
      data-slot="checkbox"
      id={id}
      aria-checked={ariaChecked()}
      data-state={state()}
      disabled={disabled ? true : undefined}
      class={
        [base, cls]
      }
      on:click={function (e) { userClick?.call(this, e); toggle(); }}
      {...attrs}
    >
      <span
        data-slot="checkbox-indicator"
        class={
          [indicator]
        }
      >
        {() => (state() === "unchecked" ? null : checkIcon())}
      </span>
    </button>
  );
}
