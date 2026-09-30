import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const icon: string;
declare const invalid: string;
declare const optgroup: string;
declare const option: string;
declare const wrapper: string;
// @hella:end

interface NativeSelectProps {
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  onchange?: (v: string) => void;
}

export default function NativeSelect(props: NativeSelectProps): HellaNode {
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
        data-size="${props.size ?? "default"}"
        id="${props.id}"
        aria-label="${props.ariaLabel}"
        aria-invalid="${props.ariaInvalid ? "true" : undefined}"
        value="${props.value}"
        hook:afterMount="${(node: Element) => {
          // Props apply before children mount: a value set on an optionless select
          // is lost, so re-apply the current value once the options exist.
          const v = (typeof props.value === "function" ? props.value() : props.value) ?? "";
          (node as HTMLSelectElement).value = v;
        }}"
        class="${
          // @hella:compose
          [
            base,
            focus,
            invalid,
            props.class,
          ]
          // @hella:end
        }"
        e:change="${(e: Event) => props.onchange?.((e.target as HTMLSelectElement).value)}"
      >
        ${() => props.children}
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

interface NativeSelectOptionProps {
  children?: HellaChildren;
  class?: string;
}

export function NativeSelectOption(props: NativeSelectOptionProps): HellaNode {
  return html`
    <option
      data-slot="native-select-option"
      class="${
        // @hella:compose
        [option, props.class]
        // @hella:end
      }"
    >${() => props.children}</option>
  ` as HellaNode;
}

export function NativeSelectOptGroup(props: NativeSelectOptionProps): HellaNode {
  return html`
    <optgroup
      data-slot="native-select-optgroup"
      class="${
        // @hella:compose
        [optgroup, props.class]
        // @hella:end
      }"
    >${() => props.children}</optgroup>
  ` as HellaNode;
}
