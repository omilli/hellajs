import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface PopoverProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the trigger element. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
