import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AnchorSide = "top" | "bottom" | "left" | "right";

export type AnchorAlign = "start" | "center" | "end";

export interface SelectEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

export interface SelectTriggerProps extends HTMLAttributes<"button"> {
  size?: "sm" | "default";
  /** Resolves the open state for `data-state`/`aria-expanded`; the composed Select wires it. */
  state?: () => "open" | "closed";
  /** Called on click and on ArrowDown/ArrowUp to request an open toggle. */
  onOpen?: () => void;
  /** Renders an inline clear affordance while `hasValue` resolves truthy. */
  clearable?: boolean;
  /** Called when the clear affordance activates; the composed Select resets the value. */
  onClear?: () => void;
  /** Resolves whether a value is currently selected (drives the clear affordance). */
  hasValue?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

export interface SelectValueProps extends HTMLAttributes<"span"> {
  placeholder?: string;
  /** The chosen label. A string reads statically; an accessor keeps it reactive (the composed Select threads one). Manual wiring passes the current label. */
  value?: HellaChildren | (() => HellaChildren | undefined);
  class?: string;
}

export interface SelectContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** Called by the listbox keyboard model to close (Tab); the composed Select wires it. */
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface SelectPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface SelectItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: HellaChildren;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning select. */
  selected?: boolean | (() => boolean);
  /** Called on click when the item is enabled; the composed Select commits the value. */
  onselect?: () => void;
  class?: string;
}

export interface SelectLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface SelectScrollButtonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface SelectProps extends HTMLAttributes<"button"> {
  items?: SelectEntry[] | (() => SelectEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  /** Renders the trigger's clear affordance while a value is selected. */
  clearable?: boolean;
  class?: string;
}
