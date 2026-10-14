import { signal } from "@hellajs/core";
import { ForEach, rovingTabIndex } from "@hellajs/dom";
import type { ToggleGroupProps, ToggleGroupItemProps } from "./toggle-group-types.js";

// @hella:styles
declare const base: string;
declare const item: string;
declare const sizes: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

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
        // @hella:compose
        [toggleVariants({ variant, size }), item, cls]
        // @hella:end
      }
      on:click={function (e) { userClick?.call(this, e); onSelect?.(); }}
      {...attrs}
    >
      {children}
    </button>
  );
}

export function ToggleGroup({ items, keyBy, type, value, values, onValueChange, variant = "default", size = "default", class: cls, ...attrs }: ToggleGroupProps): JSX.Element {
  // One-shot seed read: a getter items is called once here, an array reads directly.
  const pressedValues = (typeof items === "function" ? items() : items).filter((entry) => entry.pressed).map((entry) => entry.value);
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
        // @hella:compose
        [base, cls]
        // @hella:end
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
      <ForEach
        each={items}
        use={(entry) => (
          <ToggleGroupItem
            key={keyBy ? entry.value : undefined}
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
        )}
      />
    </div>
  );
}
