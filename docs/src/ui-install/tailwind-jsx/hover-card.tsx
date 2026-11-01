import { hoverCard } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface HoverCardProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
import { cn } from "./cn.js";

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
      <Content
        class={
          cn("z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")
        }
      >
        {contentSlot}
      </Content>
    </Trigger>
  );
}
