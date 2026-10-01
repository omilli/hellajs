import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "1rem",
  transformOrigin: "var(--radix-popover-content-transform-origin)",
  width: "18rem",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
}, { label: "hella-popover-content", layer: "hella" });

const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-popover-header", layer: "hella" });

const title = style({
  fontWeight: "500",
}, { label: "hella-popover-title", layer: "hella" });

const description = style({
  color: "var(--muted-foreground)",
}, { label: "hella-popover-description", layer: "hella" });

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface PopoverAnchorProps {
  children?: HellaChildren;
  class?: string;
}

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor(props: PopoverAnchorProps): HellaNode {
  return html`
    <span
      data-slot="popover-anchor"
      class="${
        [props.class]
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface PopoverTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Popover renders the same shape wired to toggle + aria state. */
export function PopoverTrigger(props: PopoverTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="popover-trigger"
      class="${
        [props.class]
      }"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface PopoverContentProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function PopoverContent(props: PopoverContentProps): HellaNode {
  const side = props.side ?? "bottom";
  const align = props.align ?? "center";
  const alignOffset = props.alignOffset ?? 0;
  const state = (): "open" | "closed" => props.state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (state() === "closed") disposeWirings();
  });

  return html`
    <div
      role="dialog"
      tabindex="-1"
      id="${props.id}"
      data-slot="popover-content"
      data-state="${state}"
      data-side="${side}"
      data-align="${align}"
      class="${
        [content, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: props.sideOffset ?? 4 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? alignOffset + "px 0" : "0 " + alignOffset + "px";
        }
        if (props.onDismiss) wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
        // Non-modal: no trap - focus moves to the content on open, upstream parity.
        node.focus();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (state() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface PopoverPartProps {
  children?: HellaChildren;
  class?: string;
}

export function PopoverHeader(props: PopoverPartProps): HellaNode {
  return html`
    <div
      data-slot="popover-header"
      class="${
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function PopoverTitle(props: PopoverPartProps): HellaNode {
  return html`
    <div
      data-slot="popover-title"
      class="${
        [title, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function PopoverDescription(props: PopoverPartProps): HellaNode {
  return html`
    <p
      data-slot="popover-description"
      class="${
        [description, props.class]
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface PopoverProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the trigger element. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

let popoverCount = 0;

export default function Popover(props: PopoverProps): HellaNode {
  const internal = signal(false);
  const isOpen = (): boolean => (props.open !== undefined ? props.open() : internal());
  const setOpen = (next: boolean): void => {
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
  };
  const toggle = (): void => setOpen(!isOpen());

  const contentId = `hella-popover-content-${++popoverCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  let triggerNode: Element | undefined;

  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };

  // Flip to open renders immediately; flip to closed starts the exit - the
  // content stays mounted under data-state="closed" until its animationend
  // (or the copied duration budget) unmounts it.
  effect(() => {
    if (isOpen()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 250);
    }
  });

  const state = (): "open" | "closed" => (isOpen() ? "open" : "closed");
  const anchor = (): Element | undefined => props.anchor?.() ?? triggerNode;

  return html`
    <button
      type="button"
      data-slot="popover-trigger"
      data-state="${state}"
      aria-expanded="${() => (isOpen() ? "true" : "false")}"
      aria-controls="${contentId}"
      class="${
        [props.class]
      }"
      on:click="${toggle}"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}"
    >${() => props.children}${() => visible() && Portal({
      to: "body",
      children: [
        PopoverContent({
          state,
          id: contentId,
          anchor,
          onDismiss: () => setOpen(false),
          onExited: finishExit,
          children: props.content,
        }) as HellaChild,
      ],
    })}</button>
  ` as HellaNode;
}
