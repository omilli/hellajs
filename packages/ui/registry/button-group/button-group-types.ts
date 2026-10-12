import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface ButtonGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export interface ButtonGroupTextProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface ButtonGroupSeparatorProps extends HTMLAttributes<"div"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}
