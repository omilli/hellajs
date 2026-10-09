import { signal } from "@hellajs/core";
import { rovingTabIndex } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

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

interface ToggleGroupEntry {
  value: string;
  label?: HellaChildren;
  /** Seeds the item pressed in uncontrolled mode (single keeps the first pressed; multiple keeps all). */
  pressed?: boolean;
  disabled?: boolean;
}

interface ToggleGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  items: ToggleGroupEntry[];
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

/** The toggle variant maps, duplicated from the toggle entry (self-contained entries never cross-import). */
const toggleVariants = (options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}): string => [base, variants[options?.variant ?? "default"], sizes[options?.size ?? "default"]].filter(Boolean).join(" ");

export function ToggleGroupItem({ value, pressed, onSelect, variant = "default", size = "default", disabled, "on:click": userClick, children, class: cls, ...attrs }: ToggleGroupItemProps): JSX.Element {
  const isPressed = (): boolean =>
    typeof pressed === "function" ? pressed() : pressed ?? false;

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      value={value}
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      aria-pressed={isPressed() ? "true" : "false"}
      data-state={isPressed() ? "on" : "off"}
      disabled={disabled ? true : undefined}
      class={
        [toggleVariants({ variant, size }), item, cls]
      }
      on:click={function (e) { userClick?.call(this, e); onSelect?.(); }}
      {...attrs}
    >
      {children}
    </button>
  );
}

export default function ToggleGroup({ items, type, value, values, onValueChange, variant = "default", size = "default", class: cls, ...attrs }: ToggleGroupProps): JSX.Element {
  const pressedValues = items.filter((entry) => entry.pressed).map((entry) => entry.value);
  const internalSingle = signal(pressedValues[0] ?? "");
  const internalMulti = signal<Set<string>>(new Set(pressedValues));
  const wirings: (() => void)[] = [];

  const isPressed = (itemValue: string): boolean =>
    type === "multiple"
      ? (values !== undefined ? values() : [...internalMulti()]).includes(itemValue)
      : (value !== undefined ? value() : internalSingle()) === itemValue;

  const toggleItem = (itemValue: string): void => {
    if (type === "multiple") {
      const current = values !== undefined ? values() : [...internalMulti()];
      const next = current.includes(itemValue) ? current.filter((v) => v !== itemValue) : [...current, itemValue];
      if (values === undefined) internalMulti(new Set(next));
      onValueChange?.(next);
      return;
    }
    const current = value !== undefined ? value() : internalSingle();
    const next = current === itemValue ? "" : itemValue;
    if (value === undefined) internalSingle(next);
    onValueChange?.(next);
  };

  return (
    <div
      role="group"
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      style="--gap: 0"
      class={
        [base, cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        wirings.push(rovingTabIndex(node, {
          selector: "[data-slot='toggle-group-item']:not(:disabled)",
        }));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
      {...attrs}
    >
      {items.map((entry) => (
        <ToggleGroupItem
          value={entry.value}
          pressed={() => isPressed(entry.value)}
          onSelect={() => {
            if (entry.disabled) return;
            toggleItem(entry.value);
          }}
          variant={variant}
          size={size}
          disabled={entry.disabled}
        >
          {entry.label}
        </ToggleGroupItem>
      ))}
    </div>
  );
}
