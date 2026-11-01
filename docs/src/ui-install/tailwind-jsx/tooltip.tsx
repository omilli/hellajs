import { tooltip } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface TooltipProps extends HTMLAttributes<"span"> {
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
import { cn } from "./cn.js";

export function Tooltip({
  content: contentSlot,
  delayDuration,
  open,
  onOpenChange,
  side,
  align,
  children,
  class: cls,
  ...attrs
}: TooltipProps): JSX.Element {
  const { Trigger, Content } = tooltip({ delay: delayDuration, open, onOpenChange });
  return (
    <Trigger
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
      <Content
        side={side}
        align={align}
        class={
          cn("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95")
        }
      >
        {contentSlot}
      </Content>
    </Trigger>
  );
}
