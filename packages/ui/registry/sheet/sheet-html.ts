import { effect, signal } from "@hellajs/core";
import { html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const close: string;
declare const content: string;
declare const contentSides: Record<string, string>;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

/** Accessibility state shared by the animated sheet parts. */
type SheetState = () => "open" | "closed";

/** Side the panel slides in from. */
type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetOverlayProps extends HTMLAttributes<"div"> {
  state?: SheetState;
  class?: string;
}

export function SheetOverlay({ state, class: cls, ...attrs }: SheetOverlayProps): HellaNode {
  return html`
    <div
      data-slot="sheet-overlay"
      data-state="${() => state?.()}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface SheetCloseProps extends HTMLAttributes<"button"> {
  state?: SheetState;
  onClose?: () => void;
  class?: string;
}

export function SheetClose({ state, onClose, "on:click": userClick, class: cls, ...attrs }: SheetCloseProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sheet-close"
      data-state="${() => state?.()}"
      class="${
        // @hella:compose
        [close, cls]
        // @hella:end
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

interface SheetPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function SheetPortal(props: SheetPortalProps): HellaNode {
  return Portal({ to: "body", children: props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children] }) as HellaNode;
}

interface SheetTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function SheetTrigger({ children, class: cls, ...attrs }: SheetTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sheet-trigger"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface SheetContentProps extends HTMLAttributes<"div"> {
  state?: SheetState;
  side?: SheetSide;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

/**
 * The sheet panel. Manual composition portals it alongside a SheetOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Sheet below shows the wired composition). The
 * Title/Description parts carry the required aria wiring: pass their
 * generated ids as the panel's `aria-labelledby`/`aria-describedby` attrs
 * even in manual compositions, screen readers announce nothing without them.
 */
export function SheetContent({ state, side, showCloseButton, closeOnEscape, closeOnOutside, onClose, onExited, children, class: cls, ...attrs }: SheetContentProps): HellaNode {
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

  const resolvedSide = side ?? "right";

  return html`
    <div
      data-slot="sheet-content"
      data-state="${() => state?.()}"
      data-side="${resolvedSide}"
      role="dialog"
      aria-modal="true"
      class="${
        // @hella:compose
        [content, contentSides[resolvedSide], cls]
        // @hella:end
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
      ${() => (showCloseButton !== false) && SheetClose({ state, onClose })}
    </div>
  ` as HellaNode;
}

interface SheetPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetHeader({ children, class: cls, ...attrs }: SheetPartProps): HellaNode {
  return html`
    <div
      data-slot="sheet-header"
      class="${
        // @hella:compose
        [header, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function SheetFooter({ children, class: cls, ...attrs }: SheetPartProps): HellaNode {
  return html`
    <div
      data-slot="sheet-footer"
      class="${
        // @hella:compose
        [footer, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface SheetTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetTitle({ id, children, class: cls, ...attrs }: SheetTitleProps): HellaNode {
  return html`
    <h2
      id="${id}"
      data-slot="sheet-title"
      class="${
        // @hella:compose
        [title, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</h2>
  ` as HellaNode;
}

interface SheetDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetDescription({ id, children, class: cls, ...attrs }: SheetDescriptionProps): HellaNode {
  return html`
    <p
      id="${id}"
      data-slot="sheet-description"
      class="${
        // @hella:compose
        [description, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

interface SheetProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  side?: SheetSide;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}

let sheetCount = 0;

export default function Sheet({ open, onClose, side, title: titleText, description: descriptionText, showCloseButton, closeOnEscape, closeOnOutside, children, class: cls, ...attrs }: SheetProps): HellaNode {
  const titleId = `hella-sheet-title-${++sheetCount}`;
  const descriptionId = `hella-sheet-description-${sheetCount}`;
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
  // (or the copied 300ms duration budget) unmounts it.
  effect(() => {
    if (open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 350);
    }
  });

  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return html`
    ${() => visible() && Portal({
      to: "body",
      children: [
        SheetOverlay({ state }) as HellaChild,
        SheetContent({
          state,
          side,
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
            ...(titleText !== undefined ? [SheetTitle({ id: titleId, children: titleText }) as HellaChild] : []),
            ...(descriptionText !== undefined ? [SheetDescription({ id: descriptionId, children: descriptionText }) as HellaChild] : []),
            ...(children === undefined ? [] : Array.isArray(children) ? children : [children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
