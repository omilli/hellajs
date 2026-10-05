import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("toggle-group", {
  alignItems: "center",
  borderRadius: "var(--radius)",
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
    border: "1px solid var(--input)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
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
    borderBottomLeftRadius: "calc(var(--radius) * 0.8)",
    borderTopLeftRadius: "calc(var(--radius) * 0.8)",
  },
  "&:last-child": {
    borderBottomRightRadius: "calc(var(--radius) * 0.8)",
    borderTopRightRadius: "calc(var(--radius) * 0.8)",
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

interface ToggleGroupProps {
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
  class?: string;
}

interface ToggleGroupItemProps {
  value?: string;
  /** Pressed state. A boolean reads statically; an accessor keeps the manual part reactive. */
  pressed?: boolean | (() => boolean);
  onSelect?: () => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

/** The toggle variant maps, duplicated from the toggle entry (self-contained entries never cross-import). */
const toggleVariants = (options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}): string => [base, variants[options?.variant ?? "default"], sizes[options?.size ?? "default"]].filter(Boolean).join(" ");

export function ToggleGroupItem(props: ToggleGroupItemProps): HellaNode {
  const pressed = (): boolean =>
    typeof props.pressed === "function" ? props.pressed() : props.pressed ?? false;
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";

  return html`
    <button
      type="button"
      data-slot="toggle-group-item"
      value="${props.value}"
      data-variant="${variant}"
      data-size="${size}"
      data-spacing="0"
      aria-pressed="${() => (pressed() ? "true" : "false")}"
      data-state="${() => (pressed() ? "on" : "off")}"
      disabled="${props.disabled ? true : undefined}"
      class="${
        [toggleVariants({ variant, size }), item, props.class]
      }"
      e:click="${() => props.onSelect?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export default function ToggleGroup(props: ToggleGroupProps): HellaNode {
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";
  const pressedValues = props.items.filter((entry) => entry.pressed).map((entry) => entry.value);
  const internalSingle = signal(pressedValues[0] ?? "");
  const internalMulti = signal<Set<string>>(new Set(pressedValues));
  const wirings: (() => void)[] = [];

  const isPressed = (value: string): boolean =>
    props.type === "multiple"
      ? (props.values !== undefined ? props.values() : [...internalMulti()]).includes(value)
      : (props.value !== undefined ? props.value() : internalSingle()) === value;

  const toggleItem = (value: string): void => {
    if (props.type === "multiple") {
      const current = props.values !== undefined ? props.values() : [...internalMulti()];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (props.values === undefined) internalMulti(new Set(next));
      props.onValueChange?.(next);
      return;
    }
    const current = props.value !== undefined ? props.value() : internalSingle();
    const next = current === value ? "" : value;
    if (props.value === undefined) internalSingle(next);
    props.onValueChange?.(next);
  };

  return html`
    <div
      role="group"
      data-slot="toggle-group"
      data-variant="${variant}"
      data-size="${size}"
      data-spacing="0"
      style="--gap: 0"
      class="${
        [base, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        wirings.push(rovingTabIndex(node, {
          selector: "[data-slot='toggle-group-item']:not(:disabled)",
        }));
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
      }}"
    >
      ${props.items.map((entry) => ToggleGroupItem({
        value: entry.value,
        pressed: () => isPressed(entry.value),
        onSelect: () => {
          if (entry.disabled) return;
          toggleItem(entry.value);
        },
        variant,
        size,
        disabled: entry.disabled,
        children: entry.label,
      }))}
    </div>
  ` as HellaNode;
}
