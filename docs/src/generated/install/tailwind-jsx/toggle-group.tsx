import { signal } from "@hellajs/core";
import { rovingTabIndex } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const base = "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs";

const variants = {
  default: "bg-transparent",
  outline:
    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
};

const sizes = {
  default: "h-9 min-w-9 px-2",
  sm: "h-8 min-w-8 px-1.5",
  lg: "h-10 min-w-10 px-2.5",
};

const item = "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l";

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

export function ToggleGroupItem(props: ToggleGroupItemProps): JSX.Element {
  const pressed = (): boolean =>
    typeof props.pressed === "function" ? props.pressed() : props.pressed ?? false;
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      value={props.value}
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      aria-pressed={pressed() ? "true" : "false"}
      data-state={pressed() ? "on" : "off"}
      disabled={props.disabled ? true : undefined}
      class={
        cn(toggleVariants({ variant, size }), item, props.class)
      }
      on:click={() => props.onSelect?.()}
    >
      {props.children}
    </button>
  );
}

export default function ToggleGroup(props: ToggleGroupProps): JSX.Element {
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

  return (
    <div
      role="group"
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing="0"
      style="--gap: 0"
      class={
        cn(base, props.class)
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
    >
      {props.items.map((entry) => (
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
