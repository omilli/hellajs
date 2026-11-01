import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface MessageScrollerItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface MessageScrollerProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  threshold?: number;
  observe?: (target: Element, onGrow: () => void) => () => void;
  showScrollButton?: boolean;
}
