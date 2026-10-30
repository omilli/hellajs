import { ForEach } from "@hellajs/dom";
import { toggleGroup } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface ToggleGroupEntry {
  value: string;
  label?: HellaChildren;
  /** Seeds the item pressed in uncontrolled mode (single keeps the first pressed; multiple keeps all). */
  pressed?: boolean;
  disabled?: boolean;
}

interface ToggleGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered items. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items: ToggleGroupEntry[] | (() => ToggleGroupEntry[]);
  /** Reuses item DOM through reorders by `value` identity (pressed state survives); order always follows the array. */
  keyBy?: "value";
  type: "single" | "multiple";
  /** Controlled single selection. */
  value?: () => string;
  /** Controlled multiple selection. */
  values?: () => string[];
  /** Single reports the newly active value ("" when deselected); multiple reports the full active array. */
  onValueChange?: (value: string | string[]) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

interface ToggleGroupItemProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  value?: string;
  /** Pressed state. A boolean reads statically; an accessor keeps the manual part reactive. */
  pressed?: boolean | (() => boolean);
  onSelect?: () => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("toggle-group", {
  alignItems: "center",
  borderRadius: tokens.radius,
  boxSizing: "border-box",
  display: "flex",
  gap: "0",
  width: "fit-content",
});

const variants = {
  default: style("toggle-group-default", {
    backgroundColor: "transparent",
  }),
  outline: style("toggle-group-outline", {
    background: "transparent",
    border: `1px solid ${tokens.input}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
  }),
};

const sizes = {
  default: style("toggle-group-size-default", {
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }),
  sm: style("toggle-group-size-sm", {
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }),
  lg: style("toggle-group-size-lg", {
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }),
};

const item = style("toggle-group-item", {
  minWidth: "0",
  paddingInline: "0.75rem",
  width: "auto",
  "&:focus": {
    zIndex: "10",
  },
  "&:focus-visible": {
    zIndex: "10",
  },
  "&:first-child": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&:last-child": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&[data-variant='outline']": {
    borderLeftWidth: "0",
  },
  "&[data-variant='outline']:first-child": {
    borderLeftWidth: "1px",
  },
  borderRadius: "0",
  boxShadow: "none",
  flexShrink: "0",
});

/** The toggle variant maps, duplicated from the toggle entry (self-contained entries never cross-import). */
const toggleVariants = (options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}): string =>
  [base, variants[options?.variant ?? "default"], sizes[options?.size ?? "default"]]
    .filter(Boolean)
    .join(" ");

export function ToggleGroupItem({
  value,
  pressed,
  onSelect,
  variant = "default",
  size = "default",
  disabled,
  children,
  class: cls,
  ...attrs
}: ToggleGroupItemProps): JSX.Element {
  const { Item } = toggleGroup();
  return (
    <Item
      value={value}
      pressed={pressed}
      onSelect={onSelect}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      class={
        [toggleVariants({ variant, size }), item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function ToggleGroup({
  items,
  keyBy,
  type,
  value,
  values,
  onValueChange,
  variant = "default",
  size = "default",
  class: cls,
  ...attrs
}: ToggleGroupProps): JSX.Element {
  // One-shot seed read: a getter items is called once here, an array reads directly.
  const pressedValues = (typeof items === "function" ? items() : items)
    .filter((entry) => entry.pressed)
    .map((entry) => entry.value);
  const { Root, Item } = toggleGroup({
    multiple: type === "multiple",
    value,
    values,
    defaultValue: pressedValues[0] ?? "",
    defaultValues: pressedValues,
    onValueChange,
  });

  return (
    <Root
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      style="--gap: 0"
      class={
        [base, cls]
      }
      {...attrs}
    >
      <ForEach
        each={items}
        use={(entry) => (
          <Item
            key={keyBy ? entry.value : undefined}
            value={entry.value}
            disabled={entry.disabled}
            data-variant={variant}
            data-size={size}
            data-spacing="0"
            class={
              [toggleVariants({ variant, size }), item]
            }
          >
            {entry.label}
          </Item>
        )}
      />
    </Root>
  );
}
