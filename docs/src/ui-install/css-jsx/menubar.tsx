import { menu, menubar } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

interface MenubarPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface MenubarItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

interface MenubarCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

interface MenubarRadioGroupProps extends HTMLAttributes<"div"> {
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

interface MenubarRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

interface MenubarLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

interface MenubarShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface MenubarSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

interface MenubarMenuProps extends HTMLAttributes<"div"> {
  /** This menu's id in the bar's open-menu value; a generated id stands in when omitted. */
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

interface MenubarProps extends HTMLAttributes<"div"> {
  /** Controlled id of the open menu ("" when closed). When given, the bar never writes its internal signal and `onValueChange` reports every flip. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
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

const base = style("menubar-base", {
  alignItems: "center",
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  gap: "0.25rem",
  height: "2.25rem",
  padding: "0.25rem",
});

const trigger = style("menubar-trigger", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.25rem",
  paddingInline: "0.5rem",
  userSelect: "none",
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-state='open']": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
});

const content = style("menubar-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  minWidth: "12rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflow: "hidden",
  padding: "0.25rem",
  transformOrigin: "var(--radix-menubar-content-transform-origin)",
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

const item = style("menubar-item", {
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

const checkItem = style("menubar-check-item", {
  alignItems: "center",
  borderRadius: "0.125rem",
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

const radioItem = style("menubar-radio-item", {
  alignItems: "center",
  borderRadius: "0.125rem",
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

const indicator = style("menubar-indicator", {
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
});

const icon = style("menubar-icon", {
  height: "1rem",
  width: "1rem",
});

const radioIcon = style("menubar-radio-icon", {
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
});

const label = style("menubar-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
});

const separator = style("menubar-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
});

const shortcut = style("menubar-shortcut", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

const subTrigger = style("menubar-sub-trigger", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  outlineStyle: "none",
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

  "& [menu-chevron]": {
    height: "1rem",
    marginLeft: "auto",
    width: "1rem",
  },
});

const chevron = style("menubar-chevron", {
  height: "1rem",
  marginLeft: "auto",
  width: "1rem",
});

const subContent = style("menubar-sub-content", {
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
  transformOrigin: "var(--radix-menubar-content-transform-origin)",
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

export function MenubarGroup({ children, class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="menubar-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function MenubarItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: MenubarItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="menubar-item"
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function MenubarCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: MenubarCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="menubar-checkbox-item"
      class={
        [checkItem, cls]
      }
      {...attrs}
    >
      {children}
    </CheckboxItem>
  );
}

export function MenubarRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: MenubarRadioGroupProps): JSX.Element {
  const { RadioGroup } = menu();
  return (
    <RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="menubar-radio-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </RadioGroup>
  );
}

export function MenubarRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: MenubarRadioItemProps): JSX.Element {
  const { RadioItem } = menu();
  return (
    <RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="menubar-radio-item"
      class={
        [radioItem, cls]
      }
      {...attrs}
    >
      {children}
    </RadioItem>
  );
}

export function MenubarLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: MenubarLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
      inset={inset}
      data-slot="menubar-label"
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

export function MenubarSeparator({ class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
      data-slot="menubar-separator"
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

export function MenubarShortcut({
  children,
  class: cls,
  ...attrs
}: MenubarShortcutProps): JSX.Element {
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="menubar-shortcut"
      class={
        [shortcut, cls]
      }
      {...attrs}
    >
      {children}
    </Shortcut>
  );
}

export function MenubarSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: MenubarSubProps): JSX.Element {
  const sub = menu().sub();
  return (
    <sub.Trigger
      data-slot="menubar-sub-trigger"
      class={
        [subTrigger, cls]
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="menubar-sub-content"
        class={
          [subContent]
        }
      >
        {contentSlot}
      </sub.Content>
    </sub.Trigger>
  );
}

export function MenubarMenu({
  value,
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: MenubarMenuProps): JSX.Element {
  const { menu } = menubar();
  const File = menu({ value, open, onOpenChange });
  return (
    <div
      data-slot="menubar-menu"
      data-value={value}
      class={
        [cls]
      }
      {...attrs}
    >
      <File.Trigger
        data-slot="menubar-trigger"
        class={
          [trigger]
        }
      >
        {children}
      </File.Trigger>
      <File.Content
        data-slot="menubar-content"
        class={
          [content]
        }
      >
        {contentSlot}
      </File.Content>
    </div>
  );
}

export function Menubar({
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: MenubarProps): JSX.Element {
  const { Bar } = menubar({ value: valueProp, onValueChange });
  return (
    <Bar
      data-slot="menubar"
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </Bar>
  );
}
