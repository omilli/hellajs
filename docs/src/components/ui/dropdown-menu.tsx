import { menu } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

interface DropdownMenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface DropdownMenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

interface DropdownMenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

interface DropdownMenuRadioGroupProps extends HTMLAttributes<"div"> {
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

interface DropdownMenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

interface DropdownMenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

interface DropdownMenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface DropdownMenuSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

interface DropdownMenuProps extends HTMLAttributes<"button"> {
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

const base = style("dropdown-menu-base", {
  alignItems: "center",
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "1rem",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:has(> svg)": {
    paddingInline: "0.75rem",
  },
  "&:is(.dark *)": {
    borderColor: tokens.input,
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):hover": {
    background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
  },
});

const content = style("dropdown-menu-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  maxHeight: "var(--radix-dropdown-menu-content-available-height)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "0.25rem",
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
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

const item = style("dropdown-menu-item", {
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

const checkItem = style("dropdown-menu-check-item", {
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

const radioItem = style("dropdown-menu-radio-item", {
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

const indicator = style("dropdown-menu-indicator", {
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
});

const icon = style("dropdown-menu-icon", {
  height: "1rem",
  width: "1rem",
});

const radioIcon = style("dropdown-menu-radio-icon", {
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
});

const label = style("dropdown-menu-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
});

const separator = style("dropdown-menu-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
});

const shortcut = style("dropdown-menu-shortcut", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

const subTrigger = style("dropdown-menu-sub-trigger", {
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
    height: "1rem",
    marginLeft: "auto",
    width: "1rem",
  },
});

const chevron = style("dropdown-menu-chevron", {
  height: "1rem",
  marginLeft: "auto",
  width: "1rem",
});

const subContent = style("dropdown-menu-sub-content", {
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
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
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

export function DropdownMenuGroup({
  children,
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="dropdown-menu-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function DropdownMenuItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="dropdown-menu-item"
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function DropdownMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: DropdownMenuCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="dropdown-menu-checkbox-item"
      class={
        [checkItem, cls]
      }
      {...attrs}
    >
      {children}
    </CheckboxItem>
  );
}

export function DropdownMenuRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioGroupProps): JSX.Element {
  const { RadioGroup } = menu();
  return (
    <RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="dropdown-menu-radio-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </RadioGroup>
  );
}

export function DropdownMenuRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioItemProps): JSX.Element {
  const { RadioItem } = menu();
  return (
    <RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="dropdown-menu-radio-item"
      class={
        [radioItem, cls]
      }
      {...attrs}
    >
      {children}
    </RadioItem>
  );
}

export function DropdownMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: DropdownMenuLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
      inset={inset}
      data-slot="dropdown-menu-label"
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

export function DropdownMenuSeparator({
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
      data-slot="dropdown-menu-separator"
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

export function DropdownMenuShortcut({
  children,
  class: cls,
  ...attrs
}: DropdownMenuShortcutProps): JSX.Element {
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="dropdown-menu-shortcut"
      class={
        [shortcut, cls]
      }
      {...attrs}
    >
      {children}
    </Shortcut>
  );
}

export function DropdownMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubProps): JSX.Element {
  const sub = menu().sub();
  return (
    <sub.Trigger
      data-slot="dropdown-menu-sub-trigger"
      class={
        [subTrigger, cls]
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="dropdown-menu-sub-content"
        class={
          [subContent]
        }
      >
        {contentSlot}
      </sub.Content>
    </sub.Trigger>
  );
}

export function DropdownMenu({
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuProps): JSX.Element {
  const Menu = menu({ open, onOpenChange });
  return (
    <Menu.Trigger
      data-slot="dropdown-menu-trigger"
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
      <Menu.Content
        data-slot="dropdown-menu-content"
        class={
          [content]
        }
      >
        {contentSlot}
      </Menu.Content>
    </Menu.Trigger>
  );
}
