import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

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

export function AccordionItem({ value, active, children, class: cls, ...attrs }: AccordionItemProps): JSX.Element {
  return (
    <div
      data-slot="accordion-item"
      data-value={value}
      data-state={active?.() ? "open" : "closed"}
      class={
        cn("border-b last:border-b-0", cls)
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
        cn("flex")
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
          cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", cls)
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
            cn("pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200")
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
        cn(cls)
      }
      {...attrs}
    >
      {items.map((entry) => (
        <AccordionItem
          value={entry.value}
          active={() => isOpen(entry.value)}
          children={[
            <AccordionTrigger
              id={`${"hella-accordion-trigger-"}${entry.value}`}
              active={() => isOpen(entry.value)}
              onToggle={() => toggle(entry.value, entry.disabled)}
              disabled={entry.disabled}
              aria-controls={`${"hella-accordion-content-"}${entry.value}`}
              children={entry.trigger}
            />,
            <AccordionContent
              id={`${"hella-accordion-content-"}${entry.value}`}
              active={() => isOpen(entry.value)}
              aria-labelledby={`${"hella-accordion-trigger-"}${entry.value}`}
              children={entry.content}
            />,
          ] as HellaChild[]}
        />
      ))}
    </div>
  );
}
