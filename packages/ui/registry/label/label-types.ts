import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface LabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}
