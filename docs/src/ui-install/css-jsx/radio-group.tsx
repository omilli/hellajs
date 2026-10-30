import { ForEach } from "@hellajs/dom";
import { radioGroup } from "@hellajs/headless";
import type { HTMLAttributes } from "@hellajs/dom";

interface RadioGroupItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered options. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items: RadioGroupItem[] | (() => RadioGroupItem[]);
  /** Reuses item DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

interface RadioGroupItemProps extends HTMLAttributes<"button"> {
  class?: string;
  value: string;
  /** Checked state. A boolean reads statically; an accessor keeps the manual part reactive. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
}

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("radio-group", {
  display: "grid",
  gap: "0.75rem",
});

const item = style("radio-group-item", {
  aspectRatio: "1 / 1",
  border: `1px solid ${tokens.input}`,
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  color: tokens.primary,
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
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
});

const indicator = style("radio-group-indicator", {
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
  position: "relative",
});

const icon = style("radio-group-icon", {
  fill: tokens.primary,
  height: "0.5rem",
  left: "50%",
  position: "absolute",
  top: "50%",
  translate: "-50% -50%",
  width: "0.5rem",
});

const row = style("radio-group-row", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
});

/** The circle icon (refs/icons/circle.svg), created per call so reactive swaps never share nodes between clones. */
const circleIcon = (): JSX.Element => (
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
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export function RadioGroupItem({
  value,
  checked,
  onSelect,
  disabled,
  name,
  class: cls,
  ...attrs
}: RadioGroupItemProps): JSX.Element {
  const { Item, Indicator } = radioGroup();
  return (
    <Item
      value={value}
      checked={checked}
      onSelect={onSelect}
      disabled={disabled}
      name={name}
      class={
        [item, cls]
      }
      {...attrs}
    >
      <Indicator
        value={value}
        checked={checked}
        class={
          [indicator]
        }
      >
        {circleIcon()}
      </Indicator>
    </Item>
  );
}

export function RadioGroup({
  items,
  keyBy,
  value,
  onValueChange,
  orientation,
  name,
  class: cls,
  ...attrs
}: RadioGroupProps): JSX.Element {
  const { Root, Item, Indicator } = radioGroup({
    value,
    onValueChange,
    orientation,
    name: name as string | undefined,
  });

  return (
    <Root
      class={
        [base, cls]
      }
      {...attrs}
    >
      <ForEach
        each={items}
        use={(entry) => (
          <label
            key={keyBy ? entry.value : undefined}
            data-slot="radio-group-row"
            class={
              [row]
            }
          >
            <Item
              value={entry.value}
              name={name as string | undefined}
              disabled={entry.disabled}
              class={
                [item]
              }
            >
              <Indicator
                value={entry.value}
                class={
                  [indicator]
                }
              >
                {circleIcon()}
              </Indicator>
            </Item>
            <span>{entry.label}</span>
          </label>
        )}
      />
    </Root>
  );
}
