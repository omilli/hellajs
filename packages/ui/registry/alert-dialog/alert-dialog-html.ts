import { effect, signal } from "@hellajs/core";
import { html, onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const media: string;
declare const title: string;
// @hella:end

/** Accessibility state shared by the animated dialog parts. */
type AlertDialogState = () => "open" | "closed";

/** Button variant union carried by the Action/Cancel buttons (mirrors the emitted ButtonProps). */
type ActionVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

/** Button size union carried by the Action/Cancel buttons (mirrors the emitted ButtonProps). */
type ActionSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

interface AlertDialogOverlayProps {
  state?: AlertDialogState;
  class?: string;
}

export function AlertDialogOverlay(props: AlertDialogOverlayProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-overlay"
      data-state="${() => props.state?.()}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    ></div>
  ` as HellaNode;
}

interface AlertDialogPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function AlertDialogPortal(props: AlertDialogPortalProps): HellaNode {
  return Portal({ to: "body", children: props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children] }) as HellaNode;
}

interface AlertDialogTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function AlertDialogTrigger(props: AlertDialogTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-trigger"
      class="${
        // @hella:compose
        [props.class]
        // @hella:end
      }"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface AlertDialogContentProps {
  state?: AlertDialogState;
  size?: "default" | "sm";
  labelledBy?: string;
  describedBy?: string;
  closeOnEscape?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

/**
 * The alert dialog panel. Manual composition portals it alongside an
 * AlertDialogOverlay sibling - hella has no Radix context, so the
 * portal/overlay pairing is the composer's (the default AlertDialog below
 * shows the wired composition). Unlike DialogContent there is no outside
 * dismissal: Radix's AlertDialog semantics are escape-only by design.
 */
export function AlertDialogContent(props: AlertDialogContentProps): HellaNode {
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
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.state?.() === "closed") disposeWirings();
    else installWirings();
  });

  return html`
    <div
      data-slot="alert-dialog-content"
      data-state="${() => props.state?.()}"
      data-size="${props.size ?? "default"}"
      role="alertdialog"
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
    </div>
  ` as HellaNode;
}

interface AlertDialogPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogHeader(props: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-header"
      class="${
        // @hella:compose
        [header, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AlertDialogFooter(props: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-footer"
      class="${
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AlertDialogTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogTitle(props: AlertDialogTitleProps): HellaNode {
  return html`
    <h2
      id="${props.id}"
      data-slot="alert-dialog-title"
      class="${
        // @hella:compose
        [title, props.class]
        // @hella:end
      }"
    >${() => props.children}</h2>
  ` as HellaNode;
}

export function AlertDialogDescription(props: AlertDialogTitleProps): HellaNode {
  return html`
    <p
      id="${props.id}"
      data-slot="alert-dialog-description"
      class="${
        // @hella:compose
        [description, props.class]
        // @hella:end
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

export function AlertDialogMedia(props: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-media"
      class="${
        // @hella:compose
        [media, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AlertDialogActionProps {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The confirm button - a composed Button (default variant) calling the close path. */
export function AlertDialogAction(props: AlertDialogActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-action"
      data-variant="${props.variant ?? "default"}"
      class="${
        // @hella:compose
        [buttonBase, buttonVariants[props.variant ?? "default"], buttonSizes[props.size ?? "default"], props.class]
        // @hella:end
      }"
      on:click="${() => props.onClose?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface AlertDialogCancelProps {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The dismiss button - a composed Button (outline variant) calling the close path. */
export function AlertDialogCancel(props: AlertDialogCancelProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      data-variant="${props.variant ?? "outline"}"
      class="${
        // @hella:compose
        [buttonBase, buttonVariants[props.variant ?? "outline"], buttonSizes[props.size ?? "default"], props.class]
        // @hella:end
      }"
      on:click="${() => props.onClose?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface AlertDialogProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "default" | "sm";
  closeOnEscape?: boolean;
  class?: string;
  children?: HellaChildren;
}

let alertDialogCount = 0;

export default function AlertDialog(props: AlertDialogProps): HellaNode {
  const titleId = `hella-alert-dialog-title-${++alertDialogCount}`;
  const descriptionId = `hella-alert-dialog-description-${alertDialogCount}`;
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
        AlertDialogOverlay({ state }) as HellaChild,
        AlertDialogContent({
          state,
          size: props.size,
          labelledBy: titleId,
          describedBy: props.description === undefined ? undefined : descriptionId,
          closeOnEscape: props.closeOnEscape,
          onClose: props.onClose,
          onExited: finishExit,
          class: props.class,
          children: [
            ...(props.title !== undefined ? [AlertDialogTitle({ id: titleId, children: props.title }) as HellaChild] : []),
            ...(props.description !== undefined ? [AlertDialogDescription({ id: descriptionId, children: props.description }) as HellaChild] : []),
            ...(props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
