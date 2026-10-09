import { effect, signal } from "@hellajs/core";
import { html, onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

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
        [base, cls]
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
        [cls]
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
        [content, cls]
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
        [header, cls]
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
        [footer, cls]
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
        [title, cls]
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
        [description, cls]
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
        [media, cls]
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
        [buttonBase, buttonVariants[variant ?? "default"], buttonSizes[size ?? "default"], cls]
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
        [buttonBase, buttonVariants[variant ?? "outline"], buttonSizes[size ?? "default"], cls]
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
