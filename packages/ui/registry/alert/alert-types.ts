import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface AlertProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive";
}

export interface AlertPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
