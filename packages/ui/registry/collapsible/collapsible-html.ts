import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const content: string;
declare const contentInner: string;
declare const icon: string;
declare const trigger: string;
// @hella:end

interface CollapsibleProps {
  /** Controlled open state. When given, the root never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
  class?: string;
}

interface CollapsibleTriggerProps {
  active?: () => boolean;
  onToggle?: () => void;
  controls?: string;
  children?: HellaChildren;
  class?: string;
}

interface CollapsibleContentProps {
  active?: () => boolean;
  id?: string;
  children?: HellaChildren;
  class?: string;
}

let collapsibleCount = 0;

export function CollapsibleTrigger(props: CollapsibleTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded="${() => (props.active?.() ? "true" : "false")}"
      aria-controls="${props.controls}"
      data-state="${() => (props.active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [trigger, props.class]
        // @hella:end
      }"
      e:click="${() => props.onToggle?.()}"
    >${() => props.children}<svg
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
      ><path d="m6 9 6 6 6-6" /></svg></button>
  ` as HellaNode;
}

export function CollapsibleContent(props: CollapsibleContentProps): HellaNode {
  return html`
    <div
      role="region"
      data-slot="collapsible-content"
      id="${props.id}"
      data-state="${() => (props.active?.() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    ><div
        class="${
          // @hella:compose
          [contentInner]
          // @hella:end
        }"
      >${() => props.children}</div></div>
  ` as HellaNode;
}

export default function Collapsible(props: CollapsibleProps): HellaNode {
  const internal = signal(props.defaultOpen ?? false);
  const active = (): boolean => (props.open !== undefined ? props.open() : internal());
  const contentId = `hella-collapsible-content-${++collapsibleCount}`;

  const toggle = (): void => {
    const next = !active();
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
  };

  return html`
    <div
      data-slot="collapsible"
      data-state="${() => (active() ? "open" : "closed")}"
      class="${
        // @hella:compose
        [props.class]
        // @hella:end
      }"
    >
      ${CollapsibleTrigger({
    active,
    onToggle: toggle,
    controls: contentId,
    children: props.trigger,
  })}
      ${CollapsibleContent({
    id: contentId,
    active,
    children: props.content,
  })}
    </div>
  ` as HellaNode;
}
