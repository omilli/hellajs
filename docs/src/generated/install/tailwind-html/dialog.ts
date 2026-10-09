import { effect, signal } from "@hellajs/core";
import { html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

/** Accessibility state shared by the animated dialog parts. */
type DialogState = () => "open" | "closed";

interface DialogOverlayProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  class?: string;
}

export function DialogOverlay({ state, class: cls, ...attrs }: DialogOverlayProps): HellaNode {
  return html`
    <div
      data-slot="dialog-overlay"
      data-state="${() => state?.()}"
      class="${
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface DialogCloseProps extends HTMLAttributes<"button"> {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

export function DialogClose({ state, onClose, "on:click": userClick, class: cls, ...attrs }: DialogCloseProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="dialog-close"
      data-state="${() => state?.()}"
      class="${
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onClose?.(); }}"
      ...${attrs}
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
  ` as HellaNode;
}

interface DialogContentProps extends HTMLAttributes<"div"> {
  state?: DialogState;
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
export function DialogContent({ state, showCloseButton, closeOnEscape, closeOnOutside, onClose, onExited, children, class: cls, ...attrs }: DialogContentProps): HellaNode {
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  const installWirings = (): void => {
    if (panel === undefined || wirings.length > 0 || state?.() === "closed") return;
    const target = panel;
    if (closeOnEscape !== false && onClose) wirings.push(onEscape(target, onClose));
    if (closeOnOutside !== false && onClose) wirings.push(onOutside(() => [target], onClose));
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (state?.() === "closed") disposeWirings();
    else installWirings();
  });

  return html`
    <div
      data-slot="dialog-content"
      data-state="${() => state?.()}"
      role="dialog"
      aria-modal="true"
      class="${
        cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", cls)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        panel = node;
        installWirings();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (state?.() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >
      ${() => children}
      ${() => (showCloseButton !== false) && DialogClose({ state, onClose })}
    </div>
  ` as HellaNode;
}

interface DialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogHeader({ children, class: cls, ...attrs }: DialogPartProps): HellaNode {
  return html`
    <div
      data-slot="dialog-header"
      class="${
        cn("flex flex-col gap-2 text-center sm:text-left", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function DialogFooter({ children, class: cls, ...attrs }: DialogPartProps): HellaNode {
  return html`
    <div
      data-slot="dialog-footer"
      class="${
        cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface DialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogTitle({ id, children, class: cls, ...attrs }: DialogTitleProps): HellaNode {
  return html`
    <h2
      id="${id}"
      data-slot="dialog-title"
      class="${
        cn("text-lg leading-none font-semibold", cls)
      }"
      ...${attrs}
    >${() => children}</h2>
  ` as HellaNode;
}

interface DialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogDescription({ id, children, class: cls, ...attrs }: DialogDescriptionProps): HellaNode {
  return html`
    <p
      id="${id}"
      data-slot="dialog-description"
      class="${
        cn("text-sm text-muted-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

interface DialogProps extends HTMLAttributes<"div"> {
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

export default function Dialog({ open, onClose, title: titleText, description: descriptionText, showCloseButton, closeOnEscape, closeOnOutside, children, class: cls, ...attrs }: DialogProps): HellaNode {
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

  return html`
    ${() => visible() && Portal({
      to: "body",
      children: [
        DialogOverlay({ state }) as HellaChild,
        DialogContent({
          state,
          "aria-labelledby": titleId,
          "aria-describedby": descriptionText === undefined ? undefined : descriptionId,
          showCloseButton,
          closeOnEscape,
          closeOnOutside,
          onClose,
          onExited: finishExit,
          class: cls,
          ...attrs,
          children: [
            ...(titleText !== undefined ? [DialogTitle({ id: titleId, children: titleText }) as HellaChild] : []),
            ...(descriptionText !== undefined ? [DialogDescription({ id: descriptionId, children: descriptionText }) as HellaChild] : []),
            ...(children === undefined ? [] : Array.isArray(children) ? children : [children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
