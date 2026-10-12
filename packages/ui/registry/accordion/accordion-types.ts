import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface AccordionEntry {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

export interface AccordionProps extends HTMLAttributes<"div"> {
  class?: string;
  items: AccordionEntry[];
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
