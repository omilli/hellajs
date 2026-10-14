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
  /** Open values on mount; a single string or a list for `multiple`. */
  open?: string | string[];
}

export interface AccordionItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  value: string;
  active?: () => boolean;
}

export interface AccordionTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
}

export interface AccordionContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
}
