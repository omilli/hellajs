import { signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import { createExitMachine } from "./internal/exitMachine";
import { modal } from "./utils/modal";
import type {
  DialogCloseProps,
  DialogComponents,
  DialogContentProps,
  DialogOptions,
  DialogOverlayProps,
  DialogTriggerProps,
} from "./types/components";

let dialogCount = 0;

/**
 * Creates the dialog part set: `Trigger`, `Overlay`, `Content`, `Close`. The
 * closure owns the open state — controlled through an `open` getter when
 * passed, an internal signal when omitted — the exit machine, and the
 * generated content id. `Content` portals to `document.body` (the structural
 * overlay, or the `overlay` slot's element, renders as the panel's body
 * sibling) and arms the modal engine — focus trap, Escape/outside dismissal,
 * exit notification — while open; `portal: false` renders the bare panel
 * inline for manual compositions instead. There is no `defaultOpen`: portaled
 * surfaces start closed and open only after mount. Call in component scope so
 * the state machine's effect disposes with the component.
 *
 * ```tsx
 * const Dialog = dialog({ open, onOpenChange });
 *
 * <Dialog.Trigger>Open</Dialog.Trigger>
 * <Dialog.Content>...</Dialog.Content>
 * ```
 * @param options `open` getter + `onOpenChange` + `fallbackMs` exit budget; an omitted `open` keeps state internal.
 * @returns The four part components, composed as `Dialog.Trigger`-style members.
 */
export function dialog(options: DialogOptions = {}): DialogComponents {
  const open = options.open;
  const onOpenChange = options.onOpenChange;
  const fallbackMs = options.fallbackMs;
  const internal = signal(false);
  const isOpen = (): boolean => (open !== undefined ? open() : internal());
  const setOpen = (next: boolean): void => {
    if (open === undefined) internal(next);
    onOpenChange?.(next);
  };
  const toggle = (): void => setOpen(!isOpen());

  const contentId = `hella-dialog-content-${++dialogCount}`;

  // The shared visible/exit machine: `visible` alone gates the render so an
  // open→closed flip never unmounts before the exit starts; the content stays
  // mounted under data-state="closed" until its animationend (or the
  // fallbackMs budget) unmounts it.
  const { visible, state, finishExit } = createExitMachine(isOpen, fallbackMs);

  const Trigger = (props: DialogTriggerProps): JSX.Element => {
    const { children, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="dialog-trigger"
        data-state={state()}
        aria-expanded={isOpen() ? "true" : "false"}
        aria-haspopup="dialog"
        aria-controls={contentId}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          toggle();
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Overlay = (props: DialogOverlayProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div data-slot="dialog-overlay" data-state={state()} class={cls} {...attrs} />;
  };

  const Content = (props: DialogContentProps): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      escape,
      outside,
      onExited,
      overlay: overlaySlot,
      portal = true,
      "hook:afterMount": userMount,
      ...attrs
    } = props;
    const renderPanel = (): JSX.Element => (
      <div
        role="dialog"
        aria-modal="true"
        id={id ?? contentId}
        data-slot="dialog-content"
        data-state={state()}
        class={cls}
        {...attrs}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          modal(node, {
            state,
            onClose: () => setOpen(false),
            escape,
            outside,
            // The portaled gate unmounts through the exit machine; the inline
            // panel has no gate, so the exit notification is the caller's alone.
            onExited: portal
              ? () => {
                  finishExit();
                  onExited?.();
                }
              : onExited,
          });
          userMount?.(node);
        }}
      >
        {children}
      </div>
    );
    if (!portal) return renderPanel();
    // The gate is a region OUTSIDE the Portal: portals mount once, so the
    // whole portal must reconstruct per open for the mount walk (and modal's
    // afterMount wiring) to run against fresh content. The overlay mounts as
    // the panel's body sibling — the factory's structural div, or the slot's
    // styled element threaded the closure's state getter.
    return (
      <>
        {() =>
          visible() && (
            <Portal to="body">
              {overlaySlot ? overlaySlot(state) : <Overlay />}
              {renderPanel()}
            </Portal>
          )
        }
      </>
    );
  };

  const Close = (props: DialogCloseProps): JSX.Element => {
    const { children, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="dialog-close"
        data-state={state()}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          setOpen(false);
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  return { Trigger, Overlay, Content, Close };
}
