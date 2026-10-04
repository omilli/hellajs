import { signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const trigger = style({
  alignItems: "center",
  display: "inline-flex",
  gap: "0.5rem",
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
}, { label: "collapsible-trigger" });

const icon = style({
  color: "var(--muted-foreground)",
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
}, { label: "collapsible-icon" });

const content = style({
  display: "grid",
  gridTemplateRows: "0fr",
  opacity: "0",
  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    gridTemplateRows: "1fr",
    opacity: "1",
  },
}, { label: "collapsible-content" });

const contentInner = style({
  minHeight: "0",
  overflow: "hidden",
}, { label: "collapsible-content-inner" });

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

export function CollapsibleTrigger(props: CollapsibleTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded={props.active?.() ? "true" : "false"}
      aria-controls={props.controls}
      data-state={props.active?.() ? "open" : "closed"}
      class={
        [trigger, props.class]
      }
      on:click={() => props.onToggle?.()}
    >
      {props.children}
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
        class={
          [icon]
        }
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function CollapsibleContent(props: CollapsibleContentProps): JSX.Element {
  return (
    <div
      role="region"
      data-slot="collapsible-content"
      id={props.id}
      data-state={props.active?.() ? "open" : "closed"}
      class={
        [content, props.class]
      }
    >
      <div
        class={
          [contentInner]
        }
      >{props.children}</div>
    </div>
  );
}

export default function Collapsible(props: CollapsibleProps): JSX.Element {
  const internal = signal(props.defaultOpen ?? false);
  const active = (): boolean => (props.open !== undefined ? props.open() : internal());
  const contentId = `hella-collapsible-content-${++collapsibleCount}`;

  const toggle = (): void => {
    const next = !active();
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
  };

  return (
    <div
      data-slot="collapsible"
      data-state={active() ? "open" : "closed"}
      class={
        [props.class]
      }
    >
      <CollapsibleTrigger
        active={active}
        onToggle={toggle}
        controls={contentId}
        children={props.trigger}
      />
      <CollapsibleContent
        id={contentId}
        active={active}
        children={props.content}
      />
    </div>
  );
}
