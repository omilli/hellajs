import { popover, PopoverRows } from "@hellajs/headless";
import type { PopoverPartProps, PopoverDescriptionProps, PopoverProps } from "./popover-types.js";

// @hella:styles
declare const base: string;
declare const content: string;
declare const description: string;
declare const header: string;
declare const title: string;
// @hella:end

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  return (
    <PopoverRows.Header
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </PopoverRows.Header>
  );
}

export function PopoverTitle({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  return (
    <PopoverRows.Title
      class={
        // @hella:compose
        [title, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </PopoverRows.Title>
  );
}

export function PopoverDescription({
  children,
  class: cls,
  ...attrs
}: PopoverDescriptionProps): JSX.Element {
  return (
    <PopoverRows.Description
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </PopoverRows.Description>
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
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <Content
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        {contentSlot}
      </Content>
    </Trigger>
  );
}
