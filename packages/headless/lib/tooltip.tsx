import { effect, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import { hoverIntent } from "./hoverIntent";
import { anchoredLayer } from "./internal/anchoredLayer";
import type {
  HoverCardContentProps,
  HoverCardOptions,
  HoverCardParts,
  HoverCardTriggerProps,
  TooltipContentProps,
  TooltipOptions,
  TooltipParts,
  TooltipProviderProps,
  TooltipTriggerProps,
} from "./types/parts";

/** Open/close state shared by the hover pair: controlled override, exit-holding `visible` gate. */
function hoverOpenState(options: { open?: () => boolean; onOpenChange?: (open: boolean) => void }) {
  const internal = signal(false);
  const isOpen = (): boolean => (options.open !== undefined ? options.open() : internal());
  const setOpen = (next: boolean): void => {
    if (options.open === undefined) internal(next);
    options.onOpenChange?.(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading isOpen() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
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
  return {
    isOpen,
    setOpen,
    state: (): "open" | "closed" => (isOpen() ? "open" : "closed"),
    visible,
    finishExit,
  };
}

/**
 * Focus resolution for hover layers: refocusing whatever already holds focus
 * is a no-op, which satisfies the anchored-layer engine's open-focus contract
 * without stealing focus from the trigger (a focus steal would blur the
 * trigger and close the layer mid-hover).
 */
const heldFocus = (): HTMLElement => document.activeElement as HTMLElement;

let tooltipCount = 0;

/**
 * Creates the tooltip part set: `Provider`, `Trigger`, `Content`. The closure
 * owns the open state — controlled through an `open` getter when passed, an
 * internal signal when omitted — the exit machine, and the generated content
 * id. `Trigger` arms [`hoverIntent`](./hoverIntent) (open delay, shared
 * skip-delay clock) for its lifetime; `Content` portals to `document.body`,
 * anchors to the trigger, and arms the anchored-layer engine while open. Call
 * in component scope so the state machine's effect disposes with the
 * component.
 *
 * ```tsx
 * const Tip = tooltip({ delay: 300 });
 *
 * <Tip.Trigger>Hover me</Tip.Trigger>
 * <Tip.Content side="top">Tooltip text</Tip.Content>
 * ```
 * @param options `open` getter + `onOpenChange` + the `delay` before opening (default 700).
 * @returns The three part components, composed as `Tip.Trigger`-style members.
 */
export function tooltip(options: TooltipOptions = {}): TooltipParts {
  const s = hoverOpenState(options);
  const delay = options.delay ?? 700;
  const contentId = `hella-tooltip-content-${++tooltipCount}`;
  let triggerNode: Element | undefined;

  const Provider = (props: TooltipProviderProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="tooltip-provider" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Trigger = (props: TooltipTriggerProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    const disposals: (() => void)[] = [];
    return (
      <span
        data-slot="tooltip-trigger"
        aria-describedby={contentId}
        class={cls}
        {...attrs}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          triggerNode = node;
          // hoverIntent stays armed for the trigger's lifetime - reopen works
          // without a remount (the skip-delay window is the primitive's global).
          disposals.push(
            hoverIntent(node, {
              onOpen: () => s.setOpen(true),
              onClose: () => s.setOpen(false),
              openDelay: delay,
            }),
          );
        }}
        hook:beforeDestroy={() => {
          while (disposals.length) disposals.pop()!();
        }}
      >
        {children}
      </span>
    );
  };

  const Content = (props: TooltipContentProps): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      alignOffset: alignOffsetProp,
      anchor: anchorProp,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "top";
    const align = alignProp ?? "center";
    const sideOffset = sideOffsetProp ?? 0;
    const alignOffset = alignOffsetProp ?? 0;
    // The gate is a region OUTSIDE the Portal: portals mount once, so the
    // whole portal must reconstruct per open for the mount walk (and the
    // engine's afterMount wiring) to run against fresh content.
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                role="tooltip"
                id={id ?? contentId}
                data-slot="tooltip-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                class={cls}
                {...attrs}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () => anchorProp?.() ?? triggerNode,
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    focusTarget: heldFocus,
                    onDismiss: () => s.setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                  });
                }}
              >
                {children}
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  return { Provider, Trigger, Content };
}

/**
 * Creates the hover-card part set: `Trigger`, `Content`. Same closure shape as
 * `tooltip`, plus the crossing contract — pointer-ownership flags let the
 * pointer travel from trigger into content without closing, and hovering the
 * content re-arms the open state with zero delays. Call in component scope so
 * the state machine's effect disposes with the component.
 *
 * ```tsx
 * const Card = hoverCard({ openDelay: 200, closeDelay: 300 });
 *
 * <Card.Trigger>@hellajs</Card.Trigger>
 * <Card.Content side="bottom">...</Card.Content>
 * ```
 * @param options `open` getter + `onOpenChange` + the `openDelay` (default 200) and `closeDelay` (default 300) timings.
 * @returns The two part components, composed as `Card.Trigger`-style members.
 */
export function hoverCard(options: HoverCardOptions = {}): HoverCardParts {
  const s = hoverOpenState(options);
  const openDelay = options.openDelay ?? 200;
  const closeDelay = options.closeDelay ?? 300;
  let triggerNode: Element | undefined;

  // Pointer ownership flags: each region's close only fires when the pointer
  // has not moved into the other region, so crossing trigger → content never
  // closes and returning content → trigger cancels the content's own close.
  let overTrigger = false;
  let overContent = false;

  const openFromTrigger = (): void => {
    overTrigger = true;
    overContent = false;
    s.setOpen(true);
  };
  const closeFromTrigger = (): void => {
    if (overContent) return;
    overTrigger = false;
    s.setOpen(false);
  };
  const openFromContent = (): void => {
    overContent = true;
    overTrigger = false;
    s.setOpen(true);
  };
  const closeFromContent = (): void => {
    if (overTrigger) return;
    overContent = false;
    s.setOpen(false);
  };

  const Trigger = (props: HoverCardTriggerProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    const disposals: (() => void)[] = [];
    return (
      <span
        data-slot="hover-card-trigger"
        class={cls}
        {...attrs}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          triggerNode = node;
          // hoverIntent stays armed for the trigger's lifetime - reopen works
          // without a remount.
          disposals.push(
            hoverIntent(node, {
              onOpen: openFromTrigger,
              onClose: closeFromTrigger,
              openDelay,
              closeDelay,
            }),
          );
          // A re-enter on an already-open trigger short-circuits inside
          // hoverIntent's enter (before onOpen), so the ownership flags are
          // maintained by dedicated listeners.
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
        {children}
      </span>
    );
  };

  const Content = (props: HoverCardContentProps): JSX.Element => {
    const {
      children,
      class: cls,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      alignOffset: alignOffsetProp,
      anchor: anchorProp,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "bottom";
    const align = alignProp ?? "center";
    const sideOffset = sideOffsetProp ?? 4;
    const alignOffset = alignOffsetProp ?? 0;
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                data-slot="hover-card-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                class={cls}
                {...attrs}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () => anchorProp?.() ?? triggerNode,
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    focusTarget: heldFocus,
                    onDismiss: () => s.setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                    // Keep-open wiring shares the armed lifecycle: hovering the
                    // content re-opens instantly, leaving it closes immediately.
                    arm: (push) => {
                      push(
                        hoverIntent(node, {
                          onOpen: openFromContent,
                          onClose: closeFromContent,
                          openDelay: 0,
                          closeDelay: 0,
                        }),
                      );
                    },
                  });
                }}
              >
                {children}
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  return { Trigger, Content };
}
