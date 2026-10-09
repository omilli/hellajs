import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, Placement } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style("popover-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
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
});

const header = style("popover-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

const title = style("popover-title", {
  fontWeight: "500",
});

const description = style("popover-description", {
  color: tokens.mutedForeground,
});

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface PopoverAnchorProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** Bare anchor span - the manual composition's positioning target when the trigger should not anchor. */
export function PopoverAnchor({ children, class: cls, ...attrs }: PopoverAnchorProps): JSX.Element {
  return (
    <span
      data-slot="popover-anchor"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface PopoverTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Popover renders the same shape wired to toggle + aria state. */
export function PopoverTrigger({ children, class: cls, ...attrs }: PopoverTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="popover-trigger"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </button>
  );
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

export function PopoverContent({ state, id, side: sideProp, align: alignProp, sideOffset, alignOffset: alignOffsetProp, anchor, onDismiss, onExited, children, class: cls, ...attrs }: PopoverContentProps): JSX.Element {
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

  return (
    <div
      role="dialog"
      tabindex="-1"
      id={id}
      data-slot="popover-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        [content, cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 4 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
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
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface PopoverPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function PopoverHeader({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  return (
    <div
      data-slot="popover-header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function PopoverTitle({ children, class: cls, ...attrs }: PopoverPartProps): JSX.Element {
  return (
    <div
      data-slot="popover-title"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface PopoverDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function PopoverDescription({ children, class: cls, ...attrs }: PopoverDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="popover-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </p>
  );
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

export default function Popover({ open, onOpenChange, anchor: anchorProp, "on:click": userClick, children, content: contentSlot, class: cls, ...attrs }: PopoverProps): JSX.Element {
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
  const triggerChildren = flattenChildren(children);

  return (
    <button
      type="button"
      data-slot="popover-trigger"
      data-state={state()}
      aria-expanded={isOpen() ? "true" : "false"}
      aria-controls={contentId}
      class={
        [cls]
      }
      on:click={function (e) { userClick?.call(this, e); toggle(); }}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
      }}
      {...attrs}
    >
      {triggerChildren}
      {() => visible() && (
        <Portal to="body">
          <PopoverContent
            state={state}
            id={contentId}
            anchor={anchor}
            onDismiss={() => setOpen(false)}
            onExited={finishExit}
            children={contentSlot}
          />
        </Portal>
      )}
    </button>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
