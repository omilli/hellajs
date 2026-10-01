import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

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
        cn("group/native-select relative w-fit has-[select:disabled]:opacity-50")
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
          cn(
            "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
            props.class,
          )
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
          cn("pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none")
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
        cn("bg-[Canvas] text-[CanvasText]", props.class)
      }"
    >${() => props.children}</option>
  ` as HellaNode;
}

export function NativeSelectOptGroup(props: NativeSelectOptionProps): HellaNode {
  return html`
    <optgroup
      data-slot="native-select-optgroup"
      class="${
        cn("bg-[Canvas] text-[CanvasText]", props.class)
      }"
    >${() => props.children}</optgroup>
  ` as HellaNode;
}
