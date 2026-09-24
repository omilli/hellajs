import { effect, signal } from "@hellajs/core";
import { onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";

// @hella:styles
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

export function AlertDialogOverlay(props: AlertDialogOverlayProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-overlay"
      data-state={props.state?.()}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
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

interface AlertDialogTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function AlertDialogTrigger(props: AlertDialogTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-trigger"
      class={
        // @hella:compose
        [props.class]
        // @hella:end
      }
    >
      {props.children}
    </button>
  );
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
export function AlertDialogContent(props: AlertDialogContentProps): JSX.Element {
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

  return (
    <div
      data-slot="alert-dialog-content"
      data-state={props.state?.()}
      data-size={props.size ?? "default"}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      class={
        // @hella:compose
        [content, props.class]
        // @hella:end
      }
      hook:afterMount={(node) => {
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
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
    >
      {props.children}
    </div>
  );
}

interface AlertDialogPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogHeader(props: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-header"
      class={
        // @hella:compose
        [header, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

export function AlertDialogFooter(props: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
      class={
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AlertDialogTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function AlertDialogTitle(props: AlertDialogTitleProps): JSX.Element {
  return (
    <h2
      id={props.id}
      data-slot="alert-dialog-title"
      class={
        // @hella:compose
        [title, props.class]
        // @hella:end
      }
    >
      {props.children}
    </h2>
  );
}

export function AlertDialogDescription(props: AlertDialogTitleProps): JSX.Element {
  return (
    <p
      id={props.id}
      data-slot="alert-dialog-description"
      class={
        // @hella:compose
        [description, props.class]
        // @hella:end
      }
    >
      {props.children}
    </p>
  );
}

export function AlertDialogMedia(props: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-media"
      class={
        // @hella:compose
        [media, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AlertDialogActionProps {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The confirm button - a composed Button (default variant) calling the close path. */
export function AlertDialogAction(props: AlertDialogActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-action"
      data-variant={props.variant ?? "default"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[props.variant ?? "default"], buttonSizes[props.size ?? "default"], props.class]
        // @hella:end
      }
      on:click={() => props.onClose?.()}
    >
      {props.children}
    </button>
  );
}

interface AlertDialogCancelProps {
  variant?: ActionVariant;
  size?: ActionSize;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The dismiss button - a composed Button (outline variant) calling the close path. */
export function AlertDialogCancel(props: AlertDialogCancelProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      data-variant={props.variant ?? "outline"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[props.variant ?? "outline"], buttonSizes[props.size ?? "default"], props.class]
        // @hella:end
      }
      on:click={() => props.onClose?.()}
    >
      {props.children}
    </button>
  );
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

export default function AlertDialog(props: AlertDialogProps): JSX.Element {
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

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <AlertDialogOverlay state={state} />
          <AlertDialogContent
            state={state}
            size={props.size}
            labelledBy={titleId}
            describedBy={props.description === undefined ? undefined : descriptionId}
            closeOnEscape={props.closeOnEscape}
            onClose={props.onClose}
            onExited={finishExit}
            class={props.class}
            children={[
              ...(props.title !== undefined ? [<AlertDialogTitle id={titleId}>{props.title}</AlertDialogTitle>] : []),
              ...(props.description !== undefined ? [<AlertDialogDescription id={descriptionId}>{props.description}</AlertDialogDescription>] : []),
              ...flattenChildren(props.children),
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
