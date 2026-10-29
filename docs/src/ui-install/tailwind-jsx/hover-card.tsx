import { hoverCard } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface HoverCardTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface HoverCardContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When both are given, hovering the content re-arms the open state with zero delays (keep-open). */
  onOpen?: () => void;
  onClose?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface HoverCardProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
import { cn } from "./cn.js";

/** The manual trigger span; the composed HoverCard renders the same shape wired to the hover timings. */
export function HoverCardTrigger({
  children,
  class: cls,
  ...attrs
}: HoverCardTriggerProps): JSX.Element {
  const { Trigger } = hoverCard();
  return (
    <Trigger
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

export function HoverCardContent({
  state,
  side,
  align,
  anchor,
  onOpen,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: HoverCardContentProps): JSX.Element {
  const { Content } = hoverCard({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (next) onOpen?.();
      else onClose?.();
    },
  });
  return (
    <Content
      side={side}
      align={align}
      anchor={anchor}
      onExited={onExited}
      class={
        cn("z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function HoverCard({
  open,
  onOpenChange,
  children,
  content: contentSlot,
  class: cls,
  ...attrs
}: HoverCardProps): JSX.Element {
  const { Trigger, Content } = hoverCard({ open, onOpenChange });
  return (
    <Trigger
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
      <Content>{contentSlot}</Content>
    </Trigger>
  );
}
