import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface AccordionEntry {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

export interface AccordionProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered sections. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items: AccordionEntry[] | (() => AccordionEntry[]);
  /** Reuses item DOM through reorders by `value` identity (open state survives); order always follows the array. */
  keyBy?: "value";
  /** `single` keeps at most one item open (`collapsible` gates the last close); `multiple` toggles freely. */
  type?: "single" | "multiple";
  collapsible?: boolean;
  /** Seeds the uncontrolled open values; a single string opens that item, a list opens each. */
  defaultValue?: string | string[];
  /** Controlled open values. When given, the root never writes its internal state and `onValueChange` reports the requested change; a lone string reads as the one open value. */
  value?: () => string | string[];
  /** Called with every root-driven change: single mode reports the one open value (`""` when none), multiple mode reports the membership array. */
  onValueChange?: (value: string | string[]) => void;
}
