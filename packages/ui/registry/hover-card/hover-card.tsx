import { hoverCard } from "@hellajs/headless";
import type {
  HoverCardTriggerProps,
  HoverCardContentProps,
  HoverCardProps,
} from "./hover-card-types.js";

// @hella:styles
declare const content: string;
// @hella:end

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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [content, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <Content>{contentSlot}</Content>
    </Trigger>
  );
}
