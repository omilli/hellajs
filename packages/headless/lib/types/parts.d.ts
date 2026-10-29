import type { HTMLAttributes, HellaChildren, HellaPrimitive } from "@hellajs/dom";

/** Requested popover side. */
export type AnchorSide = "top" | "bottom" | "left" | "right";

/** Requested alignment along the side. */
export type AnchorAlign = "start" | "center" | "end";

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type PopoverClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface PopoverOptions {
  /** Controlled open-state getter; passing it makes the popover controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned toggle and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the `Anchor` node, then the `Trigger` node. */
  anchor?: () => Element | undefined;
}

export interface PopoverTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: PopoverClass;
}

export interface PopoverAnchorProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: PopoverClass;
}

export interface PopoverContentProps extends HTMLAttributes<"div"> {
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's trigger/anchor node. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: PopoverClass;
}

export interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: PopoverClass;
}

export interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren | HellaChildren[];
  class?: PopoverClass;
}

/** The part set a `popover()` factory call returns, composed as `Popover.Trigger`-style members. */
export interface PopoverParts {
  /** The toggle button: owns the click toggle, `data-state`, and the trigger aria contract. */
  Trigger: (props: PopoverTriggerProps) => JSX.Element;
  /** A bare anchor span — the positioning target when the trigger should not anchor. */
  Anchor: (props: PopoverAnchorProps) => JSX.Element;
  /** The portaled content layer: anchors, arms Escape + stacked dismissal while open, exits through `animationend`. */
  Content: (props: PopoverContentProps) => JSX.Element;
  /** A structural header group. */
  Header: (props: PopoverPartProps) => JSX.Element;
  /** A structural title heading. */
  Title: (props: PopoverPartProps) => JSX.Element;
  /** A structural description paragraph. */
  Description: (props: PopoverDescriptionProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type MenuClass = HellaPrimitive | (string | null | undefined | boolean)[];

/** One selectable entry of a radio group's `items` array. */
export interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** How the factory's trigger opens the menu: a click toggle (default) or the browser contextmenu event at the pointer. */
export type MenuTriggerMode = "click" | "contextmenu";

export interface MenuOptions {
  /** Controlled open-state getter; passing it makes the menu controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned toggle and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** The trigger model. Default `"click"`. */
  trigger?: MenuTriggerMode;
}

export interface MenuTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

export interface MenuContentProps extends HTMLAttributes<"div"> {
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 4 (0 for the contextmenu trigger). */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's trigger or virtual anchor. */
  anchor?: () => Element | undefined;
  /** ArrowLeft closes the menu when provided (submenu exit; a top-level menu stays inert). */
  onArrowLeft?: () => void;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

export interface MenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

export interface MenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  /** Destructive variant marker (`data-variant`). */
  destructive?: boolean;
  /** Inset alignment marker (`data-inset`). */
  inset?: boolean;
  disabled?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  /** Called on activation, before the menu closes. */
  onSelect?: () => void;
  /** Keeps the menu open after selecting this item. Default `true`. */
  closeOnSelect?: boolean;
  class?: MenuClass;
}

export interface MenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled — activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  class?: MenuClass;
}

export interface MenuRadioGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  /** The rendered radio entries. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items?: MenuEntry[] | (() => MenuEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: MenuClass;
}

export interface MenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  disabled?: boolean;
  class?: MenuClass;
}

export interface MenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  inset?: boolean;
  class?: MenuClass;
}

export interface MenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

export interface MenuSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  inset?: boolean;
  class?: MenuClass;
}

export interface MenuSubContentProps extends HTMLAttributes<"div"> {
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the sub-trigger and the content edge, in px. Default 0. */
  sideOffset?: number;
  alignOffset?: number;
  /** Resolves the element the content anchors to; overrides the sub's own trigger. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

/** The part set a `sub()` call returns: the nested trigger and content own the submenu state; the item parts are the parent menu's. */
export interface MenuSubParts {
  /** The submenu trigger: hover intent (~100ms rest) opens, leaving closes after ~300ms, click opens. */
  Trigger: (props: MenuSubTriggerProps) => JSX.Element;
  /** The submenu content layer: anchors to the sub-trigger, closes on ArrowLeft, and cancels a pending close on pointer entry. */
  Content: (props: MenuSubContentProps) => JSX.Element;
  /** The parent menu's Item. */
  Item: (props: MenuItemProps) => JSX.Element;
  /** The parent menu's CheckboxItem. */
  CheckboxItem: (props: MenuCheckboxItemProps) => JSX.Element;
  /** The parent menu's RadioGroup. */
  RadioGroup: (props: MenuRadioGroupProps) => JSX.Element;
  /** The parent menu's RadioItem. */
  RadioItem: (props: MenuRadioItemProps) => JSX.Element;
  /** The parent menu's Label. */
  Label: (props: MenuLabelProps) => JSX.Element;
  /** The parent menu's Separator. */
  Separator: (props: MenuPartProps) => JSX.Element;
  /** The parent menu's Group. */
  Group: (props: MenuPartProps) => JSX.Element;
  /** The parent menu's Shortcut. */
  Shortcut: (props: MenuShortcutProps) => JSX.Element;
}

/** The part set a `menu()` factory call returns, composed as `Menu.Trigger`-style members. */
export interface MenuParts {
  /** The trigger: a click-toggle button, or — with `trigger: "contextmenu"` — the zone that opens the menu at the pointer. */
  Trigger: (props: MenuTriggerProps) => JSX.Element;
  /** The portaled content layer: anchors to the trigger (or the virtual pointer anchor), arms typeahead, roving arrows, Escape + stacked dismissal while open. */
  Content: (props: MenuContentProps) => JSX.Element;
  /** A selectable row: closes the menu on select unless `closeOnSelect: false`. */
  Item: (props: MenuItemProps) => JSX.Element;
  /** A checkable row: controlled through a `checked` accessor or its own signal; toggling closes the menu. */
  CheckboxItem: (props: MenuCheckboxItemProps) => JSX.Element;
  /** Groups radio items with controlled-or-internal value state and optional declarative `items`. */
  RadioGroup: (props: MenuRadioGroupProps) => JSX.Element;
  /** A radio row: reports the selection to its owning group or `onSelect`, then closes the menu. */
  RadioItem: (props: MenuRadioItemProps) => JSX.Element;
  /** A structural label row. */
  Label: (props: MenuLabelProps) => JSX.Element;
  /** A structural separator. */
  Separator: (props: MenuPartProps) => JSX.Element;
  /** A structural group. */
  Group: (props: MenuPartProps) => JSX.Element;
  /** A trailing shortcut hint span. */
  Shortcut: (props: MenuShortcutProps) => JSX.Element;
  /** Creates a nested menu factory: its own controlled-or-internal open state, anchored to its own trigger, riding the same layer stack. */
  sub: (options?: MenuSubOptions) => MenuSubParts;
}

/** Options for a `sub()` call: the submenu's controlled-or-internal open state. */
export interface MenuSubOptions {
  /** Controlled open-state getter; passing it makes the submenu controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned open and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
}

export interface MenubarOptions {
  /** Controlled id of the open menu (`""` when closed). When given, the bar never writes its internal signal and `onValueChange` reports every flip. */
  value?: () => string;
  onValueChange?: (value: string) => void;
}

export interface MenubarBarProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MenuClass;
}

/** Options for a `menubar()`'s coordinated bar menu: the menu options plus this menu's id in the bar's open-menu value. */
export interface MenubarMenuOptions extends MenuOptions {
  /** This menu's id in the bar's open-menu value; a generated id stands in when omitted. */
  value?: string;
}

/** The part set a `menubar()` factory call returns: the bar root plus a factory for coordinated bar menus. */
export interface MenubarParts {
  /** The bar root: roving arrows across its triggers while closed, and the open-menu value mirrored from the bar menus' announcements. */
  Bar: (props: MenubarBarProps) => JSX.Element;
  /** Creates one bar menu: full menu part set whose open state announces to the bar (opening one menu closes its siblings, and horizontal arrows hand off between triggers). */
  menu: (options?: MenubarMenuOptions) => MenuParts;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type TooltipClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface TooltipOptions {
  /** Controlled open-state getter; passing it makes the tooltip controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned hover and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** Pointer-hover ms before the content opens. Default 700. */
  delay?: number;
}

export interface TooltipProviderProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: TooltipClass;
}

export interface TooltipTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: TooltipClass;
}

export interface TooltipContentProps extends HTMLAttributes<"div"> {
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the trigger and the content edge, in px. Default 0. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's trigger node. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: TooltipClass;
}

/** The part set a `tooltip()` factory call returns, composed as `Tip.Trigger`-style members. */
export interface TooltipParts {
  /** A passthrough grouping div: the provider slot a tooltip group's styles target. */
  Provider: (props: TooltipProviderProps) => JSX.Element;
  /** The hover trigger span: owns the hover/focus intent wiring and the `aria-describedby` contract. */
  Trigger: (props: TooltipTriggerProps) => JSX.Element;
  /** The portaled content layer: anchors to the trigger, arms Escape + stacked dismissal while open, exits through `animationend`. */
  Content: (props: TooltipContentProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type HoverCardClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface HoverCardOptions {
  /** Controlled open-state getter; passing it makes the hover card controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned hover and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** Pointer-hover ms before the content opens. Default 200. */
  openDelay?: number;
  /** Pointer-leave ms before the content closes. Default 300. */
  closeDelay?: number;
}

export interface HoverCardTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: HoverCardClass;
}

export interface HoverCardContentProps extends HTMLAttributes<"div"> {
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the trigger and the content edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's trigger node. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: HoverCardClass;
}

/** The part set a `hoverCard()` factory call returns, composed as `Card.Trigger`-style members. */
export interface HoverCardParts {
  /** The hover trigger span: owns the hover/focus intent wiring with the crossing contract (moving into the content never closes). */
  Trigger: (props: HoverCardTriggerProps) => JSX.Element;
  /** The portaled content layer: anchors to the trigger, keeps itself open while hovered, arms Escape + stacked dismissal, exits through `animationend`. */
  Content: (props: HoverCardContentProps) => JSX.Element;
}
