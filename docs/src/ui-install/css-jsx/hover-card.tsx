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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style("hover-card-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "1rem",
  transformOrigin: "var(--radix-hover-card-content-transform-origin)",
  width: "16rem",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
});

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
        [cls]
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
        [content, cls]
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
        [cls]
      }
      {...attrs}
    >
      {children}
      <Content>{contentSlot}</Content>
    </Trigger>
  );
}
