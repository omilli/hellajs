import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const header: string;
declare const icon: string;
declare const item: string;
declare const trigger: string;
// @hella:end

export interface AccordionEntry {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionEntry[];
  /** `single` keeps at most one item open (`collapsible` gates the last close); `multiple` toggles freely. */
  type?: "single" | "multiple";
  collapsible?: boolean;
  /** Open values on mount; a single string or a list for `multiple`. */
  open?: string | string[];
  class?: string;
}

interface AccordionItemProps {
  value: string;
  active?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

interface AccordionTriggerProps {
  id?: string;
  active?: () => boolean;
  onToggle?: () => void;
  controls?: string;
  disabled?: boolean;
  children?: HellaChildren;
  class?: string;
}

interface AccordionContentProps {
  id?: string;
  labelledBy?: string;
  active?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

const TRIGGER_ID = "hella-accordion-trigger-";
const CONTENT_ID = "hella-accordion-content-";

export function AccordionItem(props: AccordionItemProps): HellaNode {
  return html`
    <div
      data-slot="accordion-item"
      data-value="${props.value}"
      data-state="${() => (props.active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [item, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AccordionTrigger(props: AccordionTriggerProps): HellaNode {
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
        id="${props.id}"
        aria-expanded="${() => (props.active?.() ? "true" : "false")}"
        aria-controls="${props.controls}"
        aria-disabled="${props.disabled ? "true" : undefined}"
        disabled="${props.disabled ? true : undefined}"
        data-state="${() => (props.active?.() ? "open" : "closed")}"
        class="${
          // @hella:compose
          [trigger, props.class]
          // @hella:end
        }"
        e:click="${() => props.onToggle?.()}"
      >
        ${() => props.children}
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

export function AccordionContent(props: AccordionContentProps): HellaNode {
  return html`
    <div
      role="region"
      data-slot="accordion-content"
      id="${props.id}"
      aria-labelledby="${props.labelledBy}"
      data-state="${() => (props.active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    >
      <div
        data-state="${() => (props.active?.() ? "open" : "closed")}"
        class="${
          // @hella:compose
          [contentInner]
          // @hella:end
        }"
      >
        ${() => props.children}
      </div>
    </div>
  ` as HellaNode;
}

export default function Accordion(props: AccordionProps): HellaNode {
  const type = props.type ?? "single";
  const seed = props.open === undefined
    ? []
    : Array.isArray(props.open)
      ? props.open
      : [props.open];
  // Single mode keeps at most one value open: a multi-value seed clamps to the first.
  const open = signal<Set<string>>(new Set(type === "single" ? seed.slice(0, 1) : seed));

  const isOpen = (value: string): boolean => open().has(value);

  const toggle = (value: string, disabled?: boolean): void => {
    if (disabled) return;
    const next = new Set(open());
    if (next.has(value)) {
      if (type === "single" && props.collapsible !== true) return;
      next.delete(value);
    } else {
      if (type === "single") next.clear();
      next.add(value);
    }
    open(next);
  };

  return html`
    <div
      data-slot="accordion"
      class="${
        // @hella:compose
        [props.class]
        // @hella:end
      }"
    >
      ${props.items.map((entry) => AccordionItem({
        value: entry.value,
        active: () => isOpen(entry.value),
        children: [
          AccordionTrigger({
            id: `${TRIGGER_ID}${entry.value}`,
            active: () => isOpen(entry.value),
            onToggle: () => toggle(entry.value, entry.disabled),
            controls: `${CONTENT_ID}${entry.value}`,
            disabled: entry.disabled,
            children: entry.trigger,
          }),
          AccordionContent({
            id: `${CONTENT_ID}${entry.value}`,
            labelledBy: `${TRIGGER_ID}${entry.value}`,
            active: () => isOpen(entry.value),
            children: entry.content,
          }),
        ],
      }))}
    </div>
  ` as HellaNode;
}
