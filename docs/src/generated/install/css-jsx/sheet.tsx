import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInTop = keyframes({ from: { opacity: "0", transform: "translateY(-100%)" } });
const slideOutTop = keyframes({ to: { opacity: "0", transform: "translateY(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
const slideInBottom = keyframes({ from: { opacity: "0", transform: "translateY(100%)" } });
const slideOutBottom = keyframes({ to: { opacity: "0", transform: "translateY(100%)" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });

const base = style("sheet-base", {
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

const content = style("sheet-content", {
  background: "var(--background)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
});

const contentSides = {
  right: style("sheet-content-right", {
    bottom: "0",
    borderLeft: "1px solid var(--border)",
    height: "100%",
    right: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInRight} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutRight} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
  left: style("sheet-content-left", {
    bottom: "0",
    borderRight: "1px solid var(--border)",
    height: "100%",
    left: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInLeft} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutLeft} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
  top: style("sheet-content-top", {
    borderBottom: "1px solid var(--border)",
    height: "auto",
    left: "0",
    right: "0",
    top: "0",
    "&[data-state='open']": {
      animation: `${slideInTop} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutTop} 300ms ease-in both`,
    },
  }),
  bottom: style("sheet-content-bottom", {
    borderTop: "1px solid var(--border)",
    bottom: "0",
    height: "auto",
    left: "0",
    right: "0",
    "&[data-state='open']": {
      animation: `${slideInBottom} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutBottom} 300ms ease-in both`,
    },
  }),
};

const close = style("sheet-close", {
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
    backgroundColor: "var(--secondary)",
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

const header = style("sheet-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  padding: "1rem",
});

const footer = style("sheet-footer", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
  padding: "1rem",
});

const title = style("sheet-title", {
  color: "var(--foreground)",
  fontWeight: "600",
});

const description = style("sheet-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

/** Accessibility state shared by the animated sheet parts. */
type SheetState = () => "open" | "closed";

/** Side the panel slides in from. */
type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetOverlayProps {
  state?: SheetState;
  class?: string;
}

export function SheetOverlay(props: SheetOverlayProps): JSX.Element {
  return (
    <div
      data-slot="sheet-overlay"
      data-state={props.state?.()}
      class={
        [base, props.class]
      }
    />
  );
}

interface SheetCloseProps {
  state?: SheetState;
  onClose?: () => void;
  class?: string;
}

export function SheetClose(props: SheetCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sheet-close"
      data-state={props.state?.()}
      class={
        [close, props.class]
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

interface SheetPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function SheetPortal(props: SheetPortalProps): JSX.Element {
  return (
    <Portal to="body">
      {props.children}
    </Portal>
  );
}

interface SheetTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function SheetTrigger(props: SheetTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sheet-trigger"
      class={
        [props.class]
      }
    >
      {props.children}
    </button>
  );
}

interface SheetContentProps {
  state?: SheetState;
  side?: SheetSide;
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
 * The sheet panel. Manual composition portals it alongside a SheetOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Sheet below shows the wired composition). The
 * Title/Description parts carry the required aria wiring through
 * labelledBy/describedBy - pass their generated ids even in manual
 * compositions, screen readers announce nothing without them.
 */
export function SheetContent(props: SheetContentProps): JSX.Element {
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

  const side = props.side ?? "right";

  return (
    <div
      data-slot="sheet-content"
      data-state={props.state?.()}
      data-side={side}
      role="dialog"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      class={
        [content, contentSides[side], props.class]
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
        <SheetClose state={props.state} onClose={props.onClose} />
      )}
    </div>
  );
}

interface SheetPartProps {
  children?: HellaChildren;
  class?: string;
}

export function SheetHeader(props: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-header"
      class={
        [header, props.class]
      }
    >
      {props.children}
    </div>
  );
}

export function SheetFooter(props: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-footer"
      class={
        [footer, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface SheetTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function SheetTitle(props: SheetTitleProps): JSX.Element {
  return (
    <h2
      id={props.id}
      data-slot="sheet-title"
      class={
        [title, props.class]
      }
    >
      {props.children}
    </h2>
  );
}

export function SheetDescription(props: SheetTitleProps): JSX.Element {
  return (
    <p
      id={props.id}
      data-slot="sheet-description"
      class={
        [description, props.class]
      }
    >
      {props.children}
    </p>
  );
}

interface SheetProps {
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

export default function Sheet(props: SheetProps): JSX.Element {
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
    if (props.open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 350);
    }
  });

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <SheetOverlay state={state} />
          <SheetContent
            state={state}
            side={props.side}
            labelledBy={titleId}
            describedBy={props.description === undefined ? undefined : descriptionId}
            showCloseButton={props.showCloseButton}
            closeOnEscape={props.closeOnEscape}
            closeOnOutside={props.closeOnOutside}
            onClose={props.onClose}
            onExited={finishExit}
            class={props.class}
            children={[
              ...(props.title !== undefined ? [<SheetTitle id={titleId}>{props.title}</SheetTitle>] : []),
              ...(props.description !== undefined ? [<SheetDescription id={descriptionId}>{props.description}</SheetDescription>] : []),
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
