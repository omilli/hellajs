import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";
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

export function AccordionItem({ value, active, children, class: cls, ...attrs }: AccordionItemProps): HellaNode {
  return html`
    <div
      data-slot="accordion-item"
      data-value="${value}"
      data-state="${() => (active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [item, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function AccordionTrigger({ active, onToggle, id, disabled, "on:click": userClick, children, class: cls, ...attrs }: AccordionTriggerProps): HellaNode {
  return html`
    <h3
      data-slot="accordion-header"
      class="${
        // @hella:compose
        [header]
        // @hella:end
      }"
    >
      <button
        type="button"
        data-slot="accordion-trigger"
        id="${id}"
        aria-expanded="${() => (active?.() ? "true" : "false")}"
        aria-disabled="${disabled ? "true" : undefined}"
        disabled="${disabled ? true : undefined}"
        data-state="${() => (active?.() ? "open" : "closed")}"
        class="${
          // @hella:compose
          [trigger, cls]
          // @hella:end
        }"
        on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onToggle?.(); }}"
        ...${attrs}
      >
        ${() => children}
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
          class="${
            // @hella:compose
            [icon]
            // @hella:end
          }"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </h3>
  ` as HellaNode;
}

export function AccordionContent({ active, id, children, class: cls, ...attrs }: AccordionContentProps): HellaNode {
  return html`
    <div
      role="region"
      data-slot="accordion-content"
      id="${id}"
      data-state="${() => (active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      <div
        data-state="${() => (active?.() ? "open" : "closed")}"
        class="${
          // @hella:compose
          [contentInner]
          // @hella:end
        }"
      >
        ${() => children}
      </div>
    </div>
  ` as HellaNode;
}

export function Accordion({ items, type, collapsible, open, class: cls, ...attrs }: AccordionProps): HellaNode {
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

  return html`
    <div
      data-slot="accordion"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${items.map((entry) => AccordionItem({
        value: entry.value,
        active: () => isOpen(entry.value),
        children: [
          AccordionTrigger({
            id: `${TRIGGER_ID}${entry.value}`,
            active: () => isOpen(entry.value),
            onToggle: () => toggle(entry.value, entry.disabled),
            disabled: entry.disabled,
            "aria-controls": `${CONTENT_ID}${entry.value}`,
            children: entry.trigger,
          }),
          AccordionContent({
            id: `${CONTENT_ID}${entry.value}`,
            active: () => isOpen(entry.value),
            "aria-labelledby": `${TRIGGER_ID}${entry.value}`,
            children: entry.content,
          }),
        ],
      }))}
    </div>
  ` as HellaNode;
}
