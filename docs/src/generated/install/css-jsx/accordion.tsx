import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const item = style("accordion-item", {
  borderBottom: "1px solid var(--border)",
  "&:last-child": {
    borderBottom: "0",
  },
});

const header = style("accordion-header", {
  display: "flex",
});

const trigger = style("accordion-trigger", {
  alignItems: "flex-start",
  borderRadius: "calc(var(--radius) * 0.8)",
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
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
  color: "var(--muted-foreground)",
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
});

const content = style("accordion-content", {
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateRows: "0fr",
  lineHeight: "1.25rem",
  opacity: "0",
  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
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

export interface AccordionEntry {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

interface AccordionProps extends HTMLAttributes<"div"> {
  class?: string;
  items: AccordionEntry[];
  /** `single` keeps at most one item open (`collapsible` gates the last close); `multiple` toggles freely. */
  type?: "single" | "multiple";
  collapsible?: boolean;
  /** Open values on mount; a single string or a list for `multiple`. */
  open?: string | string[];
}

interface AccordionItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChild[];
  value: string;
  active?: () => boolean;
}

interface AccordionTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
}

interface AccordionContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
}

const TRIGGER_ID = "hella-accordion-trigger-";
const CONTENT_ID = "hella-accordion-content-";

export function AccordionItem({ value, active, children, class: cls, ...attrs }: AccordionItemProps): JSX.Element {
  return (
    <div
      data-slot="accordion-item"
      data-value={value}
      data-state={active?.() ? "open" : "closed"}
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AccordionTrigger({ active, onToggle, id, disabled, "on:click": userClick, children, class: cls, ...attrs }: AccordionTriggerProps): JSX.Element {
  return (
    <h3
      data-slot="accordion-header"
      class={
        [header]
      }
    >
      <button
        type="button"
        data-slot="accordion-trigger"
        id={id}
        aria-expanded={active?.() ? "true" : "false"}
        aria-disabled={disabled ? "true" : undefined}
        disabled={disabled ? true : undefined}
        data-state={active?.() ? "open" : "closed"}
        class={
          [trigger, cls]
        }
        on:click={function (e) { userClick?.call(this, e); onToggle?.(); }}
        {...attrs}
      >
        {children}
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
      </button>
    </h3>
  );
}

export function AccordionContent({ active, id, children, class: cls, ...attrs }: AccordionContentProps): JSX.Element {
  return (
    <div
      role="region"
      data-slot="accordion-content"
      id={id}
      data-state={active?.() ? "open" : "closed"}
      class={
        [content, cls]
      }
      {...attrs}
    >
      <div
        data-state={active?.() ? "open" : "closed"}
        class={
          [contentInner]
        }
      >
        {children}
      </div>
    </div>
  );
}

export default function Accordion({ items, type, collapsible, open, class: cls, ...attrs }: AccordionProps): JSX.Element {
  const mode = type ?? "single";
  const seed = open === undefined
    ? []
    : Array.isArray(open)
      ? open
      : [open];
  // Single mode keeps at most one value open: a multi-value seed clamps to the first.
  const openValues = signal<Set<string>>(new Set(mode === "single" ? seed.slice(0, 1) : seed));

  const isOpen = (value: string): boolean => openValues().has(value);

  const toggle = (value: string, disabled?: boolean): void => {
    if (disabled) return;
    const next = new Set(openValues());
    if (next.has(value)) {
      if (mode === "single" && collapsible !== true) return;
      next.delete(value);
    } else {
      if (mode === "single") next.clear();
      next.add(value);
    }
    openValues(next);
  };

  return (
    <div
      data-slot="accordion"
      class={
        [cls]
      }
      {...attrs}
    >
      {items.map((entry) => (
        <AccordionItem
          value={entry.value}
          active={() => isOpen(entry.value)}
          children={[
            <AccordionTrigger
              id={`${TRIGGER_ID}${entry.value}`}
              active={() => isOpen(entry.value)}
              onToggle={() => toggle(entry.value, entry.disabled)}
              disabled={entry.disabled}
              aria-controls={`${CONTENT_ID}${entry.value}`}
              children={entry.trigger}
            />,
            <AccordionContent
              id={`${CONTENT_ID}${entry.value}`}
              active={() => isOpen(entry.value)}
              aria-labelledby={`${TRIGGER_ID}${entry.value}`}
              children={entry.content}
            />,
          ] as HellaChild[]}
        />
      ))}
    </div>
  );
}
