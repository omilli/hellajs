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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

// The headless factory renders the option rows, scroll buttons, viewport, and
// chevron icons classless; these shared rule blocks restyle them through their
// data-slots from the wrapper roots (content) and are shared with the
// manually composed Item part that roots the row rules directly.
const itemRules = {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingLeft: "0.5rem",
  paddingRight: "2rem",
  position: "relative",
  userSelect: "none",
  width: "100%",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& > span:last-child": {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: tokens.mutedForeground,
  },
  "& [data-slot='select-item-indicator']": {
    alignItems: "center",
    display: "flex",
    height: "0.875rem",
    justifyContent: "center",
    position: "absolute",
    right: "0.5rem",
    width: "0.875rem",
  },
  "& [data-slot='select-check-icon']": {
    height: "1rem",
    width: "1rem",
  },
};

const scrollButtonRules = {
  alignItems: "center",
  cursor: "default",
  display: "flex",
  justifyContent: "center",
  paddingBlock: "0.25rem",
};

const base = style("select-trigger", {
  alignItems: "center",
  backgroundColor: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  justifyContent: "space-between",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "0.75rem",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "fit-content",
  "&[data-placeholder]": {
    color: tokens.mutedForeground,
  },
  "&[data-size='default']": {
    height: "2.25rem",
  },
  "&[data-size='sm']": {
    height: "2rem",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
    boxShadow: `0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "& > [data-slot='select-value']": {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
    lineClamp: "1",
    overflow: "hidden",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: tokens.mutedForeground,
  },
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):hover": {
    background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']": {
    boxShadow: `0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "& [data-slot='select-chevron']": {
    height: "1rem",
    opacity: "0.5",
    width: "1rem",
  },
});

const content = style("select-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  maxHeight: "var(--radix-select-content-available-height)",
  minWidth: "8rem",
  overflowX: "hidden",
  overflowY: "auto",
  position: "relative",
  transformOrigin: "var(--radix-select-content-transform-origin)",
  zIndex: "50",
  "&[data-side='bottom']": {
    translate: "0 0.25rem",
  },
  "&[data-side='left']": {
    translate: "-0.25rem 0",
  },
  "&[data-side='right']": {
    translate: "0.25rem 0",
  },
  "&[data-side='top']": {
    translate: "0 -0.25rem",
  },
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
  "& [data-slot='select-viewport']": {
    height: "var(--radix-select-trigger-height)",
    minWidth: "var(--radix-select-trigger-width)",
    padding: "0.25rem",
    scrollPaddingBlock: "0.25rem",
    width: "100%",
  },
  "& [data-slot='select-scroll-up-button']": scrollButtonRules,
  "& [data-slot='select-scroll-down-button']": scrollButtonRules,
  "& [data-slot='select-chevron-up']": {
    height: "1rem",
    width: "1rem",
  },
  "& [data-slot='select-chevron']": {
    height: "1rem",
    opacity: "0.5",
    width: "1rem",
  },
  "& [data-slot='select-item']": itemRules,
});

const item = style("select-item", itemRules);

const icon = style("select-icon", {
  height: "1rem",
  width: "1rem",
});

const chevron = style("select-chevron", {
  height: "1rem",
  opacity: "0.5",
  width: "1rem",
});

const label = style("select-label", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
});

const separator = style("select-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
  pointerEvents: "none",
});

const scrollButton = style("select-scroll-button", scrollButtonRules);

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
      [chevron]
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
      [icon]
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
      [icon]
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
        [base, cls]
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
        [cls]
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
        [content, cls]
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
        [cls]
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
        [item, cls]
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
        [label, cls]
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
        [separator, cls]
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
        [scrollButton, cls]
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
        [scrollButton, cls]
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
        [base, cls]
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
