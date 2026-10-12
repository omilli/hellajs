import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface InputGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Renders data-disabled="true" on the group; addons read it for their opacity state. */
  disabled?: boolean;
  class?: string;
}

export interface InputGroupAddonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
}

export interface InputGroupButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
}

export interface InputGroupTextProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export interface InputGroupInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export interface InputGroupTextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}
