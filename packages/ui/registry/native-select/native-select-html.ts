import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const icon: string;
declare const invalid: string;
declare const optgroup: string;
declare const option: string;
declare const wrapper: string;
// @hella:end

interface NativeSelectProps extends HTMLAttributes<"select"> {
  class?: string;
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
}

export default function NativeSelect({ value, size, children, class: cls, ...attrs }: NativeSelectProps): HellaNode {
  return html`
    <div
      data-slot="native-select-wrapper"
      class="${
        // @hella:compose
        [wrapper]
        // @hella:end
      }"
    >
      <select
        data-slot="native-select"
        data-size="${size ?? "default"}"
        value="${value}"
        hook:afterMount="${(node: Element) => {
          // Props apply before children mount: a value set on an optionless select
          // is lost, so re-apply the current value once the options exist.
          const v = (typeof value === "function" ? value() : value) ?? "";
          (node as HTMLSelectElement).value = v;
        }}"
        class="${
          // @hella:compose
          [
            base,
            focus,
            invalid,
            cls,
          ]
          // @hella:end
        }"
        ...${attrs}
      >
        ${() => children}
      </select>
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
        data-slot="native-select-icon"
        class="${
          // @hella:compose
          [icon]
          // @hella:end
        }"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  ` as HellaNode;
}

interface NativeSelectOptionProps extends HTMLAttributes<"option"> {
  class?: string;
  children?: HellaChildren;
}

interface NativeSelectOptGroupProps extends HTMLAttributes<"optgroup"> {
  class?: string;
  children?: HellaChildren;
}

export function NativeSelectOption({ children, class: cls, ...attrs }: NativeSelectOptionProps): HellaNode {
  return html`
    <option
      data-slot="native-select-option"
      class="${
        // @hella:compose
        [option, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</option>
  ` as HellaNode;
}

export function NativeSelectOptGroup({ children, class: cls, ...attrs }: NativeSelectOptGroupProps): HellaNode {
  return html`
    <optgroup
      data-slot="native-select-optgroup"
      class="${
        // @hella:compose
        [optgroup, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</optgroup>
  ` as HellaNode;
}
