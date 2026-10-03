import { effect, signal } from "@hellajs/core";
import { html, onEscape, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style({
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
}, { label: "hella-alert-dialog-base", layer: "hella" });

const content = style({
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
}, { label: "hella-alert-dialog-content", layer: "hella" });

const header = style({
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
}, { label: "hella-alert-dialog-header", layer: "hella" });

const footer = style({
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
}, { label: "hella-alert-dialog-footer", layer: "hella" });

const title = style({
  fontSize: "1.125rem",
  fontWeight: "600",
  "@media (min-width: 40rem)": {
    "&:is([data-size='default']:has([data-slot='alert-dialog-media']) *)": {
      gridColumnStart: "2",
    },
  },
}, { label: "hella-alert-dialog-title", layer: "hella" });

const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-alert-dialog-description", layer: "hella" });

const media = style({
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
}, { label: "hella-alert-dialog-media", layer: "hella" });

const buttonBase = style({
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
}, { label: "hella-alert-dialog-button", layer: "hella" });

const buttonVariants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "hella-alert-dialog-button-default", layer: "hella" }),
  destructive: style({
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
  }, { label: "hella-alert-dialog-button-destructive", layer: "hella" }),
  outline: style({
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
  }, { label: "hella-alert-dialog-button-outline", layer: "hella" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }, { label: "hella-alert-dialog-button-secondary", layer: "hella" }),
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "hella-alert-dialog-button-ghost", layer: "hella" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }, { label: "hella-alert-dialog-button-link", layer: "hella" }),
};

const buttonSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "hella-alert-dialog-button-size-default", layer: "hella" }),
  xs: style({
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
  }, { label: "hella-alert-dialog-button-size-xs", layer: "hella" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-alert-dialog-button-size-sm", layer: "hella" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "hella-alert-dialog-button-size-lg", layer: "hella" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "hella-alert-dialog-button-size-icon", layer: "hella" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-alert-dialog-button-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "hella-alert-dialog-button-size-icon-sm", layer: "hella" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "hella-alert-dialog-button-size-icon-lg", layer: "hella" }),
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

export function AlertDialogOverlay(props: AlertDialogOverlayProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-overlay"
      data-state="${() => props.state?.()}"
      class="${
        [base, props.class]
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
        [props.class]
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
        [content, props.class]
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
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AlertDialogFooter(props: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-footer"
      class="${
        [footer, props.class]
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
        [title, props.class]
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
        [description, props.class]
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

export function AlertDialogMedia(props: AlertDialogPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-dialog-media"
      class="${
        [media, props.class]
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
        [buttonBase, buttonVariants[props.variant ?? "default"], buttonSizes[props.size ?? "default"], props.class]
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
        [buttonBase, buttonVariants[props.variant ?? "outline"], buttonSizes[props.size ?? "default"], props.class]
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
