import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const wrapper = style("native-select-wrapper", {
  position: "relative",
  width: "fit-content",
  "&:has(select:disabled)": {
    opacity: "0.5",
  },
});

const base = style("native-select", {
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
});

const focus = style("native-select-focus", {
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
});

const invalid = style("native-select-invalid", {
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
});

const icon = style("native-select-icon", {
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
});

const option = style("native-select-option", {
  backgroundColor: "Canvas",
  color: "CanvasText",
});

const optgroup = style("native-select-optgroup", {
  backgroundColor: "Canvas",
  color: "CanvasText",
});

interface NativeSelectProps extends HTMLAttributes<"select"> {
  class?: string;
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
}

export default function NativeSelect({ value, size, children, class: cls, ...attrs }: NativeSelectProps): JSX.Element {
  return (
    <div
      data-slot="native-select-wrapper"
      class={
        [wrapper]
      }
    >
      <select
        data-slot="native-select"
        data-size={size ?? "default"}
        value={value}
        hook:afterMount={(node) => {
          // Props apply before children mount: a value set on an optionless select
          // is lost, so re-apply the current value once the options exist.
          const select = node as HTMLSelectElement;
          select.value = (typeof value === "function" ? value() : value) ?? "";
        }}
        class={
          [
            base,
            focus,
            invalid,
            cls,
          ]
        }
        {...attrs}
      >
        {children}
      </select>      <svg
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
        class={
          [icon]
        }
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

interface NativeSelectOptionProps extends HTMLAttributes<"option"> {
  class?: string;
  children?: HellaChildren;
}

interface NativeSelectOptGroupProps extends HTMLAttributes<"optgroup"> {
  class?: string;
  children?: HellaChildren;
}

export function NativeSelectOption({ children, class: cls, ...attrs }: NativeSelectOptionProps): JSX.Element {
  return (
    <option
      data-slot="native-select-option"
      class={
        [option, cls]
      }
      {...attrs}
    >
      {children}
    </option>
  );
}

export function NativeSelectOptGroup({ children, class: cls, ...attrs }: NativeSelectOptGroupProps): JSX.Element {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      class={
        [optgroup, cls]
      }
      {...attrs}
    >
      {children}
    </optgroup>
  );
}
