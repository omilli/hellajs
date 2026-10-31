import { collapsible } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface CollapsibleProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Controlled open state. When given, the root never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
}

interface CollapsibleTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
}

interface CollapsibleContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
}
import { cn } from "./cn.js";

const ChevronIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    data-slot="collapsible-icon"
    class={
      cn("pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200")
    }
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function CollapsibleTrigger({
  active,
  onToggle,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: CollapsibleTriggerProps): JSX.Element {
  const { Trigger } = collapsible();
  return (
    <Trigger
      active={active}
      onToggle={onToggle}
      class={
        cn("inline-flex items-center gap-2 [&[data-state=open]>svg]:rotate-180", cls)
      }
      on:click={userClick}
      {...attrs}
    >
      {children}
      <ChevronIcon />
    </Trigger>
  );
}

export function CollapsibleContent({
  active,
  children,
  class: cls,
  ...attrs
}: CollapsibleContentProps): JSX.Element {
  const { Content } = collapsible();
  return (
    <Content
      active={active}
      class={
        cn("grid grid-rows-[0fr] opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100", cls)
      }
      {...attrs}
    >
      <div
        class={
          cn("min-h-0 overflow-hidden")
        }
      >
        {children}
      </div>
    </Content>
  );
}

export function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  trigger: triggerSlot,
  content: contentSlot,
  class: cls,
  ...attrs
}: CollapsibleProps): JSX.Element {
  const { Trigger, Content, isOpen } = collapsible({ open, defaultOpen, onOpenChange });

  return (
    <div
      data-slot="collapsible"
      data-state={isOpen() ? "open" : "closed"}
      class={
        cn(cls)
      }
      {...attrs}
    >
      <Trigger
        class={
          cn("inline-flex items-center gap-2 [&[data-state=open]>svg]:rotate-180")
        }
      >
        {triggerSlot}
        <ChevronIcon />
      </Trigger>
      <Content>
        <div
          class={
            cn("min-h-0 overflow-hidden")
          }
        >
          {contentSlot}
        </div>
      </Content>
    </div>
  );
}
