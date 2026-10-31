import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { dialog } from "@hellajs/headless";
import { Portal, registry } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";
import { onDrag } from "@hellajs/headless/utils";

type DrawerState = () => "open" | "closed";

type DrawerDirection = "top" | "right" | "bottom" | "left";

interface DrawerOverlayProps extends HTMLAttributes<"div"> {
  state?: DrawerState;
  /** Drag fraction (0..1 toward dismissal) — drives the proportional overlay fade. */
  fraction?: Signal<number>;
  class?: string;
}

interface DrawerCloseProps extends HTMLAttributes<"button"> {
  state?: DrawerState;
  onClose?: () => void;
  class?: string;
}

interface DrawerPortalProps {
  children?: HellaChildren;
}

interface DrawerTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

interface DrawerContentProps extends HTMLAttributes<"div"> {
  state?: DrawerState;
  direction?: DrawerDirection;
  /** Shared drag fraction (0..1 toward dismissal); the overlay fades proportionally when both parts receive the same signal. */
  fraction?: Signal<number>;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

interface DrawerPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface DrawerTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

interface DrawerDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

interface DrawerProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  direction?: DrawerDirection;
  title?: string;
  description?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}

import { css, keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

const base = style("drawer-base", {
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

const content = style("drawer-content", {
  background: tokens.background,
  display: "flex",
  flexDirection: "column",
  height: "auto",
  padding: "1rem",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
  "&[data-dragging='true']": {
    transitionProperty: "none",
  },
});

const contentDirections = {
  top: style("drawer-content-top", {
    borderBottom: `1px solid ${tokens.border}`,
    borderRadius: `0 0 ${tokens.radius} ${tokens.radius}`,
    left: "0",
    marginBottom: "6rem",
    maxHeight: "80vh",
    right: "0",
    top: "0",
  }),
  bottom: style("drawer-content-bottom", {
    borderTop: `1px solid ${tokens.border}`,
    borderRadius: `${tokens.radius} ${tokens.radius} 0 0`,
    bottom: "0",
    left: "0",
    marginTop: "6rem",
    maxHeight: "80vh",
    right: "0",
  }),
  right: style("drawer-content-right", {
    borderLeft: `1px solid ${tokens.border}`,
    bottom: "0",
    right: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
  left: style("drawer-content-left", {
    borderRight: `1px solid ${tokens.border}`,
    bottom: "0",
    left: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
};

const close = style("drawer-close", {
  borderRadius: `calc(${tokens.radius} * 0.2)`,
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: `0 0 0 2px ${tokens.background}, 0 0 0 4px ${tokens.ring}`,
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: tokens.secondary,
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

css({
  "[data-slot='drawer-content'] [data-slot='drawer-handle']": {
    display: "none",
  },
  "[data-slot='drawer-content'][data-vaul-drawer-direction='bottom'] [data-slot='drawer-handle']": {
    backgroundColor: tokens.muted,
    borderRadius: "calc(infinity * 1px)",
    display: "block",
    flexShrink: "0",
    height: "0.5rem",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "1rem",
    width: "100px",
  },
});

const header = style("drawer-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.125rem",
  "&:is([data-vaul-drawer-direction='bottom'] *)": {
    textAlign: "center",
  },
  "&:is([data-vaul-drawer-direction='top'] *)": {
    textAlign: "center",
  },
  "@media (min-width: 48rem)": {
    "&": {
      gap: "0.375rem",
      textAlign: "left",
    },
  },
});

const footer = style("drawer-footer", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
});

const title = style("drawer-title", {
  color: tokens.foreground,
  fontWeight: "600",
});

const description = style("drawer-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

/** Edge the drawer mounts on; drag dismissal runs along this axis. */

/** Release fraction of the panel's dismissal-axis size beyond which a release dismisses. */
const DISMISS_DISTANCE = 0.25;

/** Release velocity (px/s along the dismissal axis) beyond which a release dismisses. */
const DISMISS_VELOCITY = 500;

/** Fallback budget for the exit slide (the content transitions out via transform). */
const EXIT_FALLBACK_MS = 300;

const AXIS: Record<DrawerDirection, "x" | "y"> = { top: "y", bottom: "y", left: "x", right: "x" };
const SIGN: Record<DrawerDirection, 1 | -1> = { top: -1, left: -1, bottom: 1, right: 1 };
const EXIT_TRANSFORM: Record<DrawerDirection, string> = {
  top: "translateY(-100%)",
  bottom: "translateY(100%)",
  left: "translateX(-100%)",
  right: "translateX(100%)",
};

/** Clamped follow transform: displacement stops at the closed edge. */
function followTransform(direction: DrawerDirection, d: number): string {
  const axis = AXIS[direction] === "y" ? "Y" : "X";
  const clamped = SIGN[direction] === 1 ? Math.max(0, d) : Math.min(0, d);
  return `translate${axis}(${clamped}px)`;
}

/**
 * The drawer's drag seam, wired on the factory's panel node: the enter
 * slide-in (start off-edge, force the commit, release through the restored
 * transition), the close-flip slide-out, and the whole-panel drag follow with
 * its release dismissal. Local single-behavior wiring - the one raw-util
 * seam this paste keeps. Node-scoped effects, so everything disposes with
 * the panel.
 */
function wireDrawerSeam(
  node: HTMLElement,
  opts: {
    state: () => "open" | "closed";
    direction: DrawerDirection;
    fraction?: Signal<number>;
    onClose?: () => void;
  },
): void {
  const { direction, fraction, onClose } = opts;

  // Enter: start fully off-edge, force the commit, then release - the
  // content's transform transition carries the slide-in (vaul parity).
  node.style.transform = EXIT_TRANSFORM[direction];
  void node.offsetWidth;
  node.style.transform = "";

  // The close flip slides the panel off-edge through the restored transition
  // (trap/escape/outside disarm through modal's own re-arm); reopening
  // re-arms without a remount.
  registry.addEffect(node, () => {
    if (opts.state() === "closed") node.style.transform = EXIT_TRANSFORM[direction];
  });

  let dragging = false;
  let panelSize = 0;
  // Signed displacement (px, positive toward dismissal) + timestamp of the
  // last two drag samples - the release velocity source.
  let samples: { d: number; t: number }[] = [];

  const releaseVelocity = (): number => {
    if (samples.length < 2) return 0;
    const dt = samples[1]!.t - samples[0]!.t;
    if (dt <= 0) return 0;
    return ((samples[1]!.d - samples[0]!.d) / dt) * 1000;
  };

  // Interactive elements opt out so buttons inside the panel stay clickable.
  registry.addEffect(node, () =>
    onDrag(node, {
      onStart: (event) => {
        if (opts.state() !== "open") return;
        const hit = event.target as HTMLElement | null;
        if (hit?.closest?.("button, a, input, textarea, select, [data-no-drag]")) return;
        dragging = true;
        const rect = node.getBoundingClientRect();
        panelSize = AXIS[direction] === "y" ? rect.height : rect.width;
        samples = [{ d: 0, t: event.timeStamp }];
        node.setAttribute("data-dragging", "true");
      },
      onMove: (delta) => {
        if (!dragging) return;
        const d = AXIS[direction] === "y" ? delta.dy : delta.dx;
        node.style.transform = followTransform(direction, d);
        fraction?.(panelSize > 0 ? Math.min(1, Math.max(0, d * SIGN[direction]) / panelSize) : 0);
        samples.push({ d: d * SIGN[direction], t: delta.event.timeStamp });
        if (samples.length > 2) samples.shift();
      },
      onEnd: () => {
        if (!dragging) return;
        dragging = false;
        node.removeAttribute("data-dragging");
        const displaced = samples[samples.length - 1]?.d ?? 0;
        const dismiss =
          (panelSize > 0 && displaced >= panelSize * DISMISS_DISTANCE) ||
          releaseVelocity() >= DISMISS_VELOCITY;
        samples = [];
        fraction?.(0);
        if (dismiss) {
          node.style.transform = EXIT_TRANSFORM[direction];
          onClose?.();
        } else {
          // Spring back: data-dragging is gone, so the restored
          // transition animates the cleared transform to identity.
          node.style.transform = "";
        }
      },
    }),
  );
}

/** The screen-covering backdrop; the factory's Overlay with the drag-fraction fade. */
export function DrawerOverlay({
  state,
  fraction,
  class: cls,
  ...attrs
}: DrawerOverlayProps): JSX.Element {
  const { Overlay } = dialog({ open: () => (state?.() ?? "open") === "open" });
  const overlayStyle = (): Record<string, string> | undefined => {
    const f = fraction?.() ?? 0;
    return f > 0 ? { opacity: String(Math.max(0, 1 - f)) } : undefined;
  };
  return (
    <Overlay
      data-slot="drawer-overlay"
      style={overlayStyle}
      class={
        [base, cls]
      }
      {...attrs}
    />
  );
}

/** The X close button; the factory's Close with the X icon and its sr-only label. */
export function DrawerClose({
  state,
  onClose,
  "on:click": userClick,
  class: cls,
  ...attrs
}: DrawerCloseProps): JSX.Element {
  const { Close } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
  });
  return (
    <Close
      data-slot="drawer-close"
      class={
        [close, cls]
      }
      on:click={userClick}
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
    </Close>
  );
}

/** Portals the manual composition's parts into document.body. */
export function DrawerPortal(props: DrawerPortalProps): JSX.Element {
  return <Portal to="body">{props.children}</Portal>;
}

/** The manual trigger button; the factory's Trigger owning the aria contract over the wrapper's own state. */
export function DrawerTrigger({ children, class: cls, ...attrs }: DrawerTriggerProps): JSX.Element {
  const { Trigger } = dialog();
  return (
    <Trigger
      data-slot="drawer-trigger"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/**
 * The drawer panel. Manual composition portals it alongside a DrawerOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the Drawer export below shows the wired composition). The
 * whole panel drags along its dismissal axis; the pointer-follow is instant
 * (data-dragging suspends the transform transition), and release either
 * dismisses - past 25% of the panel size, or moving faster than 500px/s -
 * or springs back through the restored transition. The panel renders inline
 * where placed: the factory's gate and portal belong to the composed Drawer.
 */
export function DrawerContent({
  state,
  direction: drawerDirection,
  fraction,
  closeOnEscape,
  closeOnOutside,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: DrawerContentProps): JSX.Element {
  const direction = drawerDirection ?? "bottom";
  const resolvedState = (): "open" | "closed" => state?.() ?? "open";
  const { Content } = dialog({
    open: () => resolvedState() === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
    fallbackMs: EXIT_FALLBACK_MS,
  });

  return (
    <Content
      portal={false}
      data-slot="drawer-content"
      data-vaul-drawer-direction={direction}
      escape={closeOnEscape}
      outside={closeOnOutside}
      onExited={onExited}
      class={
        [content, contentDirections[direction], cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        wireDrawerSeam(node, { state: resolvedState, direction, fraction, onClose });
      }}
      {...attrs}
    >
      <div
        data-slot="drawer-handle"
        class="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
      />
      {children}
    </Content>
  );
}

export function DrawerHeader({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DrawerFooter({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-footer"
      class={
        [footer, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DrawerTitle({ id, children, class: cls, ...attrs }: DrawerTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="drawer-title"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

export function DrawerDescription({
  id,
  children,
  class: cls,
  ...attrs
}: DrawerDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="drawer-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

let drawerCount = 0;

export function Drawer({
  open,
  onClose,
  direction,
  title: titleText,
  description: descriptionText,
  closeOnEscape,
  closeOnOutside,
  children,
  class: cls,
  ...attrs
}: DrawerProps): JSX.Element {
  const titleId = `hella-drawer-title-${++drawerCount}`;
  const descriptionId = `hella-drawer-description-${drawerCount}`;
  const resolvedDirection = direction ?? "bottom";
  const dragFraction = signal(0);
  const { Content } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    fallbackMs: EXIT_FALLBACK_MS,
  });

  return (
    <Content
      data-slot="drawer-content"
      data-vaul-drawer-direction={resolvedDirection}
      class={
        [content, contentDirections[resolvedDirection], cls]
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={(state) => <DrawerOverlay state={state} fraction={dragFraction} />}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        wireDrawerSeam(node, {
          state: () => (open() ? "open" : "closed"),
          direction: resolvedDirection,
          fraction: dragFraction,
          onClose,
        });
      }}
      {...attrs}
      children={
        [
          <div
            data-slot="drawer-handle"
            class="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
          />,
          ...(titleText !== undefined ? [<DrawerTitle id={titleId}>{titleText}</DrawerTitle>] : []),
          ...(descriptionText !== undefined
            ? [<DrawerDescription id={descriptionId}>{descriptionText}</DrawerDescription>]
            : []),
          ...flattenChildren(children),
        ] as HellaChild[]
      }
    />
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
