import { ForEach } from "@hellajs/dom";
import { toggleGroup } from "@hellajs/headless";
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
        // @hella:compose
        [toggleVariants({ variant, size }), item, cls]
        // @hella:end
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
        // @hella:compose
        [base, cls]
        // @hella:end
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
              // @hella:compose
              [toggleVariants({ variant, size }), item]
              // @hella:end
            }
          >
            {entry.label}
          </Item>
        )}
      />
    </Root>
  );
}
