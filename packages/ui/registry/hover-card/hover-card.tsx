import { hoverCard } from "@hellajs/headless";
import type { HoverCardProps } from "./hover-card-types.js";

// @hella:styles
declare const content: string;
// @hella:end

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
