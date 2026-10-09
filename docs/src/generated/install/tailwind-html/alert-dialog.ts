import { effect, signal } from "@hellajs/core";
import { html, onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
};

/** Accessibility state shared by the animated dialog parts. */
type AlertDialogState = () => "open" | "closed";

/** Button variant union carried by the Action/Cancel buttons (mirrors the emitted ButtonProps). */
type ActionVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

/** Button size union carried by the Action/Cancel buttons (mirrors the emitted ButtonProps). */
type ActionSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

interface AlertDialogOverlayProps extends HTMLAttributes<"div"> {
  state?: AlertDialogState;
  class?: string;
}

export function AlertDialogOverlay({ state, class: cls, ...attrs }: AlertDialogOverlayProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-overlay"
      data-state="${() => state?.()}"
      class="${
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }"
      ...${attrs}
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

interface AlertDialogTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function AlertDialogTrigger({ children, class: cls, ...attrs }: AlertDialogTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-trigger"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AlertDialogContentProps extends HTMLAttributes<"div"> {
  state?: AlertDialogState;
  size?: "default" | "sm";
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
export function AlertDialogContent({ state, size, closeOnEscape, onClose, onExited, children, class: cls, ...attrs }: AlertDialogContentProps): HellaNode {
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
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (state?.() === "closed") disposeWirings();
    else installWirings();
  });

  return html`
    <div
      data-slot="alert-dialog-content"
      data-state="${() => state?.()}"
      data-size="${size ?? "default"}"
      role="alertdialog"
      aria-modal="true"
      class="${
        cn("group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[size=sm]:max-w-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-lg", cls)
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
    </div>
  ` as HellaNode;
}

interface AlertDialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogHeader({ children, class: cls, ...attrs }: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-header"
      class="${
        cn("grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function AlertDialogFooter({ children, class: cls, ...attrs }: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-footer"
      class="${
        cn("flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AlertDialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogTitle({ id, children, class: cls, ...attrs }: AlertDialogTitleProps): HellaNode {
  return html`
    <h2
      id="${id}"
      data-slot="alert-dialog-title"
      class="${
        cn("text-lg font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2", cls)
      }"
      ...${attrs}
    >${() => children}</h2>
  ` as HellaNode;
}

interface AlertDialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogDescription({ id, children, class: cls, ...attrs }: AlertDialogDescriptionProps): HellaNode {
  return html`
    <p
      id="${id}"
      data-slot="alert-dialog-description"
      class="${
        cn("text-sm text-muted-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

export function AlertDialogMedia({ children, class: cls, ...attrs }: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-media"
      class="${
        cn("mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AlertDialogActionProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The confirm button - a composed Button (default variant) calling the close path. */
export function AlertDialogAction({ variant, size, onClose, "on:click": userClick, children, class: cls, ...attrs }: AlertDialogActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-action"
      data-variant="${variant ?? "default"}"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", buttonVariants[variant ?? "default"], buttonSizes[size ?? "default"], cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onClose?.(); }}"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AlertDialogCancelProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The dismiss button - a composed Button (outline variant) calling the close path. */
export function AlertDialogCancel({ variant, size, onClose, "on:click": userClick, children, class: cls, ...attrs }: AlertDialogCancelProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      data-variant="${variant ?? "outline"}"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", buttonVariants[variant ?? "outline"], buttonSizes[size ?? "default"], cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onClose?.(); }}"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AlertDialogProps extends HTMLAttributes<"div"> {
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

export default function AlertDialog({ open, onClose, title: titleText, description: descriptionText, size, closeOnEscape, children, class: cls, ...attrs }: AlertDialogProps): HellaNode {
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
        AlertDialogOverlay({ state }) as HellaChild,
        AlertDialogContent({
          state,
          size,
          "aria-labelledby": titleId,
          "aria-describedby": descriptionText === undefined ? undefined : descriptionId,
          closeOnEscape,
          onClose,
          onExited: finishExit,
          class: cls,
          ...attrs,
          children: [
            ...(titleText !== undefined ? [AlertDialogTitle({ id: titleId, children: titleText }) as HellaChild] : []),
            ...(descriptionText !== undefined ? [AlertDialogDescription({ id: descriptionId, children: descriptionText }) as HellaChild] : []),
            ...(children === undefined ? [] : Array.isArray(children) ? children : [children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
