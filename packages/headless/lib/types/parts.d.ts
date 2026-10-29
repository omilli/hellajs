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
