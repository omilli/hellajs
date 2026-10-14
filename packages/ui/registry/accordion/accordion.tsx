import { signalSet } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";
import type { AccordionEntry, AccordionProps, AccordionItemProps, AccordionTriggerProps, AccordionContentProps } from "./accordion-types.js";

export type { AccordionEntry };

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const header: string;
declare const icon: string;
declare const item: string;
declare const trigger: string;
// @hella:end

const TRIGGER_ID = "hella-accordion-trigger-";
const CONTENT_ID = "hella-accordion-content-";

export function AccordionItem({ value, active, children, class: cls, ...attrs }: AccordionItemProps): JSX.Element {
  return (
    <div
      data-slot="accordion-item"
      data-value={value}
      data-state={active?.() ? "open" : "closed"}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
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
        // @hella:compose
        [header]
        // @hella:end
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
          // @hella:compose
          [trigger, cls]
          // @hella:end
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
            // @hella:compose
            [icon]
            // @hella:end
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
    </div>
  );
}

export function Accordion({ items, type, collapsible, open, class: cls, ...attrs }: AccordionProps): JSX.Element {
  const mode = type ?? "single";
  // A single open string wraps to a one-value list, a list passes through, absent starts closed.
  const seed = typeof open === "string" ? [open] : open ?? [];
  // Single mode keeps at most one value open: a multi-value seed clamps to the first.
  // signalSet gives each item's isOpen reader its own membership signal, so a toggle
  // wakes only the affected items' state effects.
  const openValues = signalSet<string>(mode === "single" ? seed.slice(0, 1) : seed);

  const isOpen = (value: string): boolean => openValues.has(value);

  const toggle = (value: string, disabled?: boolean): void => {
    if (disabled) return;
    if (openValues.has(value)) {
      if (mode === "single" && collapsible !== true) return;
      openValues.delete(value);
    } else if (mode === "single") {
      // The reconcile setter swaps the open item in one pass: closes the previous value, opens this one.
      openValues(new Set([value]));
    } else {
      openValues.add(value);
    }
  };

  return (
    <div
      data-slot="accordion"
      class={
        // @hella:compose
        [cls]
        // @hella:end
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
          ] as HellaChildren}
        />
      ))}
    </div>
  );
}
