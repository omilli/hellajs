import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

export interface DropdownMenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface DropdownMenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export interface DropdownMenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

export interface DropdownMenuRadioGroupProps extends HTMLAttributes<"div"> {
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

export interface DropdownMenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

export interface DropdownMenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export interface DropdownMenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export interface DropdownMenuSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export interface DropdownMenuProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}
