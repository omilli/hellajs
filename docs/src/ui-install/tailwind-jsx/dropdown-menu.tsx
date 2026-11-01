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
import { cn } from "./cn.js";

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
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive! [&_[data-slot=menu-shortcut]]:ml-auto [&_[data-slot=menu-shortcut]]:text-xs [&_[data-slot=menu-shortcut]]:tracking-widest [&_[data-slot=menu-shortcut]]:text-muted-foreground", cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center", cls)
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
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center [&_[data-slot=menu-radio-icon]]:size-2 [&_[data-slot=menu-radio-icon]]:fill-current", cls)
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
        cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", cls)
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
        cn("-mx-1 my-1 h-px bg-border", cls)
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
        cn("ml-auto text-xs tracking-widest text-muted-foreground", cls)
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
        cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=menu-chevron]]:ml-auto [&_[data-slot=menu-chevron]]:size-4", cls)
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="dropdown-menu-sub-content"
        class={
          cn("z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
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
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3", cls)
      }
      {...attrs}
    >
      {children}
      <Menu.Content
        data-slot="dropdown-menu-content"
        class={
          cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
        }
      >
        {contentSlot}
      </Menu.Content>
    </Menu.Trigger>
  );
}
