import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

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

export function AccordionItem(props: AccordionItemProps): HellaNode {
  return html`
    <div
      data-slot="accordion-item"
      data-value="${props.value}"
      data-state="${() => (props.active?.() ? "open" : "closed")}"
      class="${
        cn("border-b last:border-b-0", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AccordionTrigger(props: AccordionTriggerProps): HellaNode {
  return html`
    <h3
      data-slot="accordion-header"
      class="${
        cn("flex")
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
          cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", props.class)
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
            cn("pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200")
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
        cn("grid grid-rows-[0fr] text-sm opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100", props.class)
      }"
    >
      <div
        data-state="${() => (props.active?.() ? "open" : "closed")}"
        class="${
          cn("min-h-0 overflow-hidden pt-0 pb-0 transition-[padding-bottom] duration-200 data-[state=open]:pb-4")
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
        cn(props.class)
      }"
    >
      ${props.items.map((entry) => AccordionItem({
        value: entry.value,
        active: () => isOpen(entry.value),
        children: [
          AccordionTrigger({
            id: `${"hella-accordion-trigger-"}${entry.value}`,
            active: () => isOpen(entry.value),
            onToggle: () => toggle(entry.value, entry.disabled),
            controls: `${"hella-accordion-content-"}${entry.value}`,
            disabled: entry.disabled,
            children: entry.trigger,
          }),
          AccordionContent({
            id: `${"hella-accordion-content-"}${entry.value}`,
            labelledBy: `${"hella-accordion-trigger-"}${entry.value}`,
            active: () => isOpen(entry.value),
            children: entry.content,
          }),
        ],
      }))}
    </div>
  ` as HellaNode;
}
