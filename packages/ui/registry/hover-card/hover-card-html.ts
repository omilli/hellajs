import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, html, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";

// @hella:styles
declare const content: string;
// @hella:end

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface HoverCardTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger span; the composed HoverCard renders the same shape wired to hoverIntent. */
export function HoverCardTrigger({ children, class: cls, ...attrs }: HoverCardTriggerProps): HellaNode {
  return html`
    <span
      data-slot="hover-card-trigger"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface HoverCardContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When both are given, hovering the content re-arms the open state with zero delays (keep-open). */
  onOpen?: () => void;
  onClose?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function HoverCardContent({ state, side: sideProp, align: alignProp, anchor, onOpen, onClose, onExited, children, class: cls, ...attrs }: HoverCardContentProps): HellaNode {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "center";
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  return html`
    <div
      data-slot="hover-card-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: 4 }));
        if (onOpen && onClose) {
          // Zero delays: entering the content re-opens instantly and leaving
          // it closes immediately - the keep-open contract of the composed
          // HoverCard.
          wirings.push(hoverIntent(node, { onOpen, onClose, openDelay: 0, closeDelay: 0 }));
        }
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface HoverCardProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

export default function HoverCard({ open, onOpenChange, children, content: contentSlot, class: cls, ...attrs }: HoverCardProps): HellaNode {
  const internal = signal(false);
  const isOpen = (): boolean => (open !== undefined ? open() : internal());
  const setOpen = (next: boolean): void => {
    if (open === undefined) internal(next);
    onOpenChange?.(next);
  };

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
  const disposals: (() => void)[] = [];

  // Pointer ownership flags: each region's close only fires when the pointer
  // has not moved into the other region, so crossing trigger → content never
  // closes and returning content → trigger cancels the content's own close.
  let overTrigger = false;
  let overContent = false;

  const openFromTrigger = (): void => {
    overTrigger = true;
    overContent = false;
    setOpen(true);
  };
  const closeFromTrigger = (): void => {
    if (overContent) return;
    overTrigger = false;
    setOpen(false);
  };
  const openFromContent = (): void => {
    overContent = true;
    overTrigger = false;
    setOpen(true);
  };
  const closeFromContent = (): void => {
    if (overTrigger) return;
    overContent = false;
    setOpen(false);
  };

  return html`
    <span
      data-slot="hover-card-trigger"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // Upstream delays: 200ms open, 300ms close. hoverIntent stays armed
        // for the trigger's lifetime - reopen works without a remount.
        disposals.push(hoverIntent(node, {
          onOpen: openFromTrigger,
          onClose: closeFromTrigger,
          openDelay: 200,
          closeDelay: 300,
        }));
        // A re-enter on an already-open trigger short-circuits inside
        // hoverIntent's enter (before onOpen), so the pointer-ownership flags
        // are maintained by dedicated listeners.
        const markEnter = (): void => {
          overTrigger = true;
          overContent = false;
        };
        const markLeave = (): void => {
          overTrigger = false;
        };
        node.addEventListener("pointerenter", markEnter);
        node.addEventListener("pointerleave", markLeave);
        disposals.push(() => {
          node.removeEventListener("pointerenter", markEnter);
          node.removeEventListener("pointerleave", markLeave);
        });
      }}"
      hook:beforeDestroy="${() => {
        while (disposals.length) disposals.pop()!();
      }}"
      ...${attrs}
    >${() => children}${() => visible() && Portal({
      to: "body",
      children: [
        HoverCardContent({
          state,
          anchor: () => triggerNode,
          onOpen: openFromContent,
          onClose: closeFromContent,
          onExited: finishExit,
          children: contentSlot,
        }) as HellaChild,
      ],
    })}</span>
  ` as HellaNode;
}
