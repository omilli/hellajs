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
import { cn } from "./cn.js";

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
      cn("absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary")
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
        cn("aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40", cls)
      }
      {...attrs}
    >
      <Indicator
        value={value}
        checked={checked}
        class={
          cn("relative flex items-center justify-center")
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
        cn("grid gap-3", cls)
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
              cn("flex items-center gap-2")
            }
          >
            <Item
              value={entry.value}
              name={name as string | undefined}
              disabled={entry.disabled}
              class={
                cn("aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40")
              }
            >
              <Indicator
                value={entry.value}
                class={
                  cn("relative flex items-center justify-center")
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
