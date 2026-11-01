import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface HoverCardProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
