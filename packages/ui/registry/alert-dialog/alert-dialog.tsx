import { effect, signal } from "@hellajs/core";
import { onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

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

interface AlertDialogOverlayProps extends HTMLAttributes<"div"> {
  state?: AlertDialogState;
  class?: string;
}

export function AlertDialogOverlay({ state, class: cls, ...attrs }: AlertDialogOverlayProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-overlay"
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

interface AlertDialogPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function AlertDialogPortal(props: AlertDialogPortalProps): JSX.Element {
  return (
    <Portal to="body">
      {props.children}
    </Portal>
  );
}

interface AlertDialogTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function AlertDialogTrigger({ children, class: cls, ...attrs }: AlertDialogTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-trigger"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
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
export function AlertDialogContent({ state, size, closeOnEscape, onClose, onExited, children, class: cls, ...attrs }: AlertDialogContentProps): JSX.Element {
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

  return (
    <div
      data-slot="alert-dialog-content"
      data-state={state?.()}
      data-size={size ?? "default"}
      role="alertdialog"
      aria-modal="true"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
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
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AlertDialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogHeader({ children, class: cls, ...attrs }: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-header"
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

export function AlertDialogFooter({ children, class: cls, ...attrs }: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
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

interface AlertDialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogTitle({ id, children, class: cls, ...attrs }: AlertDialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="alert-dialog-title"
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

interface AlertDialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogDescription({ id, children, class: cls, ...attrs }: AlertDialogDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="alert-dialog-description"
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

export function AlertDialogMedia({ children, class: cls, ...attrs }: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-media"
      class={
        // @hella:compose
        [media, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AlertDialogActionProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The confirm button - a composed Button (default variant) calling the close path. */
export function AlertDialogAction({ variant, size, onClose, "on:click": userClick, children, class: cls, ...attrs }: AlertDialogActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-action"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[variant ?? "default"], buttonSizes[size ?? "default"], cls]
        // @hella:end
      }
      on:click={function (e) { userClick?.call(this, e); onClose?.(); }}
      {...attrs}
    >
      {children}
    </button>
  );
}

interface AlertDialogCancelProps extends HTMLAttributes<"button"> {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The dismiss button - a composed Button (outline variant) calling the close path. */
export function AlertDialogCancel({ variant, size, onClose, "on:click": userClick, children, class: cls, ...attrs }: AlertDialogCancelProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      data-variant={variant ?? "outline"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[variant ?? "outline"], buttonSizes[size ?? "default"], cls]
        // @hella:end
      }
      on:click={function (e) { userClick?.call(this, e); onClose?.(); }}
      {...attrs}
    >
      {children}
    </button>
  );
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

export default function AlertDialog({ open, onClose, title: titleText, description: descriptionText, size, closeOnEscape, children, class: cls, ...attrs }: AlertDialogProps): JSX.Element {
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

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <AlertDialogOverlay state={state} />
          <AlertDialogContent
            state={state}
            size={size}
            aria-labelledby={titleId}
            aria-describedby={descriptionText === undefined ? undefined : descriptionId}
            closeOnEscape={closeOnEscape}
            onClose={onClose}
            onExited={finishExit}
            class={cls}
            {...attrs}
            children={[
              ...(titleText !== undefined ? [<AlertDialogTitle id={titleId}>{titleText}</AlertDialogTitle>] : []),
              ...(descriptionText !== undefined ? [<AlertDialogDescription id={descriptionId}>{descriptionText}</AlertDialogDescription>] : []),
              ...flattenChildren(children),
            ] as HellaChild[]}
          />
        </Portal>
      )}
    </>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
