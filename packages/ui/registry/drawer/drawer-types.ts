import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type DrawerDirection = "top" | "right" | "bottom" | "left";

export interface DrawerPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export interface DrawerProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  direction?: DrawerDirection;
  title?: string;
  description?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}
