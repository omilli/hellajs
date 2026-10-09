import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const item: string;
declare const sizes: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

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

export function ToggleGroupItem({ value, pressed, onSelect, variant = "default", size = "default", disabled, "on:click": userClick, children, class: cls, ...attrs }: ToggleGroupItemProps): HellaNode {
  const isPressed = (): boolean =>
    typeof pressed === "function" ? pressed() : pressed ?? false;

  return html`
    <button
      type="button"
      data-slot="toggle-group-item"
      value="${value}"
      data-variant="${variant}"
      data-size="${size}"
      data-spacing="0"
      aria-pressed="${() => (isPressed() ? "true" : "false")}"
      data-state="${() => (isPressed() ? "on" : "off")}"
      disabled="${disabled ? true : undefined}"
      class="${
        // @hella:compose
        [toggleVariants({ variant, size }), item, cls]
        // @hella:end
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onSelect?.(); }}"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

export default function ToggleGroup({ items, type, value, values, onValueChange, variant = "default", size = "default", class: cls, ...attrs }: ToggleGroupProps): HellaNode {
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

  return html`
    <div
      role="group"
      data-slot="toggle-group"
      data-variant="${variant}"
      data-size="${size}"
      data-spacing="0"
      style="--gap: 0"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
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
      ...${attrs}
    >
      ${items.map((entry) => ToggleGroupItem({
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
