import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AnchorSide = "top" | "bottom" | "left" | "right";

export type AnchorAlign = "start" | "center" | "end";

export interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface ComboboxValueProps extends HTMLAttributes<"span"> {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", ". */
  value?: string | string[] | (() => string | string[] | undefined);
  class?: string;
}

export interface ComboboxTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxClearProps extends HTMLAttributes<"button"> {
  /** Called on click; the composed Combobox wipes the selection. */
  onClear?: () => void;
  class?: string;
}

export interface ComboboxGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxCollectionProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export interface ComboboxItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: string;
  disabled?: boolean;
  id?: string;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning combobox. */
  selected?: boolean | (() => boolean);
  /** Highlighted state (the ref's data-highlighted ring); an accessor follows the active option. */
  highlighted?: boolean | (() => boolean);
  /** Hides the item (filtered out); a reactive accessor keeps it live against the query. */
  hidden?: () => boolean;
  /** Called on click when the item is enabled; the composed Combobox commits the selection. */
  onselect?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. */
  id?: string;
  /** Data-driven items; a plain array reads once at mount, an accessor re-renders the list as it changes. The query keeps rows mounted and toggles their visibility. */
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection and highlight state survive); order always follows the array. */
  keyBy?: "value";
  /** Resolves the live query driving the filter. */
  query?: () => string;
  /** Replaces the default case-insensitive substring filter. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Resolves whether a value is selected (aria-selected, data-state, check icon). */
  selected?: (value: string) => boolean;
  /** Resolves the highlighted value (data-highlighted, the aria-activedescendant target). */
  active?: () => string | undefined;
  /** Called on item click with the item value; the composed Combobox commits the selection. */
  onselect?: (value: string) => void;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxChipsProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Reactive chips; a thunk so the selected-values map stays a single reactive child (nested function children stringify). */
  chips?: () => HellaChildren;
  /** Wired, not spread: renders data-disabled and gates the chip remove buttons. */
  disabled?: boolean;
  class?: string;
}

export interface ComboboxChipProps extends HTMLAttributes<"div"> {
  value?: string;
  /** Wired, not spread: renders data-disabled and gates the remove button. */
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  onRemove?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxChipsInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  class?: string;
}

export interface ComboboxContentProps extends HTMLAttributes<"div"> {
  id?: string;
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to (the input wrapper); positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Sets data-chips="true" (chips-composition width styling). */
  chips?: boolean;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface ComboboxProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}
