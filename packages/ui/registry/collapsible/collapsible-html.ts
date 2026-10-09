import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const icon: string;
declare const trigger: string;
// @hella:end

interface CollapsibleProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Controlled open state. When given, the root never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
}

interface CollapsibleTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
}

interface CollapsibleContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
}

let collapsibleCount = 0;

export function CollapsibleTrigger({ active, onToggle, "on:click": userClick, children, class: cls, ...attrs }: CollapsibleTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded="${() => (active?.() ? "true" : "false")}"
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
        data-slot="collapsible-icon"
        class="${
          // @hella:compose
          [icon]
          // @hella:end
        }"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  ` as HellaNode;
}

export function CollapsibleContent({ active, id, children, class: cls, ...attrs }: CollapsibleContentProps): HellaNode {
  return html`
    <div
      role="region"
      data-slot="collapsible-content"
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

export default function Collapsible({ open, defaultOpen, onOpenChange, trigger: triggerSlot, content: contentSlot, class: cls, ...attrs }: CollapsibleProps): HellaNode {
  const internal = signal(defaultOpen ?? false);
  const active = (): boolean => (open !== undefined ? open() : internal());
  const contentId = `hella-collapsible-content-${++collapsibleCount}`;

  const toggle = (): void => {
    const next = !active();
    if (open === undefined) internal(next);
    onOpenChange?.(next);
  };

  return html`
    <div
      data-slot="collapsible"
      data-state="${() => (active() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${CollapsibleTrigger({
    active,
    onToggle: toggle,
    "aria-controls": contentId,
    children: triggerSlot,
  })}
      ${CollapsibleContent({
    id: contentId,
    active,
    children: contentSlot,
  })}
    </div>
  ` as HellaNode;
}
