import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface BubbleGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface BubbleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
}

export interface BubbleContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface BubbleReactionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  side?: "top" | "bottom";
  align?: "start" | "end";
}
