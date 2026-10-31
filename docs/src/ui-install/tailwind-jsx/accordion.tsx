import { accordion } from "@hellajs/headless";
import { ForEach } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface AccordionEntry {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

interface AccordionProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered sections. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items: AccordionEntry[] | (() => AccordionEntry[]);
  /** Reuses item DOM through reorders by `value` identity (open state survives); order always follows the array. */
  keyBy?: "value";
  /** `single` keeps at most one item open (`collapsible` gates the last close); `multiple` toggles freely. */
  type?: "single" | "multiple";
  collapsible?: boolean;
  /** Open values on mount; a single string or a list for `multiple`. */
  open?: string | string[];
}

interface AccordionItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  value: string;
  active?: () => boolean;
}

interface AccordionTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
  /** The item's value key; derives the `hella-accordion-trigger-<value>` id pair when `id` is not given. */
  value?: string;
}

interface AccordionContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
}
import { cn } from "./cn.js";

export type { AccordionEntry };

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
      cn("pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200")
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
        cn("border-b last:border-b-0", cls)
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
        cn("flex")
      }
    >
      <Trigger
        value={value}
        active={active}
        onToggle={onToggle}
        disabled={disabled}
        class={
          cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", cls)
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
        cn("grid grid-rows-[0fr] text-sm opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100", cls)
      }
      {...attrs}
    >
      <div
        data-state={active?.() ? "open" : "closed"}
        class={
          cn("min-h-0 overflow-hidden pt-0 pb-0 transition-[padding-bottom] duration-200 data-[state=open]:pb-4")
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
        cn(cls)
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
              cn("border-b last:border-b-0")
            }
          >
            <h3
              data-slot="accordion-header"
              class={
                cn("flex")
              }
            >
              <Trigger
                value={entry.value}
                disabled={entry.disabled}
                class={
                  cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180")
                }
              >
                {entry.trigger}
                <ChevronIcon />
              </Trigger>
            </h3>
            <Content
              value={entry.value}
              class={
                cn("grid grid-rows-[0fr] text-sm opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100")
              }
            >
              <div
                data-state={isOpen(entry.value) ? "open" : "closed"}
                class={
                  cn("min-h-0 overflow-hidden pt-0 pb-0 transition-[padding-bottom] duration-200 data-[state=open]:pb-4")
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
