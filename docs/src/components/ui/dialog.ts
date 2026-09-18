import { effect, signal } from "@hellajs/core";
import { html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

// tw-animate-css equivalents, hand-rolled: fade in/out for the overlay,
// fade+zoom(95%) composed into the content's enter/exit keyframes.
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style({
  backgroundColor: "rgb(0 0 0 / 0.5)",
  inset: "0",
  position: "fixed",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
}, { label: "hella-dialog-overlay", layer: "hella" });

const content = style({
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  padding: "1.5rem",
  position: "fixed",
  top: "50%",
  translate: "-50% -50%",
  width: "100%",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&": {
      maxWidth: "32rem",
    },
  },
}, { label: "hella-dialog-content", layer: "hella" });

const close = style({
  borderRadius: "calc(var(--radius) * 0.2)",
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--accent)",
    color: "var(--muted-foreground)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  // The copied `sr-only` span: tailwind ships the utility, the css flavor
  // carries the same hiding recipe on the close part.
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
}, { label: "hella-dialog-close", layer: "hella" });

const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  textAlign: "center",
  "@media (min-width: 40rem)": {
    "&": {
      textAlign: "left",
    },
  },
}, { label: "hella-dialog-header", layer: "hella" });

const footer = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
}, { label: "hella-dialog-footer", layer: "hella" });

const title = style({
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
}, { label: "hella-dialog-title", layer: "hella" });

const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-dialog-description", layer: "hella" });

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
        [base, props.class]
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
        [close, props.class]
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
        [content, props.class]
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
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function DialogFooter(props: DialogPartProps): HellaNode {
  return html`
    <div
      data-slot="dialog-footer"
      class="${
        [footer, props.class]
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
        [title, props.class]
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
        [description, props.class]
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
