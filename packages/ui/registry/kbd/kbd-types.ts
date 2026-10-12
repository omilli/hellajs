import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface KbdProps extends HTMLAttributes<"kbd"> {
  class?: string;
  children?: HellaChildren;
}
