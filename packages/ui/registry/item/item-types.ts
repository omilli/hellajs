import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface ItemGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export interface ItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
}

export interface ItemMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
}

export interface ItemContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ItemFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
