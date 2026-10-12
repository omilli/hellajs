import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface BadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}
