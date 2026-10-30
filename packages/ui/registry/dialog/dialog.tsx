import { effect, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import { modal } from "@hellajs/headless/utils";
import type {
  DialogOverlayProps,
  DialogCloseProps,
  DialogContentProps,
  DialogPartProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogProps,
} from "./dialog-types.js";

// @hella:styles
declare const base: string;
declare const close: string;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

/** Accessibility state shared by the animated dialog parts. */

export function DialogOverlay({ state, class: cls, ...attrs }: DialogOverlayProps): JSX.Element {
  return (
    <div
      data-slot="dialog-overlay"
      data-state={state?.()}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function DialogClose({
  state,
  onClose,
  "on:click": userClick,
  class: cls,
  ...attrs
}: DialogCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="dialog-close"
      data-state={state?.()}
      class={
        // @hella:compose
        [close, cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onClose?.();
      }}
      {...attrs}
    >
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
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span class="sr-only">Close</span>
    </button>
  );
}

/**
 * The dialog panel. Manual composition portals it alongside a DialogOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the Dialog export below shows the wired composition).
 */
export function DialogContent({
  state,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: DialogContentProps): JSX.Element {
  return (
    <div
      data-slot="dialog-content"
      data-state={state?.()}
      role="dialog"
      aria-modal="true"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        // A manual composition without a state getter arms permanently and
        // disposes with the panel.
        modal(node, {
          state: state ?? (() => "open"),
          onClose,
          escape: closeOnEscape,
          outside: closeOnOutside,
          onExited,
        });
      }}
      {...attrs}
    >
      {children}
      {showCloseButton !== false && <DialogClose state={state} onClose={onClose} />}
    </div>
  );
}

export function DialogHeader({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      class={
        // @hella:compose
        [footer, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ id, children, class: cls, ...attrs }: DialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="dialog-title"
      class={
        // @hella:compose
        [title, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  id,
  children,
  class: cls,
  ...attrs
}: DialogDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="dialog-description"
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

let dialogCount = 0;

export function Dialog({
  open,
  onClose,
  title: titleText,
  description: descriptionText,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  children,
  class: cls,
  ...attrs
}: DialogProps): JSX.Element {
  const titleId = `hella-dialog-title-${++dialogCount}`;
  const descriptionId = `hella-dialog-description-${dialogCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
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
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 200ms duration budget) unmounts it.
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

  return (
    <>
      {() =>
        visible() && (
          <Portal to="body">
            <DialogOverlay state={state} />
            <DialogContent
              state={state}
              aria-labelledby={titleId}
              aria-describedby={descriptionText === undefined ? undefined : descriptionId}
              showCloseButton={showCloseButton}
              closeOnEscape={closeOnEscape}
              closeOnOutside={closeOnOutside}
              onClose={onClose}
              onExited={finishExit}
              class={cls}
              {...attrs}
              children={
                [
                  ...(titleText !== undefined
                    ? [<DialogTitle id={titleId}>{titleText}</DialogTitle>]
                    : []),
                  ...(descriptionText !== undefined
                    ? [<DialogDescription id={descriptionId}>{descriptionText}</DialogDescription>]
                    : []),
                  ...flattenChildren(children),
                ] as HellaChild[]
              }
            />
          </Portal>
        )
      }
    </>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
