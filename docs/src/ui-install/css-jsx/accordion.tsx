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
  /** Seeds the uncontrolled open values; a single string opens that item, a list opens each. */
  defaultValue?: string | string[];
  /** Controlled open values. When given, the root never writes its internal state and `onValueChange` reports the requested change; a lone string reads as the one open value. */
  value?: () => string | string[];
  /** Called with every root-driven change: single mode reports the one open value (`""` when none), multiple mode reports the membership array. */
  onValueChange?: (value: string | string[]) => void;
}

export type { AccordionEntry };

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const item = style("accordion-item", {
  borderBottom: `1px solid ${tokens.border}`,
  "&:last-child": {
    borderBottom: "0",
  },
});

const header = style("accordion-header", {
  display: "flex",
});

const trigger = style("accordion-trigger", {
  alignItems: "flex-start",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  display: "flex",
  flex: "1",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "1rem",
  justifyContent: "space-between",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "1rem",
  textAlign: "left",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    textDecorationLine: "underline",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
});

const icon = style("accordion-icon", {
  color: tokens.mutedForeground,
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition:
    "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
});

const content = style("accordion-content", {
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateRows: "0fr",
  lineHeight: "1.25rem",
  opacity: "0",
  transition:
    "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    gridTemplateRows: "1fr",
    opacity: "1",
  },
});

const contentInner = style("accordion-content-inner", {
  minHeight: "0",
  overflow: "hidden",
  paddingBottom: "0",
  paddingTop: "0",
  transition: "padding-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    paddingBottom: "1rem",
  },
});

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
      [icon]
    }
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Accordion({
  items,
  keyBy,
  type,
  collapsible,
  defaultValue,
  value,
  onValueChange,
  class: cls,
  ...attrs
}: AccordionProps): JSX.Element {
  const { Root, Item, Trigger, Content, isOpen } = accordion({
    type,
    collapsible,
    defaultValue,
    value,
    onValueChange,
  });

  return (
    <Root
      class={
        [cls]
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
              [item]
            }
          >
            <h3
              data-slot="accordion-header"
              class={
                [header]
              }
            >
              <Trigger
                value={entry.value}
                disabled={entry.disabled}
                class={
                  [trigger]
                }
              >
                {entry.trigger}
                <ChevronIcon />
              </Trigger>
            </h3>
            <Content
              value={entry.value}
              class={
                [content]
              }
            >
              <div
                data-state={isOpen(entry.value) ? "open" : "closed"}
                class={
                  [contentInner]
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
