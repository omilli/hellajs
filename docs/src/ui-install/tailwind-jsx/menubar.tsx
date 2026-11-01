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
import { cn } from "./cn.js";

export function MenubarGroup({ children, class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="menubar-group"
      class={
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive! [&_[data-slot=menu-shortcut]]:ml-auto [&_[data-slot=menu-shortcut]]:text-xs [&_[data-slot=menu-shortcut]]:tracking-widest [&_[data-slot=menu-shortcut]]:text-muted-foreground", cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center", cls)
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
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center [&_[data-slot=menu-radio-icon]]:size-2 [&_[data-slot=menu-radio-icon]]:fill-current", cls)
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
        cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", cls)
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
        cn("-mx-1 my-1 h-px bg-border", cls)
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
        cn("ml-auto text-xs tracking-widest text-muted-foreground", cls)
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
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_[data-slot=menu-chevron]]:ml-auto [&_[data-slot=menu-chevron]]:h-4 [&_[data-slot=menu-chevron]]:w-4", cls)
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="menubar-sub-content"
        class={
          cn("z-50 min-w-[8rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
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
        cn(cls)
      }
      {...attrs}
    >
      <File.Trigger
        data-slot="menubar-trigger"
        class={
          cn("flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground")
        }
      >
        {children}
      </File.Trigger>
      <File.Content
        data-slot="menubar-content"
        class={
          cn("z-50 min-w-[12rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
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
        cn("flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs", cls)
      }
      {...attrs}
    >
      {children}
    </Bar>
  );
}
