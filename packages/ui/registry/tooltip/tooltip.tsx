import { tooltip } from "@hellajs/headless";
import type { TooltipProps } from "./tooltip-types.js";

// @hella:styles
declare const content: string;
// @hella:end

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
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <Content
        side={side}
        align={align}
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
