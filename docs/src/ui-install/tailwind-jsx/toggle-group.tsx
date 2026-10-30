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
import { cn } from "./cn.js";

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

/** The toggle variant maps, duplicated from the toggle entry (self-contained entries never cross-import). */
const toggleVariants = (options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}): string =>
  ["group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs", variants[options?.variant ?? "default"], sizes[options?.size ?? "default"]]
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
        cn(toggleVariants({ variant, size }), "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l", cls)
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
        cn("group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs", cls)
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
              cn(toggleVariants({ variant, size }), "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l")
            }
          >
            {entry.label}
          </Item>
        )}
      />
    </Root>
  );
}
