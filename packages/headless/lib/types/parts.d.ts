import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaPrimitive } from "@hellajs/dom";

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
export type NavigationMenuClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface NavigationMenuOptions {
  /** Controlled id of the open panel (`""` when closed). When given, the factory never writes its internal signal and `onValueChange` reports the requested value. */
  value?: () => string;
  /** Called with every store write mirrored from a trigger announcement. */
  onValueChange?: (value: string) => void;
  /** Whether the root renders the shared viewport slot as its last child. Default `true`; set `false` to compose a `Viewport` manually. */
  viewport?: boolean;
}

export interface NavigationMenuRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuListProps extends HTMLAttributes<"ul"> {
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuItemProps extends HTMLAttributes<"li"> {
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuTriggerProps extends HTMLAttributes<"button"> {
  /** This trigger's id in the root's open-value store; clicks announce it so the root's store and the indicator follow without context. */
  value?: string;
  /** Open-state override for manual composition; defaults to the factory's active value for `value`. */
  active?: () => boolean;
  /** Called on click before the announcement; defaults to announcement-only activation. */
  onActivate?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuContentProps extends HTMLAttributes<"div"> {
  /** The owning item's id in the root's open-value store; keys the factory's visibility. */
  value?: string;
  /** Visibility override mirroring the owning `Trigger`'s; defaults to the factory's active value for `value`. */
  active?: () => boolean;
  /** Portal target for the shared viewport slot; defaults to the first `[data-slot="navigation-menu-viewport"]` in the document. */
  viewport?: string;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuLinkProps extends HTMLAttributes<"a"> {
  /** Renders `data-active="true"` and its accent styles (the ref's data-[active=true] set). */
  active?: boolean;
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

export interface NavigationMenuViewportProps extends HTMLAttributes<"div"> {
  /** Open-state override for the viewport's enter/exit `data-state`; defaults to the factory's store being non-empty. */
  active?: () => boolean;
  class?: NavigationMenuClass;
}

export interface NavigationMenuIndicatorProps extends HTMLAttributes<"div"> {
  /** Visible-state override (any panel open); defaults to the factory-announced active trigger. */
  active?: () => boolean;
  /** Resolves the trigger the indicator sits under; defaults to the trigger announced by the activation stream. */
  anchor?: () => Element | undefined;
  children?: HellaChildren | HellaChildren[];
  class?: NavigationMenuClass;
}

/** The part set a `navigationMenu()` factory call returns, composed as `Nav.Root`-style members. */
export interface NavigationMenuParts {
  /** The bar root: mirrors trigger announcements into the open-value store and appends the shared viewport slot as its last child (unless `viewport: false`). */
  Root: (props: NavigationMenuRootProps) => JSX.Element;
  /** The `ul` list row wrapping the items. */
  List: (props: NavigationMenuListProps) => JSX.Element;
  /** The `li` item wrapping a trigger and its content anchor. */
  Item: (props: NavigationMenuItemProps) => JSX.Element;
  /** The trigger button: announces its `value` on click (one panel open at a time; a second click closes) and carries `aria-expanded`/`data-state` plus the chevron icon. */
  Trigger: (props: NavigationMenuTriggerProps) => JSX.Element;
  /** The panel for a value: portals into the shared viewport slot and exits through `animationend` (or the 250ms budget). */
  Content: (props: NavigationMenuContentProps) => JSX.Element;
  /** The leaf `a` link carrying `data-active` for the accent styles. */
  Link: (props: NavigationMenuLinkProps) => JSX.Element;
  /** The shared viewport slot whose `data-state` tracks the store; every `Content` portals into it. */
  Viewport: (props: NavigationMenuViewportProps) => JSX.Element;
  /** The moving indicator: measures the active trigger against the bar and re-measures on resize. */
  Indicator: (props: NavigationMenuIndicatorProps) => JSX.Element;
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

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type ComboboxClass = HellaPrimitive | (string | null | undefined | boolean)[];

/** One selectable entry of a combobox's option list. */
export interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface ComboboxOptions {
  /** Controlled open-state getter; passing it makes the combobox controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned toggle and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** The option entries. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Controlled selection — one value single-mode, an array under `multiple`. When given, the factory never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Multi-select mode: selections toggle into an array and the panel stays open; the input surface renders chips. */
  multiple?: boolean;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
}

export interface ComboboxInputProps extends HTMLAttributes<"input"> {
  /** The displayed query. A string reads statically; an accessor keeps it reactive; an omitted value binds the factory's internal query. */
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for `aria-expanded`; defaults to the factory's state. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for `aria-activedescendant`; defaults to the factory's active resolution. */
  activeDescendant?: () => string | undefined;
  /** Renders the addon's chevron toggle button. Default true. */
  showTrigger?: boolean;
  /** Renders the addon's clear affordance while a value is selected. */
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxContentProps extends HTMLAttributes<"div"> {
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's input wrapper. */
  anchor?: () => Element | undefined;
  /** Sets `data-chips="true"` (chips-composition width styling); defaults to the factory's `multiple`. */
  chips?: boolean;
  /** Zero-match flag driving `data-empty`; defaults to the factory's filtered matches. */
  empty?: () => boolean;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. Defaults to the factory's generated list id. */
  id?: string;
  /** Data-driven option rendering: every entry stays mounted while the query hides non-matches. An array reads statically; an accessor keeps the list reactive. */
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection and highlight state survive); order always follows the array. */
  keyBy?: "value";
  /** Resolves the live query driving the rendered entries' `hidden` state; defaults to the factory's query when `items` is the factory's own list. */
  query?: () => string;
  /** Replaces the default case-insensitive substring filter for the `hidden` resolution. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Resolves whether a value is selected (`aria-selected`, `data-state`, check icon); defaults to the factory's selection. */
  selected?: (value: string) => boolean;
  /** Resolves the highlighted value (`data-highlighted`, the `aria-activedescendant` target); defaults to the factory's active value. */
  active?: () => string | undefined;
  /** Called on item click with the item value; defaults to the factory's commit. */
  onselect?: (value: string) => void;
  /** Zero-match flag driving `data-empty`; defaults to the factory's filtered matches. */
  empty?: () => boolean;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: string;
  disabled?: boolean;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning list; an omitted value follows the factory's selection. */
  selected?: boolean | (() => boolean);
  /** Highlighted state. A boolean reads statically; an accessor follows the factory's roving; an omitted value follows the factory's active value. */
  highlighted?: boolean | (() => boolean);
  /** Hides the item (filtered out); a reactive accessor keeps it live against the query. */
  hidden?: () => boolean;
  /** Called on click when the item is enabled; defaults to the factory's commit. */
  onselect?: () => void;
  /** The option's stable id; defaults to `<listId>-opt-<value>` from the owning factory. */
  id?: string;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxSeparatorProps extends HTMLAttributes<"div"> {
  class?: ComboboxClass;
}

export interface ComboboxEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxValueProps extends HTMLAttributes<"span"> {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", "; an omitted value binds the factory's selection. */
  value?: string | string[] | (() => string | string[] | undefined);
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxClearProps extends HTMLAttributes<"button"> {
  /** Called on click; defaults to the factory's clear (selection wiped, query reset). */
  onClear?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxChipsProps extends HTMLAttributes<"div"> {
  /** Reactive chips thunk; defaults to the factory's selected values rendered as Chip parts. */
  chips?: () => HellaChildren;
  disabled?: boolean;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxChipProps extends HTMLAttributes<"div"> {
  value?: string;
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  /** Called on remove-button click; defaults to the factory's toggle (removing the value from the selection). */
  onRemove?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: ComboboxClass;
}

export interface ComboboxChipsInputProps extends HTMLAttributes<"input"> {
  /** The displayed query. A string reads statically; an accessor keeps it reactive; an omitted value binds the factory's internal query. */
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for `aria-expanded`; defaults to the factory's state. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for `aria-activedescendant`; defaults to the factory's active resolution. */
  activeDescendant?: () => string | undefined;
  class?: ComboboxClass;
}

/** The part set a `combobox()` factory call returns, composed as `Combobox.Input`-style members. */
export interface ComboboxParts {
  /** The input surface: the query input with roving keyboard, typeahead, and the addon's toggle/clear — the chips composition under `multiple`. */
  Input: (props: ComboboxInputProps) => JSX.Element;
  /** The portaled content layer: anchors to the input wrapper, arms Escape + stacked dismissal while open, exits through `animationend`. */
  Content: (props: ComboboxContentProps) => JSX.Element;
  /** The listbox: renders its `items` data-driven (non-matches stay mounted, hidden) with the factory's selection/highlight/commit defaults. */
  List: (props: ComboboxListProps) => JSX.Element;
  /** An option row: follows the factory's selection and active value, commits on click. */
  Item: (props: ComboboxItemProps) => JSX.Element;
  /** Renders when the query matches nothing; the composed paste mounts it with its default text. */
  Empty: (props: ComboboxEmptyProps) => JSX.Element;
  /** A structural group. */
  Group: (props: ComboboxPartProps) => JSX.Element;
  /** A structural label row. */
  Label: (props: ComboboxLabelProps) => JSX.Element;
  /** A structural separator. */
  Separator: (props: ComboboxSeparatorProps) => JSX.Element;
  /** A passthrough wrapper grouping items rendered from external data. */
  Collection: (props: ComboboxPartProps) => JSX.Element;
  /** Renders the joined selection for compositions that show it outside the input. */
  Value: (props: ComboboxValueProps) => JSX.Element;
  /** The clear affordance: wipes the selection and resets the query. */
  Clear: (props: ComboboxClearProps) => JSX.Element;
  /** The multi-select chips wrapper: renders the factory's selected values as chips by default. */
  Chips: (props: ComboboxChipsProps) => JSX.Element;
  /** A selected-value chip with its remove affordance. */
  Chip: (props: ComboboxChipProps) => JSX.Element;
  /** The chips composition's query input, carrying the factory's state and active-descendant wiring. */
  ChipsInput: (props: ComboboxChipsInputProps) => JSX.Element;
  /** The factory's filtered matches — the query-driven option list driving composition rendering. */
  matches: () => ComboboxEntry[];
  /** The factory's open-state getter. */
  open: () => boolean;
  /** Flips the open state; opening lands the active value on the selection or the first enabled match. */
  setOpen: (next: boolean) => void;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type SelectClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface SelectOptions {
  /** Controlled open-state getter; passing it makes the select controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned toggle and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  /** Controlled selected value. When given, the factory never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
}

export interface SelectTriggerProps extends HTMLAttributes<"button"> {
  size?: "sm" | "default";
  /** Resolves the open state for `data-state`/`aria-expanded`; defaults to the factory's state. */
  state?: () => "open" | "closed";
  /** Called on click and on ArrowDown/ArrowUp to request an open toggle; defaults to the factory's toggle. */
  onOpen?: () => void;
  /** Renders the inline clear affordance while a value is selected. */
  clearable?: boolean;
  /** Called when the clear affordance activates; defaults to the factory's reset. */
  onClear?: () => void;
  /** Resolves whether a value is currently selected (drives the clear affordance); defaults to the factory's selection. */
  hasValue?: () => boolean;
  disabled?: boolean;
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

export interface SelectValueProps extends HTMLAttributes<"span"> {
  placeholder?: string;
  /** The chosen label. A string reads statically; an accessor keeps it reactive; an omitted value shows the factory's raw selection (placeholder while empty). */
  value?: HellaChildren | (() => HellaChildren | undefined);
  class?: SelectClass;
}

export interface SelectContentProps extends HTMLAttributes<"div"> {
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to; overrides the factory's trigger. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under `data-state="closed"`; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

export interface SelectPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

export interface SelectItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: HellaChildren;
  disabled?: boolean;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning select; an omitted value follows the factory's selection. */
  selected?: boolean | (() => boolean);
  /** Called on click when the item is enabled; defaults to the factory's commit (select and close). */
  onselect?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

export interface SelectLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

export interface SelectScrollButtonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: SelectClass;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type CommandClass = HellaPrimitive | (string | null | undefined | boolean)[];

/** One selectable entry of a command palette's item list. */
export interface CommandEntry {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface CommandOptions {
  /** The item entries. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. Passing `items` switches the factory to data-driven rendering: `List` renders the ranked body itself. Omitting it registers the rendered `Item` children in DOM order instead. */
  items?: CommandEntry[] | (() => CommandEntry[]);
  /** Replaces the default ranking filter (earlier matches, word-boundary starts, keyword hits). */
  filter?: (items: CommandEntry[], query: string) => CommandEntry[];
  /** Wraps arrow movement at the edges. Default `false` (clamps). */
  loop?: boolean;
  /** Controlled active value. When given, the factory never writes its internal cursor and `onValueChange` reports every requested move and selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
}

export interface CommandInputProps extends HTMLAttributes<"input"> {
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. Defaults to the factory's generated list id. */
  id?: string;
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandGroupProps extends HTMLAttributes<"div"> {
  /** The group's heading row. */
  heading?: string;
  /** Hides the whole group. A boolean reads statically; an accessor keeps it reactive (the ranked body hides groups whose items all score zero). */
  hidden?: boolean | (() => boolean);
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandSeparatorProps extends HTMLAttributes<"div"> {
  class?: CommandClass;
}

export interface CommandItemProps extends HTMLAttributes<"div"> {
  value?: string;
  disabled?: boolean;
  /** Active state. An accessor overrides the factory's active resolution (the shared closure's tracked value). */
  active?: () => boolean;
  /** Called on click and when Enter commits this item through the owning factory. */
  onSelect?: () => void;
  /** The option's stable id; defaults to `<listId>-opt-<value>` from the owning factory. */
  id?: string;
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

export interface CommandDialogProps extends HTMLAttributes<"div"> {
  /** The controlled open-state getter. */
  open: () => boolean;
  /** Called by Escape, an outside press, and the close button. */
  onClose: () => void;
  /** Screen-reader-only title rendered in the dialog header; wires `aria-labelledby`. */
  title?: string;
  /** Screen-reader-only description rendered in the dialog header; wires `aria-describedby`. */
  description?: string;
  children?: HellaChildren | HellaChildren[];
  class?: CommandClass;
}

/** The part set a `command()` factory call returns, composed as `Command.Input`-style members. */
export interface CommandParts {
  /** The search row: icon plus query input carrying the factory's keyboard model (arrows, Home/End, Enter, Escape-clears-query). */
  Input: (props: CommandInputProps) => JSX.Element;
  /** The `role="listbox"`: renders the factory's ranked body when `items` was passed, else the `Item` children you render. */
  List: (props: CommandListProps) => JSX.Element;
  /** The zero-match row; the ranked body mounts it with its default text. */
  Empty: (props: CommandEmptyProps) => JSX.Element;
  /** A structural group with its heading row; `hidden` drops the whole group. */
  Group: (props: CommandGroupProps) => JSX.Element;
  /** A structural separator. */
  Separator: (props: CommandSeparatorProps) => JSX.Element;
  /** A `role="option"` row: follows the factory's active value, registers its `onSelect` for Enter commits, and hides when the query filters it out in DOM-order mode. */
  Item: (props: CommandItemProps) => JSX.Element;
  /** A trailing shortcut hint span. */
  Shortcut: (props: CommandShortcutProps) => JSX.Element;
  /** The palette-in-dialog composition: overlay, portaled `modal()`-wired panel, screen-reader header, close button, and the command surface holding your parts. */
  Dialog: (props: CommandDialogProps) => JSX.Element;
}

/** The part set a `select()` factory call returns, composed as `Select.Trigger`-style members. */
export interface SelectParts {
  /** The trigger button: owns the click and arrow toggles, `data-state`, the listbox aria contract, and the clear affordance. */
  Trigger: (props: SelectTriggerProps) => JSX.Element;
  /** Renders the chosen label; shows the placeholder (with `data-placeholder`) while empty — the factory's raw selection by default. */
  Value: (props: SelectValueProps) => JSX.Element;
  /** The portaled listbox: anchors to the trigger, lands focus on the selected option, arms typeahead + roving + scroll buttons, exits through `animationend`. */
  Content: (props: SelectContentProps) => JSX.Element;
  /** A structural group. */
  Group: (props: SelectPartProps) => JSX.Element;
  /** An option row: follows the factory's selection, commits on click. */
  Item: (props: SelectItemProps) => JSX.Element;
  /** A structural label row. */
  Label: (props: SelectLabelProps) => JSX.Element;
  /** A structural separator. */
  Separator: (props: SelectPartProps) => JSX.Element;
  /** The listbox's repeat-scroll-up affordance (styled by the content's own scroll wiring). */
  ScrollUpButton: (props: SelectScrollButtonProps) => JSX.Element;
  /** The listbox's repeat-scroll-down affordance (styled by the content's own scroll wiring). */
  ScrollDownButton: (props: SelectScrollButtonProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type ToggleClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface ToggleOptions {
  /** Controlled pressed state. Passing it makes the toggle controlled; omitting it keeps state internal. */
  pressed?: boolean | (() => boolean);
  /** Called with every factory-driven flip; a controlled accessor's external change notifies no one. */
  onPressedChange?: (pressed: boolean) => void;
}

export interface ToggleRootProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: ToggleClass;
}

/** The part set a `toggle()` factory call returns, composed as `Toggle.Root`-style members. */
export interface ToggleParts {
  /** The pressed-state button: `aria-pressed`, `data-state`, disabled gating, and the user-click chain. */
  Root: (props: ToggleRootProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type CheckboxClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface CheckboxOptions {
  /** Controlled checked state. Passing it makes the checkbox controlled; omitting it keeps state internal. */
  checked?: boolean | (() => boolean);
  /** Controlled mixed (indeterminate) flag — wins over `checked` for rendering and clears on an uncontrolled toggle. */
  indeterminate?: boolean | (() => boolean);
  /** Called with the requested checked boolean on every factory-driven toggle. */
  onCheckedChange?: (checked: boolean) => void;
}

export interface CheckboxRootProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: CheckboxClass;
}

export interface CheckboxIndicatorProps extends HTMLAttributes<"span"> {
  /** The indicator content; defaults to the check icon. Hidden while unchecked. */
  children?: HellaChildren | HellaChildren[];
  class?: CheckboxClass;
}

/** The part set a `checkbox()` factory call returns, composed as `Check.Root`-style members. */
export interface CheckboxParts {
  /** The checked-state button: `role="checkbox"`, tri-state `aria-checked`, `data-state`, disabled gating, and the user-click chain. */
  Root: (props: CheckboxRootProps) => JSX.Element;
  /** The indicator span inside `Root`: renders the check icon by default, hidden while unchecked. */
  Indicator: (props: CheckboxIndicatorProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type SwitchClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface SwitchOptions {
  /** Controlled checked state. Passing it makes the switch controlled; omitting it keeps state internal. */
  checked?: boolean | (() => boolean);
  /** Called with every factory-driven flip; a controlled accessor's external change notifies no one. */
  onCheckedChange?: (checked: boolean) => void;
}

export interface SwitchRootProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: SwitchClass;
}

export interface SwitchIndicatorProps extends HTMLAttributes<"span"> {
  class?: SwitchClass;
}

/** The part set a `toggleSwitch()` factory call returns, composed as `Switch.Root`-style members. */
export interface SwitchParts {
  /** The checked-state button: `role="switch"`, `aria-checked`, `data-state`, disabled gating, and the user-click chain. */
  Root: (props: SwitchRootProps) => JSX.Element;
  /** The moving thumb span inside `Root`, tracking `data-state`. */
  Indicator: (props: SwitchIndicatorProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type ToggleGroupClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface ToggleGroupOptions {
  /** Independent membership toggles when set; single-value exclusion (activating the active value deselects it) otherwise. */
  multiple?: boolean;
  /** Controlled single-mode value. */
  value?: () => string;
  /** Controlled multiple-mode values. */
  values?: () => string[];
  /** Seeds the uncontrolled single-mode selection. Default `""`. */
  defaultValue?: string;
  /** Seeds the uncontrolled multiple-mode membership. Default empty. */
  defaultValues?: string[];
  /** Single reports the newly active value (`""` when deselected); multiple reports the full active array. */
  onValueChange?: (value: string | string[]) => void;
}

export interface ToggleGroupRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ToggleGroupClass;
}

export interface ToggleGroupItemProps extends HTMLAttributes<"button"> {
  value?: string;
  /** Pressed-state override for manual composition; defaults to the factory's group state. A boolean reads statically; an accessor keeps it reactive. */
  pressed?: boolean | (() => boolean);
  /** Called on click when enabled; defaults to the factory's exclusion toggle. */
  onSelect?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: ToggleGroupClass;
}

/** The part set a `toggleGroup()` factory call returns, composed as `Group.Root`-style members. */
export interface ToggleGroupParts {
  /** The `role="group"` container: arms arrow-key roving over the items and disposes it on unmount. */
  Root: (props: ToggleGroupRootProps) => JSX.Element;
  /** A pressed-state item button: defaults its state and click action from the group. */
  Item: (props: ToggleGroupItemProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type RadioGroupClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface RadioGroupOptions {
  /** Controlled selected value. When given, the factory never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  /** Renders `aria-orientation` and scopes the arrow-key axis; unset means both axes move focus. */
  orientation?: "horizontal" | "vertical";
  /** Threads onto every rendered item button's `name` attribute. */
  name?: string;
  /** Called with every factory-driven selection; radios never unset, so re-selecting the active value notifies no one. */
  onValueChange?: (value: string) => void;
}

export interface RadioGroupRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: RadioGroupClass;
}

export interface RadioGroupItemProps extends HTMLAttributes<"button"> {
  value?: string;
  /** Checked-state override for manual composition; defaults to the factory's group state. A boolean reads statically; an accessor keeps it reactive. */
  checked?: boolean | (() => boolean);
  /** Called on click; defaults to the factory's exclusive selection. */
  onSelect?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: RadioGroupClass;
}

export interface RadioGroupIndicatorProps extends HTMLAttributes<"span"> {
  /** The owning item's value, resolving the factory's group state; pair with `checked` when overriding. */
  value?: string;
  /** Checked-state override mirroring the owning `Item`'s; defaults to the factory's group state for `value`. */
  checked?: boolean | (() => boolean);
  /** The indicator content; defaults to the selection dot. Hidden while unchecked. */
  children?: HellaChildren | HellaChildren[];
  class?: RadioGroupClass;
}

/** The part set a `radioGroup()` factory call returns, composed as `Radio.Root`-style members. */
export interface RadioGroupParts {
  /** The `role="radiogroup"` container: arms arrow-key roving (arrows move and select), lands the tabindex on the selection, and disposes on unmount. */
  Root: (props: RadioGroupRootProps) => JSX.Element;
  /** A `role="radio"` item button: defaults its state and click action from the group. */
  Item: (props: RadioGroupItemProps) => JSX.Element;
  /** The selection-dot span inside `Item`: renders the dot by default, hidden while unchecked. */
  Indicator: (props: RadioGroupIndicatorProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type TabsClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface TabsOptions {
  /** Controlled active value. When given, the factory never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  /** Seeds the uncontrolled active value. Default `""` (the tabindex walk lands the first trigger). */
  defaultValue?: string;
  /** Scopes the arrow-key axis and renders the orientation attributes; unset means both axes move focus. */
  orientation?: "horizontal" | "vertical";
  /** Called with every factory-driven selection; re-selecting the active value notifies no one. */
  onValueChange?: (value: string) => void;
}

export interface TabsListProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: TabsClass;
}

export interface TabsTriggerProps extends HTMLAttributes<"button"> {
  /** The tab's value; keys the `hella-tabs-tab-<value>` id and the factory's active state. */
  value?: string;
  /** Selected-state override for manual composition; defaults to the factory's active value. A boolean reads statically; an accessor keeps it reactive. */
  active?: boolean | (() => boolean);
  /** Called on click when enabled; defaults to the factory's selection. */
  onActivate?: () => void;
  children?: HellaChildren | HellaChildren[];
  class?: TabsClass;
}

export interface TabsContentProps extends HTMLAttributes<"div"> {
  /** The panel's value; keys the `hella-tabs-panel-<value>` id and the factory's visibility. */
  value?: string;
  /** Visibility override mirroring the owning `Trigger`'s; defaults to the factory's active value for `value`. */
  active?: boolean | (() => boolean);
  children?: HellaChildren | HellaChildren[];
  class?: TabsClass;
}

/** The part set a `tabs()` factory call returns, composed as `Tabs.List`-style members. */
export interface TabsParts {
  /** The `role="tablist"` container: arms arrow-key roving (focusing a trigger selects it), lands the tabindex on the selection, and disposes on unmount. */
  List: (props: TabsListProps) => JSX.Element;
  /** A `role="tab"` trigger button: defaults its selected state and click action from the factory. */
  Trigger: (props: TabsTriggerProps) => JSX.Element;
  /** The `role="tabpanel"` panel for a value: hidden while inactive, `aria-labelledby` the owning trigger. */
  Content: (props: TabsContentProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type SliderClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface SliderOptions {
  /** The thumb values. A static array seeds the internal signal; an accessor makes the slider controlled, so writes report through `onValueChange` only. */
  value?: number[] | (() => number[]);
  /** Called with every accepted move: drag steps and keyboard steps alike. */
  onValueChange?: (value: number[]) => void;
  /** Fired when an interaction ends: drag release and each accepted keyboard change. */
  onValueCommit?: (value: number[]) => void;
  /** The range minimum. Default `0`. */
  min?: number;
  /** The range maximum. Default `100`. */
  max?: number;
  /** The step increment; its decimals set the rounding precision. Default `1`. */
  step?: number;
  /** Renders and scopes the axis. Default `"horizontal"`. */
  orientation?: "horizontal" | "vertical";
  /** Minimum number of steps enforced between neighboring thumbs. Default `0`. */
  minStepsBetweenThumbs?: number;
  /** Blocks drags and keys; renders `data-disabled` on the root and `aria-disabled` + `tabindex="-1"` on thumbs. */
  disabled?: boolean;
}

export interface SliderRootProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: SliderClass;
}

export interface SliderTrackProps extends HTMLAttributes<"span"> {
  children?: HellaChildren | HellaChildren[];
  class?: SliderClass;
}

export interface SliderRangeProps extends HTMLAttributes<"span"> {
  class?: SliderClass;
}

export interface SliderThumbProps extends HTMLAttributes<"span"> {
  /** The thumb's position in the value array. */
  index: number;
  class?: SliderClass;
}

/** The part set a `slider()` factory call returns, composed as `Slider.Root`-style members. */
export interface SliderParts {
  /** The slider root: owns the value state and the pointer drag (nearest thumb, stepped track mapping), rendering the range attributes; disposes the drag on unmount. */
  Root: (props: SliderRootProps) => JSX.Element;
  /** The rail span the drag geometry measures; `Range` mounts inside it. */
  Track: (props: SliderTrackProps) => JSX.Element;
  /** The filled span between the outermost thumb values; its position styles are factory-owned. */
  Range: (props: SliderRangeProps) => JSX.Element;
  /** A `role="slider"` thumb: focusable, arrow/Page/Home/End stepping, `aria-valuemin/max/now`, factory-owned position styles. */
  Thumb: (props: SliderThumbProps) => JSX.Element;
}

/** Semantic toast flavor; a toast without one renders `data-type="default"` with no icon. */
export type ToastType = "success" | "error" | "warning" | "info";

/** Everything the toast li renders, including the promise-loading flavor. */
export type ToastVariant = ToastType | "loading" | "default";

/** Edge the toast stack pins to. */
export type ToasterPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type ToastClass = HellaPrimitive | (string | null | undefined | boolean)[];

/** Per-toast options: secondary line, a tinted icon flavor, an action button, and the auto-dismiss budget. */
export interface ToastOptions {
  description?: string;
  type?: ToastType;
  action?: { label: string; onclick: () => void };
  /** Milliseconds before auto-dismiss; defaults to 4000. Hover pauses the countdown; `Infinity` sticks. */
  duration?: number;
}

/** Queue handle returned by every toast call. */
export interface ToastHandle {
  id: number;
  dismiss(): void;
}

/** One toast's rendered state; `removed` starts the exit collapse. */
export interface ToastData {
  id: number;
  message: string;
  description?: string;
  type: ToastVariant;
  action?: { label: string; onclick: () => void };
  duration: number;
  removed: boolean;
}

/** Queue entry: stable identity for keyed reconciliation plus a signal so in-place updates re-render the li. */
export interface ToastRecord {
  id: number;
  data: Signal<ToastData>;
}

/** Live countdown per toast: the timeout handle plus the remaining budget when hover has paused it. */
export interface ToastTimer {
  timeout?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
}

/** Per-phase messages for `toast.promise`; either phase accepts a plain string or a function of the settled value. */
export interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
  duration?: number;
}

/** Toast queue API: `toast(message, options)`, `toast.promise(...)`, and `toast.dismiss(...)`. */
export interface ToastApi {
  (message: string, options?: ToastOptions): ToastHandle;
  /** Sticky loading toast that swaps to the success (or error) flavor and message when the promise settles. */
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): ToastHandle;
  /** Retires one toast by id, or every toast when called without one. */
  dismiss(id?: number): void;
}

/** One stacked toast card: the behavior-bearing `li`; children replace the default semantic content. */
export interface ToastItemProps extends HTMLAttributes<"li"> {
  record: ToastRecord;
  /** Tints the whole card per flavor (sonner's richColors); icons are tinted either way. */
  richColors?: boolean;
  children?: HellaChildren | HellaChildren[];
  class?: ToastClass;
}

/** The portaled toast stack; children replace the default card with a render function over the queue record. */
export interface ToasterProps extends HTMLAttributes<"ol"> {
  position?: ToasterPosition;
  /** Tints the whole card per flavor (sonner's richColors); icons are tinted either way. */
  richColors?: boolean;
  children?: (record: ToastRecord) => HellaChild;
  class?: ToastClass;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type CalendarClass = HellaPrimitive | (string | null | undefined | boolean)[];

/** Selection mode: one date, a set of dates, or a from/to span. */
export type CalendarMode = "single" | "multiple" | "range";

/** Range selection shape; `from` without `to` is the dangling first click. */
export interface CalendarRange {
  from?: Date;
  to?: Date;
}

/** Selected shape per mode: single → `Date`, multiple → `Date[]`, range → `CalendarRange`. */
export type CalendarSelection = Date | Date[] | CalendarRange | undefined;

/** One grid day: `key` is the stable ISO identity used for focus, selection, and range math. */
export interface CalendarCell {
  key: string;
  date: Date;
  outside: boolean;
  today: boolean;
  disabled: boolean;
}

export interface CalendarOptions {
  /** Selection behavior; defaults to `"single"`. */
  mode?: CalendarMode;
  /** The selection in the mode's shape: a static value seeds the internal signal; an accessor makes it controlled, so writes report through `onValueChange` only. */
  value?: CalendarSelection | (() => CalendarSelection);
  /** Called with every accepted selection (defensive copies, in the mode's shape). */
  onValueChange?: (value: CalendarSelection) => void;
  /** Controlled visible-month accessor; when provided it snaps the view back on every change, winning over internal navigation. */
  month?: () => Date;
  /** Called with the new anchor after every month navigation — the buttons and spill-causing keys alike. */
  onMonthChange?: (anchor: Date) => void;
  /** Initial visible month; defaults to the current month. */
  defaultMonth?: Date;
  /** Predicate blocking selection and keyboard activation; outside days are always disabled. */
  disabled?: (date: Date) => boolean;
  /** Renders leading/trailing adjacent-month days; defaults to `true`. */
  showOutsideDays?: boolean;
  /** Always renders six week rows so month-to-month navigation never resizes the grid. */
  fixedWeeks?: boolean;
  /** First day of the week; `0` = Sunday (default) through `6` = Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface CalendarRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

export interface CalendarMonthsProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

export interface CalendarMonthProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

export interface CalendarCaptionProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

/** The live caption label: renders the visible month's `"March 2025"` label from the factory's view state. */
export interface CalendarCaptionLabelProps extends HTMLAttributes<"div"> {
  class?: CalendarClass;
}

export interface CalendarNavProps extends HTMLAttributes<"nav"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

/** Shared by both navigation buttons: each pages the month one step and renders its `aria-label`; children replace the icon slot. */
export interface CalendarNavButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: CalendarClass;
}

/** The full `role="grid"` table rendered from the factory's view model: the weekday header, the week rows, and the day cells with their aria semantics; owns the keyboard model. */
export interface CalendarGridProps extends HTMLAttributes<"table"> {
  /** The weekday header row's class hook (the `weekdays` slot); composes with the wrapper's style class. */
  weekdaysClass?: CalendarClass;
  /** Each weekday header cell's class hook (the `weekday` slot); composes with the wrapper's style class. */
  weekdayClass?: CalendarClass;
  /** Each week row's class hook (the `week` slot); composes with the wrapper's style class. */
  weekClass?: CalendarClass;
  /** Each day cell's class hook (the `day` slot); composes with the wrapper's style class. */
  dayClass?: CalendarClass;
  /** Each day button's class hook (the `day_button` slot); composes with the wrapper's style class. */
  dayButtonClass?: CalendarClass;
  class?: CalendarClass;
}

/** The manual-composition day part: state flags take plain booleans or reactive accessors, so a composed calendar drives them live while a standalone call passes static values. */
export interface CalendarDayButtonProps extends HTMLAttributes<"button"> {
  /** The day this button renders; also emitted as `data-day` (locale string). */
  day: Date;
  /** Reactive-capable selected flag; renders `data-selected-single` when the day is selected outside a range span. */
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  /** Reactive-capable disabled flag; renders `aria-disabled`. */
  disabled?: boolean | (() => boolean);
  /** Reactive-capable roving-focus flag; drives `tabindex` 0/-1. */
  focused?: boolean | (() => boolean);
  /** Marks the day as today with `aria-current="date"`. */
  today?: boolean;
  class?: CalendarClass;
}

/** The part set a `calendar()` factory call returns, composed as `Cal.Root`-style members. */
export interface CalendarParts {
  /** The calendar root container. */
  Root: (props: CalendarRootProps) => JSX.Element;
  /** The months wrapper around every rendered month column. */
  Months: (props: CalendarMonthsProps) => JSX.Element;
  /** One month column: composes the caption, the nav, and the grid. */
  Month: (props: CalendarMonthProps) => JSX.Element;
  /** The caption row wrapping the live month label. */
  Caption: (props: CalendarCaptionProps) => JSX.Element;
  /** The `aria-live` caption label rendering the visible month's `"March 2025"` text. */
  CaptionLabel: (props: CalendarCaptionLabelProps) => JSX.Element;
  /** The navigation bar wrapping the previous/next buttons. */
  Nav: (props: CalendarNavProps) => JSX.Element;
  /** Pages the visible month one step back; children replace the icon slot. */
  PrevButton: (props: CalendarNavButtonProps) => JSX.Element;
  /** Pages the visible month one step forward; children replace the icon slot. */
  NextButton: (props: CalendarNavButtonProps) => JSX.Element;
  /** The `role="grid"` table rendered from the factory's view model, with the keyboard model wired on it. */
  Grid: (props: CalendarGridProps) => JSX.Element;
  /** The manual-composition day button carrying the aria semantics; the grid renders one per cell. */
  DayButton: (props: CalendarDayButtonProps) => JSX.Element;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type InputOtpClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface InputOtpOptions {
  /** Number of slots; fixed after mount. Default `6`. */
  maxLength?: number;
  /** The code. A static string seeds the internal state; an accessor makes it controlled, so edits report through `onValueChange` only. */
  value?: string | (() => string);
  /** Reports every accepted value change (typing, paste, deletion). */
  onValueChange?: (value: string) => void;
  /** Fires once per transition to a full code. */
  onComplete?: (value: string) => void;
  /** Optional regex mask; a candidate the pattern rejects is never accepted. */
  pattern?: string;
  /** Focuses the hidden control input on mount. */
  autofocus?: boolean;
  /** Blocks editing and drops the root's text cursor. */
  disabled?: boolean;
}

export interface InputOtpRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: InputOtpClass;
  /** The transparent control input's class; the wrapper composes its hiding and selection styling here. */
  inputClass?: InputOtpClass;
}

export interface InputOtpGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: InputOtpClass;
}

export interface InputOtpSlotProps extends HTMLAttributes<"div"> {
  /** Slot position this mirror renders; the root wires its character and caret state after mount. */
  index: number;
  children?: HellaChildren | HellaChildren[];
  class?: InputOtpClass;
  /** The caret box div's class; the root toggles its visibility while the slot is active and empty. */
  caretWrapClass?: InputOtpClass;
  /** The blinking caret bar's class inside the caret box. */
  caretClass?: InputOtpClass;
}

export interface InputOtpSeparatorProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: InputOtpClass;
}

/** The part set an `inputOtp()` factory call returns, composed as `Otp.Root`-style members. */
export interface InputOtpParts {
  /** The relative root hosting the transparent control input; wires every `Slot`'s character, ring, and caret after mount. */
  Root: (props: InputOtpRootProps) => JSX.Element;
  /** The slot-grouping container. */
  Group: (props: InputOtpGroupProps) => JSX.Element;
  /** One display slot: the root mirrors its character and active/caret state into it. */
  Slot: (props: InputOtpSlotProps) => JSX.Element;
  /** The `role="separator"` divider rendering the default minus icon. */
  Separator: (props: InputOtpSeparatorProps) => JSX.Element;
}

/** Per-field validator: receives the field value and the full values snapshot, returns the error message or null when the value is clean. */
export type FormValidator<T> = (value: T[keyof T], values: T) => string | null;

/** Options bag for createForm. */
export interface FormOptions<T> {
  /** Per-field validators; a field without one is always clean. */
  validators?: Partial<Record<keyof T, FormValidator<T>>>;
}

/** Signals controller createForm returns; the form parts read it through explicit props (no context). */
export interface FormController<T extends object> {
  /** One writable signal per field. */
  values: { [K in keyof T]: Signal<T[K]> };
  /** Current validation messages keyed by field. */
  errors: Signal<Partial<Record<keyof T, string>>>;
  /** Fields that have blurred or been submitted. */
  touched: Signal<Partial<Record<keyof T, boolean>>>;
  /** True while any field differs from its initial value. */
  dirty: Signal<boolean>;
  /** Writes the field value, retracks dirty, and revalidates the field when it is already touched. */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Marks the field touched and validates it. */
  blur: (key: keyof T) => void;
  /** Validates every field; returns true when no messages remain. */
  validate: () => boolean;
  /** Restores every field to its initial value and clears errors, touched, and dirty. */
  reset: () => void;
  /** Validates all and marks all touched; calls onValid with the values only when clean. The optional event is preventDefaulted. */
  handleSubmit: (onValid: (values: T) => void) => (e?: Event) => void;
}

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type FormClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface FormItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: FormClass;
  /** Error flag; renders data-error="true"/"false" as the container-level hook for the error state. */
  error?: boolean | (() => boolean);
}

export interface FormLabelProps extends HTMLAttributes<"label"> {
  children?: HellaChildren | HellaChildren[];
  class?: FormClass;
  /** Error flag; renders data-error="true"/"false", aria-invalid, and the destructive text hook. */
  error?: boolean | (() => boolean);
}

export interface FormControlProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: FormClass;
  /** Error flag; renders aria-invalid="true" on the passthrough wrapper. */
  invalid?: boolean | (() => boolean);
  /** aria-describedby target, typically the FormDescription or FormMessage id. */
  describedBy?: string;
}

export interface FormDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren | HellaChildren[];
  class?: FormClass;
}

export interface FormMessageProps extends HTMLAttributes<"p"> {
  children?: HellaChildren | HellaChildren[];
  class?: FormClass;
  /** Error messages; the first one renders. An accessor re-evaluates as validation runs. */
  errors?: string[] | (() => string[] | undefined);
}

/** Injectable content watcher returning its own dispose; defaults to a ResizeObserver on the viewport's content. */
export type ScrollAreaObserve = (target: Element, onGrow: () => void) => () => void;

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type ScrollAreaClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface ScrollAreaOptions {
  /** Injectable content watcher forwarded to every `Scrollbar` without its own `observe` prop. */
  observe?: ScrollAreaObserve;
}

export interface ScrollAreaRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ScrollAreaClass;
}

export interface ScrollAreaViewportProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ScrollAreaClass;
}

export interface ScrollAreaScrollbarProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: ScrollAreaClass;
  /** Axis the bar tracks and drags; both orientations may compose into one root. Default `"vertical"`. */
  orientation?: "vertical" | "horizontal";
  /** Injectable content watcher replacing the factory's, for a bar composed standalone. */
  observe?: ScrollAreaObserve;
}

export interface ScrollAreaThumbProps extends HTMLAttributes<"div"> {
  class?: ScrollAreaClass;
}

/** The part set a `scrollArea()` factory call returns, composed as `Area.Root`-style members. */
export interface ScrollAreaParts {
  /** The relative root container the scrollbar anchors to. */
  Root: (props: ScrollAreaRootProps) => JSX.Element;
  /** The native-scroll viewport; renders its content wrapper around the children. */
  Viewport: (props: ScrollAreaViewportProps) => JSX.Element;
  /** The scrollbar: measures the paired viewport, sizes and positions the `Thumb` inside it, and arms the thumb drag. */
  Scrollbar: (props: ScrollAreaScrollbarProps) => JSX.Element;
  /** The draggable thumb; its geometry styles are wiring-owned. */
  Thumb: (props: ScrollAreaThumbProps) => JSX.Element;
}

/** Injectable content watcher returning its own dispose; defaults to a ResizeObserver on the viewport's content. */
export type MessageScrollerObserve = (target: Element, onGrow: () => void) => () => void;

/** Class values follow the element attribute map: primitives or class arrays (composed by the wrapper). */
export type MessageScrollerClass = HellaPrimitive | (string | null | undefined | boolean)[];

export interface MessageScrollerOptions {
  /** Shared at-bottom state; the viewport flips it and the button reads it. The factory owns an internal signal seeded `true` when omitted. */
  atBottom?: Signal<boolean>;
  /** Overrides the scroll-to-bottom action used for auto-stick and the jump button. */
  scrollToBottom?: () => void;
  /** Distance in px from the bottom still counted as at-bottom. Default `80`. */
  threshold?: number;
  /** Injectable content watcher arming growth tracking on the viewport's content. */
  observe?: MessageScrollerObserve;
}

export interface MessageScrollerProviderProps {
  children?: HellaChildren | HellaChildren[];
}

export interface MessageScrollerRootProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MessageScrollerClass;
}

export interface MessageScrollerViewportProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MessageScrollerClass;
}

export interface MessageScrollerContentProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MessageScrollerClass;
}

export interface MessageScrollerItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren | HellaChildren[];
  class?: MessageScrollerClass;
}

export interface MessageScrollerButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren | HellaChildren[];
  class?: MessageScrollerClass;
  /** Which end the button jumps to; drives `data-direction`, `data-active`, and the default label. Default `"end"`. */
  direction?: "start" | "end";
  /** Button variant token rendered as `data-variant`. Default `"secondary"`. */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Button size token rendered as `data-size`. Default `"icon-sm"`. */
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

/** The part set a `messageScroller()` factory call returns, composed as `Scroller.Root`-style members. */
export interface MessageScrollerParts {
  /** Passthrough grouping wrapper kept for upstream parity; holds no state. */
  Provider: (props: MessageScrollerProviderProps) => JSX.Element;
  /** The relative root container. */
  Root: (props: MessageScrollerRootProps) => JSX.Element;
  /** The scrolling viewport: flips at-bottom on scroll, sticks on growth while at-bottom, and renders children directly. */
  Viewport: (props: MessageScrollerViewportProps) => JSX.Element;
  /** The content stack inside the viewport. */
  Content: (props: MessageScrollerContentProps) => JSX.Element;
  /** A message row sized for content-visibility rendering. */
  Item: (props: MessageScrollerItemProps) => JSX.Element;
  /** The jump button: `data-active` from at-bottom, click jumps to the bottom after chaining a user `on:click`. */
  Button: (props: MessageScrollerButtonProps) => JSX.Element;
}
