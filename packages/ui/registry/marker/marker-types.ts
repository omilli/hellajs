import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface MarkerProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
}

export interface MarkerIconProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export interface MarkerContentProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}
