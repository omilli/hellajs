import { effect, signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { onDrag, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";

import { css, keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

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
}, { label: "drawer-base" });

const content = style({
  background: "var(--background)",
  display: "flex",
  flexDirection: "column",
  height: "auto",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
  "&[data-dragging='true']": {
    transitionProperty: "none",
  },
}, { label: "drawer-content" });

const contentDirections = {
  top: style({
    borderBottom: "1px solid var(--border)",
    borderRadius: "0 0 var(--radius) var(--radius)",
    left: "0",
    marginBottom: "6rem",
    maxHeight: "80vh",
    right: "0",
    top: "0",
  }, { label: "drawer-content-top" }),
  bottom: style({
    borderTop: "1px solid var(--border)",
    borderRadius: "var(--radius) var(--radius) 0 0",
    bottom: "0",
    left: "0",
    marginTop: "6rem",
    maxHeight: "80vh",
    right: "0",
  }, { label: "drawer-content-bottom" }),
  right: style({
    borderLeft: "1px solid var(--border)",
    bottom: "0",
    right: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "drawer-content-right" }),
  left: style({
    borderRight: "1px solid var(--border)",
    bottom: "0",
    left: "0",
    top: "0",
    width: "75%",
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "drawer-content-left" }),
};

const close = style({
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
}, { label: "drawer-close" });

css({
  "[data-slot='drawer-content'] [data-slot='drawer-handle']": {
    display: "none",
  },
  "[data-slot='drawer-content'][data-vaul-drawer-direction='bottom'] [data-slot='drawer-handle']": {
    backgroundColor: "var(--muted)",
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

const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.125rem",
  padding: "1rem",
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
}, { label: "drawer-header" });

const footer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
  padding: "1rem",
}, { label: "drawer-footer" });

const title = style({
  color: "var(--foreground)",
  fontWeight: "600",
}, { label: "drawer-title" });

const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "drawer-description" });

/** Accessibility state shared by the animated drawer parts. */
type DrawerState = () => "open" | "closed";

/** Edge the drawer mounts on; drag dismissal runs along this axis. */
type DrawerDirection = "top" | "right" | "bottom" | "left";

/** Release fraction of the panel's dismissal-axis size beyond which a release dismisses. */
const DISMISS_DISTANCE = 0.25;

/** Release velocity (px/s along the dismissal axis) beyond which a release dismisses. */
const DISMISS_VELOCITY = 500;

/** Body fallback budget for the exit slide (the content transitions out via transform). */
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

interface DrawerOverlayProps {
  state?: DrawerState;
  /** Drag fraction (0..1 toward dismissal) — drives the proportional overlay fade. */
  fraction?: Signal<number>;
  class?: string;
}

export function DrawerOverlay(props: DrawerOverlayProps): JSX.Element {
  const overlayStyle = (): Record<string, string> | undefined => {
    const f = props.fraction?.() ?? 0;
    return f > 0 ? { opacity: String(Math.max(0, 1 - f)) } : undefined;
  };
  return (
    <div
      data-slot="drawer-overlay"
      data-state={props.state?.()}
      style={overlayStyle}
      class={
        [base, props.class]
      }
    />
  );
}

interface DrawerCloseProps {
  state?: DrawerState;
  onClose?: () => void;
  class?: string;
}

export function DrawerClose(props: DrawerCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-close"
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

interface DrawerPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function DrawerPortal(props: DrawerPortalProps): JSX.Element {
  return (
    <Portal to="body">
      {props.children}
    </Portal>
  );
}

interface DrawerTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function DrawerTrigger(props: DrawerTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-trigger"
      class={
        [props.class]
      }
    >
      {props.children}
    </button>
  );
}

interface DrawerContentProps {
  state?: DrawerState;
  direction?: DrawerDirection;
  /** Shared drag fraction (0..1 toward dismissal); the overlay fades proportionally when both parts receive the same signal. */
  fraction?: Signal<number>;
  labelledBy?: string;
  describedBy?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

/**
 * The drawer panel. Manual composition portals it alongside a DrawerOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Drawer below shows the wired composition). The
 * whole panel drags along its dismissal axis; the pointer-follow is instant
 * (data-dragging suspends the transform transition), and release either
 * dismisses - past 25% of the panel size, or moving faster than 500px/s -
 * or springs back through the restored transition.
 */
export function DrawerContent(props: DrawerContentProps): JSX.Element {
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;
  const direction = props.direction ?? "bottom";
  let dragging = false;
  let panelSize = 0;
  // Signed displacement (px, positive toward dismissal) + timestamp of the
  // last two drag samples — the release velocity source.
  let samples: { d: number; t: number }[] = [];

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

  const startExit = (): void => {
    if (panel === undefined || !panel.isConnected) return;
    panel.style.transform = EXIT_TRANSFORM[direction];
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately, slides the panel off-edge through the restored
  // transition, and reopening re-arms them without a remount.
  effect(() => {
    if (props.state?.() === "closed") {
      disposeWirings();
      startExit();
    } else {
      installWirings();
    }
  });

  const releaseVelocity = (): number => {
    if (samples.length < 2) return 0;
    const dt = samples[1]!.t - samples[0]!.t;
    if (dt <= 0) return 0;
    return ((samples[1]!.d - samples[0]!.d) / dt) * 1000;
  };

  return (
    <div
      data-slot="drawer-content"
      data-state={props.state?.()}
      data-vaul-drawer-direction={direction}
      role="dialog"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      class={
        [content, contentDirections[direction], props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        panel = node;
        // Enter: start fully off-edge, force the commit, then release - the
        // content's transform transition carries the slide-in (vaul parity).
        node.style.transform = EXIT_TRANSFORM[direction];
        void node.offsetWidth;
        node.style.transform = "";
        installWirings();
        // The exit's transitionend (state already "closed") is the primary
        // unmount trigger; the copied fallback budget in the root is the net.
        const onTransitionEnd = (event: TransitionEvent): void => {
          if (event.target === node && event.propertyName === "transform" && props.state?.() === "closed") props.onExited?.();
        };
        node.addEventListener("transitionend", onTransitionEnd);
        teardown.push(() => node.removeEventListener("transitionend", onTransitionEnd));
        // Whole-panel drag along the dismissal axis. Interactive elements opt
        // out so buttons inside the panel stay clickable.
        teardown.push(onDrag(node, {
          onStart: (event) => {
            if (props.state?.() !== "open") return;
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
            props.fraction?.(panelSize > 0 ? Math.min(1, Math.max(0, d * SIGN[direction]) / panelSize) : 0);
            samples.push({ d: d * SIGN[direction], t: delta.event.timeStamp });
            if (samples.length > 2) samples.shift();
          },
          onEnd: () => {
            if (!dragging) return;
            dragging = false;
            node.removeAttribute("data-dragging");
            const displaced = samples[samples.length - 1]?.d ?? 0;
            const dismiss = (panelSize > 0 && displaced >= panelSize * DISMISS_DISTANCE)
              || releaseVelocity() >= DISMISS_VELOCITY;
            samples = [];
            props.fraction?.(0);
            if (dismiss) {
              node.style.transform = EXIT_TRANSFORM[direction];
              props.onClose?.();
            } else {
              // Spring back: data-dragging is gone, so the restored
              // transition animates the cleared transform to identity.
              node.style.transform = "";
            }
          },
        }));
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
    >
      <div data-slot="drawer-handle" class="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
      {props.children}
    </div>
  );
}

interface DrawerPartProps {
  children?: HellaChildren;
  class?: string;
}

export function DrawerHeader(props: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-header"
      class={
        [header, props.class]
      }
    >
      {props.children}
    </div>
  );
}

export function DrawerFooter(props: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-footer"
      class={
        [footer, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface DrawerTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function DrawerTitle(props: DrawerTitleProps): JSX.Element {
  return (
    <h2
      id={props.id}
      data-slot="drawer-title"
      class={
        [title, props.class]
      }
    >
      {props.children}
    </h2>
  );
}

export function DrawerDescription(props: DrawerTitleProps): JSX.Element {
  return (
    <p
      id={props.id}
      data-slot="drawer-description"
      class={
        [description, props.class]
      }
    >
      {props.children}
    </p>
  );
}

interface DrawerProps {
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

let drawerCount = 0;

export default function Drawer(props: DrawerProps): JSX.Element {
  const titleId = `hella-drawer-title-${++drawerCount}`;
  const descriptionId = `hella-drawer-description-${drawerCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  const dragFraction = signal(0);
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
  // panel stays mounted under data-state="closed" until its transform
  // transition ends (or the copied fallback budget) unmounts it.
  effect(() => {
    if (props.open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, EXIT_FALLBACK_MS);
    }
  });

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <DrawerOverlay state={state} fraction={dragFraction} />
          <DrawerContent
            state={state}
            direction={props.direction}
            fraction={dragFraction}
            labelledBy={titleId}
            describedBy={props.description === undefined ? undefined : descriptionId}
            closeOnEscape={props.closeOnEscape}
            closeOnOutside={props.closeOnOutside}
            onClose={props.onClose}
            onExited={finishExit}
            class={props.class}
            children={[
              ...(props.title !== undefined ? [<DrawerTitle id={titleId}>{props.title}</DrawerTitle>] : []),
              ...(props.description !== undefined ? [<DrawerDescription id={descriptionId}>{props.description}</DrawerDescription>] : []),
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
