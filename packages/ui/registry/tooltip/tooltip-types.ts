import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AnchorSide = "top" | "bottom" | "left" | "right";

export type AnchorAlign = "start" | "center" | "end";

export interface TooltipProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  /** Pointer-hover ms before the content opens. Default 700. */
  delayDuration?: number;
  /** Controlled open-state getter; passing it makes the tooltip controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned hover and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  side?: AnchorSide;
  align?: AnchorAlign;
  children?: HellaChildren;
  class?: string;
}
