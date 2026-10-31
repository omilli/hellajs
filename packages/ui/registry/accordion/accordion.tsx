import { accordion } from "@hellajs/headless";
import { ForEach } from "@hellajs/dom";
import type {
  AccordionEntry,
  AccordionProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
} from "./accordion-types.js";

export type { AccordionEntry };

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const header: string;
declare const icon: string;
declare const item: string;
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
    data-slot="accordion-icon"
    class={
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function AccordionItem({
  value,
  active,
  children,
  class: cls,
  ...attrs
}: AccordionItemProps): JSX.Element {
  const { Item } = accordion();
  return (
    <Item
      value={value}
      active={active}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function AccordionTrigger({
  value,
  active,
  onToggle,
  disabled,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: AccordionTriggerProps): JSX.Element {
  const { Trigger } = accordion();
  return (
    <h3
      data-slot="accordion-header"
      class={
        // @hella:compose
        [header]
        // @hella:end
      }
    >
      <Trigger
        value={value}
        active={active}
        onToggle={onToggle}
        disabled={disabled}
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
    </h3>
  );
}

export function AccordionContent({
  active,
  children,
  class: cls,
  ...attrs
}: AccordionContentProps): JSX.Element {
  const { Content } = accordion();
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
        data-state={active?.() ? "open" : "closed"}
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

export function Accordion({
  items,
  keyBy,
  type,
  collapsible,
  open,
  class: cls,
  ...attrs
}: AccordionProps): JSX.Element {
  const { Root, Item, Trigger, Content, isOpen } = accordion({
    type,
    collapsible,
    defaultValue: open,
  });

  return (
    <Root
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      <ForEach
        each={items}
        use={(entry) => (
          <Item
            value={entry.value}
            key={keyBy ? entry.value : undefined}
            class={
              // @hella:compose
              [item]
              // @hella:end
            }
          >
            <h3
              data-slot="accordion-header"
              class={
                // @hella:compose
                [header]
                // @hella:end
              }
            >
              <Trigger
                value={entry.value}
                disabled={entry.disabled}
                class={
                  // @hella:compose
                  [trigger]
                  // @hella:end
                }
              >
                {entry.trigger}
                <ChevronIcon />
              </Trigger>
            </h3>
            <Content
              value={entry.value}
              class={
                // @hella:compose
                [content]
                // @hella:end
              }
            >
              <div
                data-state={isOpen(entry.value) ? "open" : "closed"}
                class={
                  // @hella:compose
                  [contentInner]
                  // @hella:end
                }
              >
                {entry.content}
              </div>
            </Content>
          </Item>
        )}
      />
    </Root>
  );
}
