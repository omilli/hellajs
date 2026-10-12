import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
