import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

/** Accessibility state shared by the animated dialog parts. */
type DialogState = () => "open" | "closed";

interface DialogOverlayProps {
  state?: DialogState;
  class?: string;
}

export function DialogOverlay(props: DialogOverlayProps): JSX.Element {
  return (
    <div
      data-slot="dialog-overlay"
      data-state={props.state?.()}
      class={
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", props.class)
      }
    />
  );
}

interface DialogCloseProps {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

export function DialogClose(props: DialogCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="dialog-close"
      data-state={props.state?.()}
      class={
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", props.class)
      }
      on:click={() => props.onClose?.()}
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
export function DialogContent(props: DialogContentProps): JSX.Element {
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

  return (
    <div
      data-slot="dialog-content"
      data-state={props.state?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      class={
        cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", props.class)
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
      {props.showCloseButton !== false && (
        <DialogClose state={props.state} onClose={props.onClose} />
      )}
    </div>
  );
}

interface DialogPartProps {
  children?: HellaChildren;
  class?: string;
}

export function DialogHeader(props: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      class={
        cn("flex flex-col gap-2 text-center sm:text-left", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function DialogFooter(props: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      class={
        cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", props.class)
      }
    >
      {props.children}
    </div>
  );
}

interface DialogTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function DialogTitle(props: DialogTitleProps): JSX.Element {
  return (
    <h2
      id={props.id}
      data-slot="dialog-title"
      class={
        cn("text-lg leading-none font-semibold", props.class)
      }
    >
      {props.children}
    </h2>
  );
}

export function DialogDescription(props: DialogTitleProps): JSX.Element {
  return (
    <p
      id={props.id}
      data-slot="dialog-description"
      class={
        cn("text-sm text-muted-foreground", props.class)
      }
    >
      {props.children}
    </p>
  );
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

export default function Dialog(props: DialogProps): JSX.Element {
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

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <DialogOverlay state={state} />
          <DialogContent
            state={state}
            labelledBy={titleId}
            describedBy={props.description === undefined ? undefined : descriptionId}
            showCloseButton={props.showCloseButton}
            closeOnEscape={props.closeOnEscape}
            closeOnOutside={props.closeOnOutside}
            onClose={props.onClose}
            onExited={finishExit}
            class={props.class}
            children={[
              ...(props.title !== undefined ? [<DialogTitle id={titleId}>{props.title}</DialogTitle>] : []),
              ...(props.description !== undefined ? [<DialogDescription id={descriptionId}>{props.description}</DialogDescription>] : []),
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
