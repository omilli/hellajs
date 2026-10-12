import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AnchorSide = "top" | "bottom" | "left" | "right";

export type AnchorAlign = "start" | "center" | "end";

export interface TooltipProviderProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface TooltipTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export interface TooltipContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface TooltipProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  /** Pointer-hover ms before the content opens. Default 700. */
  delayDuration?: number;
  side?: AnchorSide;
  align?: AnchorAlign;
  children?: HellaChildren;
  class?: string;
}
