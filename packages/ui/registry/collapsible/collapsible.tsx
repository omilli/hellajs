import { collapsible } from "@hellajs/headless";
import type { CollapsibleProps } from "./collapsible-types.js";

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
      <Content
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
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
