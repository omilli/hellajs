import { collapsible } from "@hellajs/headless";
import type {
  CollapsibleProps,
  CollapsibleTriggerProps,
  CollapsibleContentProps,
} from "./collapsible-types.js";

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const icon: string;
declare const trigger: string;
// @hella:end

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
      // @hella:compose
      [icon]
      // @hella:end
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
        // @hella:compose
        [trigger, cls]
        // @hella:end
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
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      <div
        class={
          // @hella:compose
          [contentInner]
          // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      <Trigger
        class={
          // @hella:compose
          [trigger]
          // @hella:end
        }
      >
        {triggerSlot}
        <ChevronIcon />
      </Trigger>
      <Content>
        <div
          class={
            // @hella:compose
            [contentInner]
            // @hella:end
          }
        >
          {contentSlot}
        </div>
      </Content>
    </div>
  );
}
