import { menu } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

interface ContextMenuTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface ContextMenuContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** ArrowLeft closes the menu when provided (submenu exit; a top-level menu stays inert). */
  onArrowLeft?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface ContextMenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface ContextMenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

interface ContextMenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

interface ContextMenuRadioGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** The rendered radio entries. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items?: MenuEntry[] | (() => MenuEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

interface ContextMenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

interface ContextMenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

interface ContextMenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface ContextMenuSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

interface ContextMenuSubContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to (the sub-trigger); positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** ArrowLeft closes the submenu. */
  onArrowLeft?: () => void;
  /** Pointer entering the content cancels the trigger's pending close. */
  onPointerEnter?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface ContextMenuSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

interface ContextMenuProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
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

const content = style("context-menu-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  maxHeight: "var(--radix-context-menu-content-available-height)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "0.25rem",
  transformOrigin: "var(--radix-context-menu-content-transform-origin)",
  zIndex: "50",
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
});

const item = style("context-menu-item", {
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
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-variant='destructive']": {
    color: tokens.destructive,
  },
  "&[data-variant='destructive']:focus": {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
  },
  "&:is(.dark *)[data-variant='destructive']:focus": {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
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
  "&[data-variant='destructive'] svg": {
    color: `${tokens.destructive} !important`,
  },

  "& [menu-shortcut]": {
    color: tokens.mutedForeground,
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    lineHeight: "1rem",
    marginLeft: "auto",
  },
});

const checkItem = style("context-menu-check-item", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },

  "& [menu-indicator]": {
    alignItems: "center",
    display: "flex",
    height: "0.875rem",
    justifyContent: "center",
    left: "0.5rem",
    pointerEvents: "none",
    position: "absolute",
    width: "0.875rem",
  },
});

const radioItem = style("context-menu-radio-item", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },

  "& [data-slot='menu-indicator']": {
    alignItems: "center",
    display: "flex",
    height: "0.875rem",
    justifyContent: "center",
    left: "0.5rem",
    pointerEvents: "none",
    position: "absolute",
    width: "0.875rem",
  },
  "& [data-slot='menu-radio-icon']": {
    fill: "currentColor",
    height: "0.5rem",
    width: "0.5rem",
  },
});

const indicator = style("context-menu-indicator", {
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
});

const icon = style("context-menu-icon", {
  height: "1rem",
  width: "1rem",
});

const radioIcon = style("context-menu-radio-icon", {
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
});

const label = style("context-menu-label", {
  color: tokens.foreground,
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
});

const separator = style("context-menu-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
});

const shortcut = style("context-menu-shortcut", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

const subTrigger = style("context-menu-sub-trigger", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-state='open']": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
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

  "& [menu-chevron]": {
    marginLeft: "auto",
  },
});

const chevron = style("context-menu-chevron", {
  marginLeft: "auto",
});

const subContent = style("context-menu-sub-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflow: "hidden",
  padding: "0.25rem",
  transformOrigin: "var(--radix-context-menu-content-transform-origin)",
  zIndex: "50",
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
});

/** The manual trigger zone; the composed ContextMenu renders the same shape wired to the `contextmenu` listener. */
export function ContextMenuTrigger({
  children,
  class: cls,
  ...attrs
}: ContextMenuTriggerProps): JSX.Element {
  const { Trigger } = menu({ trigger: "contextmenu" });
  return (
    <Trigger
      data-slot="context-menu-trigger"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/** The manual content layer; the composed ContextMenu portals the same wiring under its zone's state. */
export function ContextMenuContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  children,
  class: cls,
  ...attrs
}: ContextMenuContentProps): JSX.Element {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const { Content } = menu({
    trigger: "contextmenu",
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
  });
  return (
    <Content
      id={id}
      side={side}
      align={align}
      anchor={anchor}
      onArrowLeft={onArrowLeft}
      onExited={onExited}
      data-slot="context-menu-content"
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function ContextMenuGroup({
  children,
  class: cls,
  ...attrs
}: ContextMenuPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="context-menu-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function ContextMenuItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="context-menu-item"
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function ContextMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: ContextMenuCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="context-menu-checkbox-item"
      class={
        [checkItem, cls]
      }
      {...attrs}
    >
      {children}
    </CheckboxItem>
  );
}

export function ContextMenuRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: ContextMenuRadioGroupProps): JSX.Element {
  const { RadioGroup } = menu();
  return (
    <RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="context-menu-radio-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </RadioGroup>
  );
}

export function ContextMenuRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: ContextMenuRadioItemProps): JSX.Element {
  const { RadioItem } = menu();
  return (
    <RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="context-menu-radio-item"
      class={
        [radioItem, cls]
      }
      {...attrs}
    >
      {children}
    </RadioItem>
  );
}

export function ContextMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: ContextMenuLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
      inset={inset}
      data-slot="context-menu-label"
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

export function ContextMenuSeparator({ class: cls, ...attrs }: ContextMenuPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
      data-slot="context-menu-separator"
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

export function ContextMenuShortcut({
  children,
  class: cls,
  ...attrs
}: ContextMenuShortcutProps): JSX.Element {
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="context-menu-shortcut"
      class={
        [shortcut, cls]
      }
      {...attrs}
    >
      {children}
    </Shortcut>
  );
}

export function ContextMenuSubTrigger({
  inset,
  state,
  onOpen,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubTriggerProps): JSX.Element {
  const sub = menu().sub({
    open: state ? () => state() === "open" : undefined,
    onOpenChange: (next) => {
      if (next) onOpen?.();
    },
  });
  return (
    <sub.Trigger
      inset={inset}
      data-slot="context-menu-sub-trigger"
      class={
        [subTrigger, cls]
      }
      {...attrs}
    >
      {children}
    </sub.Trigger>
  );
}

export function ContextMenuSubContent({
  state,
  side: sideProp,
  align: alignProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  onPointerEnter,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubContentProps): JSX.Element {
  const side = sideProp ?? "right";
  const align = alignProp ?? "start";
  // ArrowLeft-exit and pointerenter-cancel are the factory sub wiring's own
  // utils now - consumed here so they never reach the DOM as attributes.
  void onArrowLeft;
  void onPointerEnter;
  const { Content } = menu().sub({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
  });
  return (
    <Content
      side={side}
      align={align}
      anchor={anchor}
      onExited={onExited}
      data-slot="context-menu-sub-content"
      class={
        [subContent, cls]
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function ContextMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubProps): JSX.Element {
  const sub = menu().sub();
  return (
    <sub.Trigger
      data-slot="context-menu-sub-trigger"
      class={
        [subTrigger, cls]
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="context-menu-sub-content"
        class={
          [subContent]
        }
      >
        {contentSlot}
      </sub.Content>
    </sub.Trigger>
  );
}

export function ContextMenu({
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuProps): JSX.Element {
  const Context = menu({ trigger: "contextmenu", open, onOpenChange });
  return (
    <Context.Trigger
      data-slot="context-menu-trigger"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
      <Context.Content
        data-slot="context-menu-content"
        class={
          [content]
        }
      >
        {contentSlot}
      </Context.Content>
    </Context.Trigger>
  );
}
