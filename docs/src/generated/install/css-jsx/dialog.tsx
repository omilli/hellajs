import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style("dialog-overlay", {
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
});

const content = style("dialog-content", {
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
});

const close = style("dialog-close", {
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
});

const header = style("dialog-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  textAlign: "center",
  "@media (min-width: 40rem)": {
    "&": {
      textAlign: "left",
    },
  },
});

const footer = style("dialog-footer", {
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
});

const title = style("dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
});

const description = style("dialog-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

/** Accessibility state shared by the animated dialog parts. */
type DialogState = () => "open" | "closed";

interface DialogOverlayProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  class?: string;
}

export function DialogOverlay({ state, class: cls, ...attrs }: DialogOverlayProps): JSX.Element {
  return (
    <div
      data-slot="dialog-overlay"
      data-state={state?.()}
      class={
        [base, cls]
      }
      {...attrs}
    />
  );
}

interface DialogCloseProps extends HTMLAttributes<"button"> {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

export function DialogClose({ state, onClose, "on:click": userClick, class: cls, ...attrs }: DialogCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="dialog-close"
      data-state={state?.()}
      class={
        [close, cls]
      }
      on:click={function (e) { userClick?.call(this, e); onClose?.(); }}
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
export function DialogContent({ state, showCloseButton, closeOnEscape, closeOnOutside, onClose, onExited, children, class: cls, ...attrs }: DialogContentProps): JSX.Element {
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

  return (
    <div
      data-slot="dialog-content"
      data-state={state?.()}
      role="dialog"
      aria-modal="true"
      class={
        [content, cls]
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
      {showCloseButton !== false && (
        <DialogClose state={state} onClose={onClose} />
      )}
    </div>
  );
}

interface DialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogHeader({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      class={
        [header, cls]
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
        [footer, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface DialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogTitle({ id, children, class: cls, ...attrs }: DialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="dialog-title"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

interface DialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function DialogDescription({ id, children, class: cls, ...attrs }: DialogDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="dialog-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </p>
  );
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

export default function Dialog({ open, onClose, title: titleText, description: descriptionText, showCloseButton, closeOnEscape, closeOnOutside, children, class: cls, ...attrs }: DialogProps): JSX.Element {
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
      {() => visible() && (
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
            children={[
              ...(titleText !== undefined ? [<DialogTitle id={titleId}>{titleText}</DialogTitle>] : []),
              ...(descriptionText !== undefined ? [<DialogDescription id={descriptionId}>{descriptionText}</DialogDescription>] : []),
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
