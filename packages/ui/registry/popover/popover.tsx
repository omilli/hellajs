import { popover } from "@hellajs/headless";
import type {
  PopoverAnchorProps,
  PopoverTriggerProps,
  PopoverContentProps,
  PopoverPartProps,
  PopoverDescriptionProps,
  PopoverProps,
} from "./popover-types.js";

// @hella:styles
declare const content: string;
declare const description: string;
declare const header: string;
declare const title: string;
// @hella:end

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor({ children, class: cls, ...attrs }: PopoverAnchorProps): JSX.Element {
  const { Anchor } = popover();
  return (
    <Anchor
      class={
        // @hella:compose
        [cls]
        // @hella:end
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

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  const { Header } = popover();
  return (
    <Header
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
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
        // @hella:compose
        [title, cls]
        // @hella:end
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
        // @hella:compose
        [description, cls]
        // @hella:end
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
