import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const wrapper = style({
  position: "relative",
  width: "fit-content",
  "&:has(select:disabled)": {
    opacity: "0.5",
  },
}, { label: "native-select-wrapper" });

const base = style({
  appearance: "none",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  fontSize: "0.875rem",
  height: "2.25rem",
  lineHeight: "1.25rem",
  minWidth: "0",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingLeft: "0.75rem",
  paddingRight: "2.25rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&::selection": {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    pointerEvents: "none",
  },
  "&[data-size='sm']": {
    height: "2rem",
    paddingBlock: "0.25rem",
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):hover": {
    background: "color-mix(in oklab, var(--input) 50%, transparent)",
  },
}, { label: "native-select" });

const focus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "native-select-focus" });

const invalid = style({
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "native-select-invalid" });

const icon = style({
  color: "var(--muted-foreground)",
  height: "1rem",
  opacity: "0.5",
  pointerEvents: "none",
  position: "absolute",
  right: "0.875rem",
  top: "50%",
  transform: "translateY(-50%)",
  userSelect: "none",
  width: "1rem",
}, { label: "native-select-icon" });

const option = style({
  backgroundColor: "Canvas",
  color: "CanvasText",
}, { label: "native-select-option" });

const optgroup = style({
  backgroundColor: "Canvas",
  color: "CanvasText",
}, { label: "native-select-optgroup" });

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
        [wrapper]
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
          [
            base,
            focus,
            invalid,
            props.class,
          ]
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
          [icon]
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
        [option, props.class]
      }"
    >${() => props.children}</option>
  ` as HellaNode;
}

export function NativeSelectOptGroup(props: NativeSelectOptionProps): HellaNode {
  return html`
    <optgroup
      data-slot="native-select-optgroup"
      class="${
        [optgroup, props.class]
      }"
    >${() => props.children}</optgroup>
  ` as HellaNode;
}
