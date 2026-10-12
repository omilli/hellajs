import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface EmptyMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon";
}
