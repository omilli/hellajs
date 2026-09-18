import { effect, signal } from "@hellajs/core";
import { html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

/** Accessibility state shared by the animated dialog parts. */
type DialogState = () => "open" | "closed";

interface DialogOverlayProps {
  state?: DialogState;
  class?: string;
}

export function DialogOverlay(props: DialogOverlayProps): HellaNode {
  return html`
    <div
      data-slot="dialog-overlay"
      data-state="${() => props.state?.()}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    ></div>
  ` as HellaNode;
}

interface DialogCloseProps {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

export function DialogClose(props: DialogCloseProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="dialog-close"
      data-state="${() => props.state?.()}"
      class="${
        // @hella:compose
        [close, props.class]
        // @hella:end
      }"
      e:click="${() => props.onClose?.()}"
    ><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg><span class="sr-only">Close</span></button>
  ` as HellaNode;
}

interface DialogContentProps {
  state?: DialogState;
  labelledBy?: string;
  describedBy?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

/**
 * The dialog panel. Manual composition portals it alongside a DialogOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Dialog below shows the wired composition).
 */
export function DialogContent(props: DialogContentProps): HellaNode {
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  const installWirings = (): void => {
    if (panel === undefined || wirings.length > 0 || props.state?.() === "closed") return;
    const target = panel;
    if (props.closeOnEscape !== false && props.onClose) wirings.push(onEscape(target, props.onClose));
    if (props.closeOnOutside !== false && props.onClose) wirings.push(onOutside(() => [target], props.onClose));
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.state?.() === "closed") disposeWirings();
    else installWirings();
  });

  return html`
    <div
      data-slot="dialog-content"
      data-state="${() => props.state?.()}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${props.labelledBy}"
      aria-describedby="${props.describedBy}"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        panel = node;
        installWirings();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (props.state?.() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
    >
      ${() => props.children}
      ${() => (props.showCloseButton !== false) && DialogClose({ state: props.state, onClose: props.onClose })}
    </div>
  ` as HellaNode;
}

interface DialogPartProps {
  children?: HellaChildren;
  class?: string;
}

export function DialogHeader(props: DialogPartProps): HellaNode {
  return html`
    <div
      data-slot="dialog-header"
      class="${
        // @hella:compose
        [header, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function DialogFooter(props: DialogPartProps): HellaNode {
  return html`
    <div
      data-slot="dialog-footer"
      class="${
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface DialogTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function DialogTitle(props: DialogTitleProps): HellaNode {
  return html`
    <h2
      id="${props.id}"
      data-slot="dialog-title"
      class="${
        // @hella:compose
        [title, props.class]
        // @hella:end
      }"
    >${() => props.children}</h2>
  ` as HellaNode;
}

export function DialogDescription(props: DialogTitleProps): HellaNode {
  return html`
    <p
      id="${props.id}"
      data-slot="dialog-description"
      class="${
        // @hella:compose
        [description, props.class]
        // @hella:end
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface DialogProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}

let dialogCount = 0;

export default function Dialog(props: DialogProps): HellaNode {
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
    if (props.open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 250);
    }
  });

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return html`
    ${() => visible() && Portal({
      to: "body",
      children: [
        DialogOverlay({ state }) as HellaChild,
        DialogContent({
          state,
          labelledBy: titleId,
          describedBy: props.description === undefined ? undefined : descriptionId,
          showCloseButton: props.showCloseButton,
          closeOnEscape: props.closeOnEscape,
          closeOnOutside: props.closeOnOutside,
          onClose: props.onClose,
          onExited: finishExit,
          class: props.class,
          children: [
            ...(props.title !== undefined ? [DialogTitle({ id: titleId, children: props.title }) as HellaChild] : []),
            ...(props.description !== undefined ? [DialogDescription({ id: descriptionId, children: props.description }) as HellaChild] : []),
            ...(props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
