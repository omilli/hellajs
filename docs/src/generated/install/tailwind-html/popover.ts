import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";
import { cn } from "./cn.js";

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface PopoverAnchorProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor({ children, class: cls, ...attrs }: PopoverAnchorProps): HellaNode {
  return html`
    <span
      data-slot="popover-anchor"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface PopoverTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Popover renders the same shape wired to toggle + aria state. */
export function PopoverTrigger({ children, class: cls, ...attrs }: PopoverTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="popover-trigger"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface PopoverContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
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

export function PopoverContent({ state, id, side: sideProp, align: alignProp, sideOffset, alignOffset: alignOffsetProp, anchor, onDismiss, onExited, children, class: cls, ...attrs }: PopoverContentProps): HellaNode {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "center";
  const alignOffset = alignOffsetProp ?? 0;
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (stateOf() === "closed") disposeWirings();
  });

  return html`
    <div
      role="dialog"
      tabindex="-1"
      id="${id}"
      data-slot="popover-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        cn("z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 4 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? alignOffset + "px 0" : "0 " + alignOffset + "px";
        }
        if (onDismiss) wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
        // Non-modal: no trap - focus moves to the content on open, upstream parity.
        node.focus();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): HellaNode {
  return html`
    <div
      data-slot="popover-header"
      class="${
        cn("flex flex-col gap-1 text-sm", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function PopoverTitle({ children, class: cls, ...attrs }: PopoverPartProps): HellaNode {
  return html`
    <div
      data-slot="popover-title"
      class="${
        cn("font-medium", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function PopoverDescription({ children, class: cls, ...attrs }: PopoverDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="popover-description"
      class="${
        cn("text-muted-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

interface PopoverProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Resolves the positioning anchor; defaults to the trigger element. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

let popoverCount = 0;

export default function Popover({ open, onOpenChange, anchor: anchorProp, "on:click": userClick, children, content: contentSlot, class: cls, ...attrs }: PopoverProps): HellaNode {
  const internal = signal(false);
  const isOpen = (): boolean => (open !== undefined ? open() : internal());
  const setOpen = (next: boolean): void => {
    if (open === undefined) internal(next);
    onOpenChange?.(next);
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
  const anchor = (): Element | undefined => anchorProp?.() ?? triggerNode;

  return html`
    <button
      type="button"
      data-slot="popover-trigger"
      data-state="${state}"
      aria-expanded="${() => (isOpen() ? "true" : "false")}"
      aria-controls="${contentId}"
      class="${
        cn(cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); toggle(); }}"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}"
      ...${attrs}
    >${() => children}${() => visible() && Portal({
      to: "body",
      children: [
        PopoverContent({
          state,
          id: contentId,
          anchor,
          onDismiss: () => setOpen(false),
          onExited: finishExit,
          children: contentSlot,
        }) as HellaChild,
      ],
    })}</button>
  ` as HellaNode;
}
