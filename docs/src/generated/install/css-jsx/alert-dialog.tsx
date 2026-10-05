import { effect, signal } from "@hellajs/core";
import { onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style("alert-dialog-base", {
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

const content = style("alert-dialog-content", {
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
  "&[data-size='sm']": {
    maxWidth: "20rem",
  },
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&[data-size='default']": {
      maxWidth: "32rem",
    },
  },
});

const header = style("alert-dialog-header", {
  display: "grid",
  gap: "0.375rem",
  gridTemplateRows: "auto 1fr",
  placeItems: "center",
  textAlign: "center",
  "&:has([data-slot='alert-dialog-media'])": {
    columnGap: "1.5rem",
    gridTemplateRows: "auto auto 1fr",
  },
  "@media (min-width: 40rem)": {
    "&:is([data-size='default'] *)": {
      placeItems: "start",
      textAlign: "left",
    },
    "&:is([data-size='default']:has([data-slot='alert-dialog-media']) *)": {
      gridTemplateRows: "auto 1fr",
    },
  },
});

const footer = style("alert-dialog-footer", {
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "&:is([data-size='sm'] *)": {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
});

const title = style("alert-dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  "@media (min-width: 40rem)": {
    "&:is([data-size='default']:has([data-slot='alert-dialog-media']) *)": {
      gridColumnStart: "2",
    },
  },
});

const description = style("alert-dialog-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

const media = style("alert-dialog-media", {
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "inline-flex",
  height: "4rem",
  justifyContent: "center",
  marginBottom: "0.5rem",
  width: "4rem",
  "& svg:not([class*='size-'])": {
    height: "2rem",
    width: "2rem",
  },
  "@media (min-width: 40rem)": {
    "&:is([data-size='default'] *)": {
      gridRow: "span 2 / span 2",
    },
  },
});

const buttonBase = style("alert-dialog-button", {
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
});

const buttonVariants = {
  default: style("alert-dialog-button-default", {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }),
  destructive: style("alert-dialog-button-destructive", {
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
  }),
  outline: style("alert-dialog-button-outline", {
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }),
  secondary: style("alert-dialog-button-secondary", {
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }),
  ghost: style("alert-dialog-button-ghost", {
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }),
  link: style("alert-dialog-button-link", {
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

const buttonSizes = {
  default: style("alert-dialog-button-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("alert-dialog-button-size-xs", {
    borderRadius: "calc(var(--radius) * 0.8)",
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  sm: style("alert-dialog-button-size-sm", {
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("alert-dialog-button-size-lg", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("alert-dialog-button-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("alert-dialog-button-size-icon-xs", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("alert-dialog-button-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("alert-dialog-button-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

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
        [base, props.class]
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
        [props.class]
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
        [content, props.class]
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
        [header, props.class]
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
        [footer, props.class]
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
        [title, props.class]
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
        [description, props.class]
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
        [media, props.class]
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
        [buttonBase, buttonVariants[props.variant ?? "default"], buttonSizes[props.size ?? "default"], props.class]
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
        [buttonBase, buttonVariants[props.variant ?? "outline"], buttonSizes[props.size ?? "default"], props.class]
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
