import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface SeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}
