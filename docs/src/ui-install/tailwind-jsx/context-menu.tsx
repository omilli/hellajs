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
import { cn } from "./cn.js";

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
        cn(cls)
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
        cn("z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
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
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive! [&_[data-slot=menu-shortcut]]:ml-auto [&_[data-slot=menu-shortcut]]:text-xs [&_[data-slot=menu-shortcut]]:tracking-widest [&_[data-slot=menu-shortcut]]:text-muted-foreground", cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center", cls)
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
        cn(cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=menu-indicator]]:pointer-events-none [&_[data-slot=menu-indicator]]:absolute [&_[data-slot=menu-indicator]]:left-2 [&_[data-slot=menu-indicator]]:flex [&_[data-slot=menu-indicator]]:size-3.5 [&_[data-slot=menu-indicator]]:items-center [&_[data-slot=menu-indicator]]:justify-center [&_[data-slot=menu-radio-icon]]:size-2 [&_[data-slot=menu-radio-icon]]:fill-current", cls)
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
        cn("px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:pl-8", cls)
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
        cn("-mx-1 my-1 h-px bg-border", cls)
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
        cn("ml-auto text-xs tracking-widest text-muted-foreground", cls)
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
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=menu-chevron]]:ml-auto", cls)
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
        cn("z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
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
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=menu-chevron]]:ml-auto", cls)
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="context-menu-sub-content"
        class={
          cn("z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
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
        cn(cls)
      }
      {...attrs}
    >
      {children}
      <Context.Content
        data-slot="context-menu-content"
        class={
          cn("z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
        }
      >
        {contentSlot}
      </Context.Content>
    </Context.Trigger>
  );
}
