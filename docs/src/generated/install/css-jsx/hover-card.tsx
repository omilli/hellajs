import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, Placement } from "@hellajs/dom";

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
  transformOrigin: "var(--radix-hover-card-content-transform-origin)",
  width: "16rem",
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
}, { label: "hella-hover-card-content", layer: "hella" });

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface HoverCardTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger span; the composed HoverCard renders the same shape wired to hoverIntent. */
export function HoverCardTrigger(props: HoverCardTriggerProps): JSX.Element {
  return (
    <span
      data-slot="hover-card-trigger"
      class={
        [props.class]
      }
    >
      {props.children}
    </span>
  );
}

interface HoverCardContentProps {
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

export function HoverCardContent(props: HoverCardContentProps): JSX.Element {
  const side = props.side ?? "bottom";
  const align = props.align ?? "center";
  const state = (): "open" | "closed" => props.state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  return (
    <div
      data-slot="hover-card-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      class={
        [content, props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: 4 }));
        if (props.onOpen && props.onClose) {
          // Zero delays: entering the content re-opens instantly and leaving
          // it closes immediately - the keep-open contract of the composed
          // HoverCard.
          wirings.push(hoverIntent(node, { onOpen: props.onOpen, onClose: props.onClose, openDelay: 0, closeDelay: 0 }));
        }
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (state() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
        while (teardown.length) teardown.pop()!();
      }}
    >
      {props.children}
    </div>
  );
}

interface HoverCardProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

export default function HoverCard(props: HoverCardProps): JSX.Element {
  const internal = signal(false);
  const isOpen = (): boolean => (props.open !== undefined ? props.open() : internal());
  const setOpen = (next: boolean): void => {
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
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
  const triggerChildren = flattenChildren(props.children);

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

  return (
    <span
      data-slot="hover-card-trigger"
      class={
        [props.class]
      }
      hook:afterMount={(node) => {
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
      }}
      hook:beforeDestroy={() => {
        while (disposals.length) disposals.pop()!();
      }}
    >
      {triggerChildren}
      {() => visible() && (
        <Portal to="body">
          <HoverCardContent
            state={state}
            anchor={() => triggerNode}
            onOpen={openFromContent}
            onClose={closeFromContent}
            onExited={finishExit}
            children={props.content}
          />
        </Portal>
      )}
    </span>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
