import { menu, menubar } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

interface MenubarTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface MenubarContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 8. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default -4. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** Both horizontal arrows report outward (bar open-then-move) when the focused item is not a sub-trigger. */
  onArrow?: (direction: "left" | "right") => void;
  children?: HellaChildren;
  class?: string;
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

interface MenubarSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

interface MenubarSubContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  sideOffset?: number;
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

/** The manual trigger button; the composed MenubarMenu renders the same shape wired to toggle + aria state. */
export function MenubarTrigger({
  children,
  class: cls,
  ...attrs
}: MenubarTriggerProps): JSX.Element {
  const { Trigger } = menubar().menu();
  return (
    <Trigger
      data-slot="menubar-trigger"
      class={
        cn("flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/** The manual content layer; the composed MenubarMenu portals the same wiring under its trigger's state. */
export function MenubarContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  sideOffset,
  alignOffset: alignOffsetProp,
  anchor,
  onDismiss,
  onExited,
  onArrow,
  children,
  class: cls,
  ...attrs
}: MenubarContentProps): JSX.Element {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const alignOffset = alignOffsetProp ?? -4;
  // Open-then-move is the factory bar-menu wiring's own behavior now -
  // consumed here so it never reaches the DOM as an attribute.
  void onArrow;
  const { Content } = menubar().menu({
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
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      anchor={anchor}
      onExited={onExited}
      data-slot="menubar-content"
      class={
        cn("z-50 min-w-[12rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

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

export function MenubarSubTrigger({
  inset,
  state,
  onOpen,
  children,
  class: cls,
  ...attrs
}: MenubarSubTriggerProps): JSX.Element {
  const sub = menu().sub({
    open: state ? () => state() === "open" : undefined,
    onOpenChange: (next) => {
      if (next) onOpen?.();
    },
  });
  return (
    <sub.Trigger
      inset={inset}
      data-slot="menubar-sub-trigger"
      class={
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_[data-slot=menu-chevron]]:ml-auto [&_[data-slot=menu-chevron]]:h-4 [&_[data-slot=menu-chevron]]:w-4", cls)
      }
      {...attrs}
    >
      {children}
    </sub.Trigger>
  );
}

export function MenubarSubContent({
  state,
  side: sideProp,
  align: alignProp,
  sideOffset,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  onPointerEnter,
  children,
  class: cls,
  ...attrs
}: MenubarSubContentProps): JSX.Element {
  const side = sideProp ?? "right";
  const align = alignProp ?? "start";
  // ArrowLeft-exit and pointerenter-cancel are the factory sub wiring's own
  // behaviors now - consumed here so they never reach the DOM as attributes.
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
      sideOffset={sideOffset}
      anchor={anchor}
      onExited={onExited}
      data-slot="menubar-sub-content"
      class={
        cn("z-50 min-w-[8rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }
      {...attrs}
    >
      {children}
    </Content>
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
