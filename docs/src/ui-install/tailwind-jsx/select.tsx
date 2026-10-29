import { signal } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import type { HellaChildren, HTMLAttributes } from "@hellajs/dom";
import { select } from "@hellajs/headless";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface SelectEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

interface SelectTriggerProps extends HTMLAttributes<"button"> {
  id?: string;
  size?: "sm" | "default";
  /** Resolves the open state for `data-state`/`aria-expanded`; the composed Select wires it. */
  state?: () => "open" | "closed";
  /** Called on click and on ArrowDown/ArrowUp to request an open toggle. */
  onOpen?: () => void;
  /** Renders an inline clear affordance while `hasValue` resolves truthy. */
  clearable?: boolean;
  /** Called when the clear affordance activates; the composed Select resets the value. */
  onClear?: () => void;
  /** Resolves whether a value is currently selected (drives the clear affordance). */
  hasValue?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

interface SelectValueProps extends HTMLAttributes<"span"> {
  placeholder?: string;
  /** The chosen label. A string reads statically; an accessor keeps it reactive (the composed Select threads one). Manual wiring passes the current label. */
  value?: HellaChildren | (() => HellaChildren | undefined);
  class?: string;
}

interface SelectContentProps extends HTMLAttributes<"div"> {
  id?: string;
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** Called by the listbox keyboard model to close (Tab); the composed Select wires it. */
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface SelectPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface SelectItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: HellaChildren;
  disabled?: boolean;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning select. */
  selected?: boolean | (() => boolean);
  /** Called on click when the item is enabled; the composed Select commits the value. */
  onselect?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface SelectLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface SelectScrollButtonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface SelectProps extends HTMLAttributes<"button"> {
  id?: string;
  disabled?: boolean;
  items?: SelectEntry[] | (() => SelectEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  /** Renders the trigger's clear affordance while a value is selected. */
  clearable?: boolean;
  class?: string;
}
import { cn } from "./cn.js";

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
      cn("size-4 opacity-50")
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
      cn("size-4")
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
      cn("size-4")
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
        cn("flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=select-chevron]]:size-4 [&_[data-slot=select-chevron]]:opacity-50", cls)
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
        cn(cls)
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
        cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [&_[data-slot=select-viewport]]:p-1 [&_[data-slot=select-viewport]]:h-[var(--radix-select-trigger-height)] [&_[data-slot=select-viewport]]:w-full [&_[data-slot=select-viewport]]:min-w-[var(--radix-select-trigger-width)] [&_[data-slot=select-viewport]]:scroll-my-1 [&_[data-slot=select-scroll-up-button]]:flex [&_[data-slot=select-scroll-up-button]]:cursor-default [&_[data-slot=select-scroll-up-button]]:items-center [&_[data-slot=select-scroll-up-button]]:justify-center [&_[data-slot=select-scroll-up-button]]:py-1 [&_[data-slot=select-scroll-down-button]]:flex [&_[data-slot=select-scroll-down-button]]:cursor-default [&_[data-slot=select-scroll-down-button]]:items-center [&_[data-slot=select-scroll-down-button]]:justify-center [&_[data-slot=select-scroll-down-button]]:py-1 [&_[data-slot=select-chevron-up]]:size-4 [&_[data-slot=select-chevron]]:size-4 [&_[data-slot=select-chevron]]:opacity-50 [&_[data-slot=select-item]]:relative [&_[data-slot=select-item]]:flex [&_[data-slot=select-item]]:w-full [&_[data-slot=select-item]]:cursor-default [&_[data-slot=select-item]]:items-center [&_[data-slot=select-item]]:gap-2 [&_[data-slot=select-item]]:rounded-sm [&_[data-slot=select-item]]:py-1.5 [&_[data-slot=select-item]]:pr-8 [&_[data-slot=select-item]]:pl-2 [&_[data-slot=select-item]]:text-sm [&_[data-slot=select-item]]:outline-hidden [&_[data-slot=select-item]]:select-none [&_[data-slot=select-item]]:focus:bg-accent [&_[data-slot=select-item]]:focus:text-accent-foreground [&_[data-slot=select-item]]:data-[disabled]:pointer-events-none [&_[data-slot=select-item]]:data-[disabled]:opacity-50 [&_[data-slot=select-item]_svg]:pointer-events-none [&_[data-slot=select-item]_svg]:shrink-0 [&_[data-slot=select-item]_svg:not([class*='size-'])]:size-4 [&_[data-slot=select-item]_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=select-item]>span:last-child]:flex [&_[data-slot=select-item]>span:last-child]:items-center [&_[data-slot=select-item]>span:last-child]:gap-2 [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:pointer-events-none [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:absolute [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:right-2 [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:flex [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:size-3.5 [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:items-center [&_[data-slot=select-item]_[data-slot=select-item-indicator]]:justify-center [&_[data-slot=select-item]_[data-slot=select-check-icon]]:size-4", cls)
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
        cn(cls)
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
        cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 [&_[data-slot=select-item-indicator]]:pointer-events-none [&_[data-slot=select-item-indicator]]:absolute [&_[data-slot=select-item-indicator]]:right-2 [&_[data-slot=select-item-indicator]]:flex [&_[data-slot=select-item-indicator]]:size-3.5 [&_[data-slot=select-item-indicator]]:items-center [&_[data-slot=select-item-indicator]]:justify-center [&_[data-slot=select-check-icon]]:size-4", cls)
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
        cn("px-2 py-1.5 text-xs text-muted-foreground", cls)
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
        cn("pointer-events-none -mx-1 my-1 h-px bg-border", cls)
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
        cn("flex cursor-default items-center justify-center py-1", cls)
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
        cn("flex cursor-default items-center justify-center py-1", cls)
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
        cn("flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=select-chevron]]:size-4 [&_[data-slot=select-chevron]]:opacity-50", cls)
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
