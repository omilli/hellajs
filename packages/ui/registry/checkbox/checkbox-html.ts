import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const icon: string;
declare const indicator: string;
// @hella:end

interface CheckboxProps extends HTMLAttributes<"button"> {
  class?: string;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the checkbox controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  /** Indeterminate (mixed) state. A boolean seeds the internal signal; an accessor makes it controlled. Wins over `checked` for rendering. */
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): HellaNode =>
  html`<svg
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
    class="${
      // @hella:compose
      [icon]
      // @hella:end
    }"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>` as HellaNode;

export default function Checkbox({ checked: checkedProp, indeterminate: indeterminateProp, onCheckedChange, id, disabled, "on:click": userClick, class: cls, ...attrs }: CheckboxProps): HellaNode {
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

  return html`
    <button
      type="button"
      role="checkbox"
      data-slot="checkbox"
      id="${id}"
      aria-checked="${ariaChecked}"
      data-state="${state}"
      disabled="${disabled ? true : undefined}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); toggle(); }}"
      ...${attrs}
    >
      <span
        data-slot="checkbox-indicator"
        class="${
          // @hella:compose
          [indicator]
          // @hella:end
        }"
      >
        ${() => (state() === "unchecked" ? null : checkIcon())}
      </span>
    </button>
  ` as HellaNode;
}
