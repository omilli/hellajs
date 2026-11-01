import { signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import { anchoredLayer } from "./internal/anchoredLayer";
import { createExitMachine } from "./internal/exitMachine";
import type {
  PopoverAnchorProps,
  PopoverContentProps,
  PopoverDescriptionProps,
  PopoverOptions,
  PopoverPartProps,
  PopoverComponents,
  PopoverTriggerProps,
} from "./types/components";

let popoverCount = 0;

/**
 * The static popover structural parts: `Header`, `Title`, `Description`.
 * State-free, so the registry composes them without spinning a popover
 * state machine.
 *
 * ```tsx
 * <PopoverRows.Title>Settings</PopoverRows.Title>
 * ```
 */
export const PopoverRows = {
  Header: (props: PopoverPartProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="popover-header" class={cls} {...attrs}>
        {children}
      </div>
    );
  },
  Title: (props: PopoverPartProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="popover-title" class={cls} {...attrs}>
        {children}
      </div>
    );
  },
  Description: (props: PopoverDescriptionProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <p data-slot="popover-description" class={cls} {...attrs}>
        {children}
      </p>
    );
  },
};

/**
 * Creates the popover stateful part set: `Trigger`, `Anchor`, `Content`.
 * The closure owns the open state — controlled through an `open` getter when
 * passed, an internal signal when omitted — the exit machine, and the
 * generated content id. `Content` portals to `document.body`, anchors to the
 * `Anchor` node (then the `Trigger` node), and arms the anchored-layer engine
 * while open. The structural parts (`Header`, `Title`, `Description`) are the
 * static `PopoverRows`. Call in component scope so the state machine's
 * effect disposes with the component.
 *
 * ```tsx
 * const Popover = popover({ open, onOpenChange });
 *
 * <Popover.Trigger>Settings</Popover.Trigger>
 * <Popover.Content side="bottom">...</Popover.Content>
 * ```
 * @param options `open` getter + `onOpenChange` + optional `anchor` override; an omitted `open` keeps state internal.
 * @returns The stateful part components, composed as `Popover.Trigger`-style members.
 */
export function popover(options: PopoverOptions = {}): PopoverComponents {
  const open = options.open;
  const onOpenChange = options.onOpenChange;
  const anchorOverride = options.anchor;
  const internal = signal(false);
  const isOpen = (): boolean => (open !== undefined ? open() : internal());
  const setOpen = (next: boolean): void => {
    if (open === undefined) internal(next);
    onOpenChange?.(next);
  };
  const toggle = (): void => setOpen(!isOpen());

  const contentId = `hella-popover-content-${++popoverCount}`;
  let triggerNode: Element | undefined;
  let anchorNode: Element | undefined;
  const anchorOf = (): Element | undefined => anchorOverride?.() ?? anchorNode ?? triggerNode;

  // The shared visible/exit machine: `visible` alone gates the render so an
  // open→closed flip never unmounts before the exit starts (reading isOpen()
  // in the template would flash the subtree away one evaluation early); the
  // content stays mounted under data-state="closed" until its animationend
  // (or the fallback budget) unmounts it.
  const { visible, state, finishExit } = createExitMachine(isOpen);

  const Trigger = (props: PopoverTriggerProps): JSX.Element => {
    const { children, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="popover-trigger"
        data-state={state()}
        aria-expanded={isOpen() ? "true" : "false"}
        aria-haspopup="dialog"
        aria-controls={contentId}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          toggle();
        }}
        hook:afterMount={(node) => {
          triggerNode = node;
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Anchor = (props: PopoverAnchorProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span
        data-slot="popover-anchor"
        class={cls}
        hook:afterMount={(node) => {
          anchorNode = node;
        }}
        {...attrs}
      >
        {children}
      </span>
    );
  };

  const Content = (props: PopoverContentProps): JSX.Element => {
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
    const side = sideProp ?? "bottom";
    const align = alignProp ?? "center";
    const sideOffset = sideOffsetProp ?? 4;
    const alignOffset = alignOffsetProp ?? 0;
    // The gate is a region OUTSIDE the Portal: portals mount once, so the
    // whole portal must reconstruct per open for the mount walk (and the
    // engine's afterMount wiring) to run against fresh content.
    return (
      <>
        {() =>
          visible() && (
            <Portal to="body">
              <div
                role="dialog"
                tabindex="-1"
                id={id ?? contentId}
                data-slot="popover-content"
                data-state={state()}
                data-side={side}
                data-align={align}
                class={cls}
                {...attrs}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state,
                    anchor: () => anchorProp?.() ?? anchorOf(),
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    onDismiss: () => setOpen(false),
                    onExited: () => {
                      finishExit();
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

  return { Trigger, Anchor, Content };
}
