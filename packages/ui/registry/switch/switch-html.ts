import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const thumb: string;
// @hella:end

interface SwitchProps extends HTMLAttributes<"button"> {
  class?: string;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the switch controlled — clicks then only report through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

export default function Switch({ checked: checkedProp, onCheckedChange, disabled, "on:click": userClick, class: cls, ...attrs }: SwitchProps): HellaNode {
  const checkedAccessor = typeof checkedProp === "function" ? checkedProp : undefined;
  const internal = signal(typeof checkedProp === "boolean" ? checkedProp : false);
  const checked = (): boolean => (checkedAccessor ? checkedAccessor() : internal());

  const toggle = (): void => {
    if (disabled) return;
    const next = !checked();
    if (!checkedAccessor) internal(next);
    onCheckedChange?.(next);
  };

  return html`
    <button
      type="button"
      role="switch"
      data-slot="switch"
      data-size="default"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
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
        data-slot="switch-thumb"
        data-state="${() => (checked() ? "checked" : "unchecked")}"
        class="${
          // @hella:compose
          [thumb]
          // @hella:end
        }"
      />
    </button>
  ` as HellaNode;
}
