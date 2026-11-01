import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type SheetSide = "top" | "right" | "bottom" | "left";

export interface SheetPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface SheetTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export interface SheetDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface SheetProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  side?: SheetSide;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}
