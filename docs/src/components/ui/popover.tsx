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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style("popover-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "1rem",
  transformOrigin: "var(--radix-popover-content-transform-origin)",
  width: "18rem",
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

const header = style("popover-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

const title = style("popover-title", {
  fontWeight: "500",
});

const description = style("popover-description", {
  color: tokens.mutedForeground,
});

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor({ children, class: cls, ...attrs }: PopoverAnchorProps): JSX.Element {
  const { Anchor } = popover();
  return (
    <Anchor
      class={
        [cls]
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
        [cls]
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
        [content, cls]
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
        [header, cls]
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
        [title, cls]
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
        [description, cls]
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
        [cls]
      }
      {...attrs}
    >
      {children}
      <Content>{contentSlot}</Content>
    </Trigger>
  );
}
