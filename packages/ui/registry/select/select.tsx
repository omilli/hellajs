import { signal } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { select } from "@hellajs/headless";
import type {
  SelectEntry,
  SelectTriggerProps,
  SelectValueProps,
  SelectContentProps,
  SelectPartProps,
  SelectItemProps,
  SelectLabelProps,
  SelectScrollButtonProps,
  SelectProps,
} from "./select-types.js";

// @hella:styles
declare const base: string;
declare const chevron: string;
declare const content: string;
declare const icon: string;
declare const item: string;
declare const label: string;
declare const scrollButton: string;
declare const separator: string;
// @hella:end

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): JSX.Element => (
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
      // @hella:compose
      [chevron]
      // @hella:end
    }
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** The chevron-up icon (refs/icons/chevron-up.svg), created per call so reactive swaps never share nodes between clones. */
const chevronUpIcon = (): JSX.Element => (
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
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

/** The clear icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const clearIcon = (): JSX.Element => (
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
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/** The manual trigger button; the composed Select renders the same shape wired to state and aria. */
export function SelectTrigger({
  id,
  size,
  state,
  onOpen,
  clearable,
  onClear,
  hasValue,
  disabled,
  children,
  class: cls,
  ...attrs
}: SelectTriggerProps): JSX.Element {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  return (
    <button
      type="button"
      data-slot="select-trigger"
      id={id}
      data-size={size ?? "default"}
      data-state={stateOf()}
      aria-haspopup="listbox"
      aria-expanded={stateOf() === "open" ? "true" : "false"}
      disabled={disabled}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      on:click={() => {
        if (disabled) return;
        onOpen?.();
      }}
      on:keydown={(e) => {
        const key = (e as KeyboardEvent).key;
        if (disabled || (key !== "ArrowDown" && key !== "ArrowUp")) return;
        e.preventDefault();
        onOpen?.();
      }}
      {...attrs}
    >
      {children}
      {() =>
        clearable && hasValue?.() ? (
          <span
            data-slot="select-clear"
            role="button"
            aria-label="Clear"
            on:click={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
          >
            {clearIcon()}
          </span>
        ) : null
      }
      {chevronDownIcon()}
    </button>
  );
}

/** Renders the chosen label; shows the placeholder (with `data-placeholder`) while empty. */
export function SelectValue({
  placeholder,
  value,
  class: cls,
  ...attrs
}: SelectValueProps): JSX.Element {
  const { Value } = select();
  const current = (): HellaChildren | undefined =>
    typeof value === "function" ? (value as () => HellaChildren | undefined)() : value;
  return (
    <Value
      placeholder={placeholder}
      value={current}
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

/** The manual content layer; the composed Select portals the same wiring under its trigger's state. */
export function SelectContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  sideOffset,
  anchor,
  onDismiss,
  onExited,
  onClose,
  children,
  class: cls,
  ...attrs
}: SelectContentProps): JSX.Element {
  const { Content } = select({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) {
        onDismiss?.();
        onClose?.();
      }
    },
  });
  return (
    <Content
      id={id}
      side={sideProp}
      align={alignProp}
      sideOffset={sideOffset}
      anchor={anchor}
      onExited={onExited}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function SelectGroup({ children, class: cls, ...attrs }: SelectPartProps): JSX.Element {
  const { Group } = select();
  return (
    <Group
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function SelectItem({
  value,
  label: labelSlot,
  selected: selectedProp,
  onselect,
  disabled,
  children,
  class: cls,
  ...attrs
}: SelectItemProps): JSX.Element {
  const { Item } = select();
  return (
    <Item
      value={value}
      label={labelSlot}
      selected={selectedProp}
      onselect={onselect}
      disabled={disabled}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function SelectLabel({ children, class: cls, ...attrs }: SelectLabelProps): JSX.Element {
  const { Label } = select();
  return (
    <Label
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

export function SelectSeparator({ class: cls, ...attrs }: SelectPartProps): JSX.Element {
  const { Separator } = select();
  return (
    <Separator
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function SelectScrollUpButton({
  children,
  class: cls,
  ...attrs
}: SelectScrollButtonProps): JSX.Element {
  const { ScrollUpButton } = select();
  return (
    <ScrollUpButton
      class={
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => children ?? chevronUpIcon()}
    </ScrollUpButton>
  );
}

export function SelectScrollDownButton({
  children,
  class: cls,
  ...attrs
}: SelectScrollButtonProps): JSX.Element {
  const { ScrollDownButton } = select();
  return (
    <ScrollDownButton
      class={
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => children ?? chevronDownIcon()}
    </ScrollDownButton>
  );
}

export function Select({
  items,
  keyBy,
  value,
  onValueChange,
  placeholder,
  size,
  clearable,
  class: cls,
  ...attrs
}: SelectProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const S = select({
    value,
    onValueChange: (next) => {
      if (value === undefined) internal(next);
      onValueChange?.(next);
    },
  });
  const resolveItems = (): SelectEntry[] =>
    typeof items === "function" ? (items as () => SelectEntry[])() : (items ?? []);
  const currentLabel = (): HellaChildren | undefined =>
    resolveItems().find((entry) => entry.value === current())?.label;
  return (
    <S.Trigger
      size={size}
      clearable={clearable}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <SelectValue placeholder={placeholder} value={currentLabel} />
      <S.Content>
        <ForEach
          each={resolveItems}
          use={(entry) => (
            <S.Item
              key={keyBy ? entry.value : undefined}
              value={entry.value}
              label={entry.label}
              disabled={entry.disabled}
            />
          )}
        />
      </S.Content>
    </S.Trigger>
  );
}
