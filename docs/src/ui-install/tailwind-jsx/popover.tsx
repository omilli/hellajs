import { popover } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface PopoverAnchorProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

interface PopoverProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the trigger element. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
import { cn } from "./cn.js";

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor({ children, class: cls, ...attrs }: PopoverAnchorProps): JSX.Element {
  const { Anchor } = popover();
  return (
    <Anchor
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </Anchor>
  );
}

/** The manual trigger button; the composed Popover renders the same shape wired to toggle + aria state. */
export function PopoverTrigger({
  children,
  class: cls,
  ...attrs
}: PopoverTriggerProps): JSX.Element {
  const { Trigger } = popover();
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

/** The manual content layer; the composed Popover portals the same wiring under its trigger's state. */
export function PopoverContent({
  state,
  id,
  side,
  align,
  sideOffset,
  alignOffset,
  anchor,
  onDismiss,
  onExited,
  children,
  class: cls,
  ...attrs
}: PopoverContentProps): JSX.Element {
  const { Content } = popover({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
    anchor,
  });
  return (
    <Content
      id={id}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      onExited={onExited}
      class={
        cn("z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  const { Header } = popover();
  return (
    <Header
      class={
        cn("flex flex-col gap-1 text-sm", cls)
      }
      {...attrs}
    >
      {children}
    </Header>
  );
}

export function PopoverTitle({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  const { Title } = popover();
  return (
    <Title
      class={
        cn("font-medium", cls)
      }
      {...attrs}
    >
      {children}
    </Title>
  );
}

export function PopoverDescription({
  children,
  class: cls,
  ...attrs
}: PopoverDescriptionProps): JSX.Element {
  const { Description } = popover();
  return (
    <Description
      class={
        cn("text-muted-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </Description>
  );
}

export function Popover({
  open,
  onOpenChange,
  anchor,
  children,
  content: contentSlot,
  class: cls,
  ...attrs
}: PopoverProps): JSX.Element {
  const { Trigger, Content } = popover({ open, onOpenChange, anchor });
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
