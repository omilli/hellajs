import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, Placement } from "@hellajs/dom";

// @hella:styles
declare const content: string;
// @hella:end

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface TooltipProviderProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

/**
 * Passthrough wrapper - upstream config-carrier kept for copy-paste parity.
 * Divergence: delay config is the per-Tooltip `delayDuration` prop here, so
 * the provider carries children only.
 */
export function TooltipProvider({ children, class: cls, ...attrs }: TooltipProviderProps): JSX.Element {
  return (
    <div
      data-slot="tooltip-provider"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface TooltipTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger span; the composed Tooltip renders the same shape wired to hoverIntent. */
export function TooltipTrigger({ children, class: cls, ...attrs }: TooltipTriggerProps): JSX.Element {
  return (
    <span
      data-slot="tooltip-trigger"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface TooltipContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function TooltipContent({ state, id, side: sideProp, align: alignProp, anchor, onExited, children, class: cls, ...attrs }: TooltipContentProps): JSX.Element {
  const side = sideProp ?? "top";
  const align = alignProp ?? "center";
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  return (
    <div
      role="tooltip"
      id={id}
      data-slot="tooltip-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align) }));
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface TooltipProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  /** Pointer-hover ms before the content opens. Default 700. */
  delayDuration?: number;
  side?: AnchorSide;
  align?: AnchorAlign;
  children?: HellaChildren;
  class?: string;
}

let tooltipCount = 0;

export default function Tooltip({ content: contentSlot, delayDuration, side: sideProp, align: alignProp, children, class: cls, ...attrs }: TooltipProps): JSX.Element {
  const contentId = `hella-tooltip-content-${++tooltipCount}`;
  const open = signal(false);
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
    if (open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 250);
    }
  });

  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  const side = sideProp ?? "top";
  const align = alignProp ?? "center";
  const disposals: (() => void)[] = [];
  const triggerChildren = flattenChildren(children);

  return (
    <span
      data-slot="tooltip-trigger"
      aria-describedby={contentId}
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // hoverIntent stays armed for the trigger's lifetime - reopen works
        // without a remount (the skip-delay window is the primitive's global).
        disposals.push(hoverIntent(node, {
          onOpen: () => open(true),
          onClose: () => open(false),
          openDelay: delayDuration ?? 700,
        }));
      }}
      hook:beforeDestroy={() => {
        while (disposals.length) disposals.pop()!();
      }}
      {...attrs}
    >
      {triggerChildren}
      {() => visible() && (
        <Portal to="body">
          <TooltipContent
            state={state}
            id={contentId}
            side={side}
            align={align}
            anchor={() => triggerNode}
            onExited={finishExit}
            children={contentSlot}
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
