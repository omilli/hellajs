import { effect, signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { onDrag, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const close: string;
declare const content: string;
declare const contentDirections: Record<string, string>;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

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

interface DrawerOverlayProps extends HTMLAttributes<"div"> {
  state?: DrawerState;
  /** Drag fraction (0..1 toward dismissal) — drives the proportional overlay fade. */
  fraction?: Signal<number>;
  class?: string;
}

export function DrawerOverlay({ state, fraction, class: cls, ...attrs }: DrawerOverlayProps): JSX.Element {
  const overlayStyle = (): Record<string, string> | undefined => {
    const f = fraction?.() ?? 0;
    return f > 0 ? { opacity: String(Math.max(0, 1 - f)) } : undefined;
  };
  return (
    <div
      data-slot="drawer-overlay"
      data-state={state?.()}
      style={overlayStyle}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

interface DrawerCloseProps extends HTMLAttributes<"button"> {
  state?: DrawerState;
  onClose?: () => void;
  class?: string;
}

export function DrawerClose({ state, onClose, "on:click": userClick, class: cls, ...attrs }: DrawerCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-close"
      data-state={state?.()}
      class={
        // @hella:compose
        [close, cls]
        // @hella:end
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

interface DrawerTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function DrawerTrigger({ children, class: cls, ...attrs }: DrawerTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-trigger"
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

/**
 * The drawer panel. Manual composition portals it alongside a DrawerOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Drawer below shows the wired composition). The
 * whole panel drags along its dismissal axis; the pointer-follow is instant
 * (data-dragging suspends the transform transition), and release either
 * dismisses - past 25% of the panel size, or moving faster than 500px/s -
 * or springs back through the restored transition.
 */
export function DrawerContent({ state, direction: drawerDirection, fraction, closeOnEscape, closeOnOutside, onClose, onExited, children, class: cls, ...attrs }: DrawerContentProps): JSX.Element {
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;
  const direction = drawerDirection ?? "bottom";
  let dragging = false;
  let panelSize = 0;
  // Signed displacement (px, positive toward dismissal) + timestamp of the
  // last two drag samples — the release velocity source.
  let samples: { d: number; t: number }[] = [];

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

  const startExit = (): void => {
    if (panel === undefined || !panel.isConnected) return;
    panel.style.transform = EXIT_TRANSFORM[direction];
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately, slides the panel off-edge through the restored
  // transition, and reopening re-arms them without a remount.
  effect(() => {
    if (state?.() === "closed") {
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
      data-state={state?.()}
      data-vaul-drawer-direction={direction}
      role="dialog"
      aria-modal="true"
      class={
        // @hella:compose
        [content, contentDirections[direction], cls]
        // @hella:end
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
          if (event.target === node && event.propertyName === "transform" && state?.() === "closed") onExited?.();
        };
        node.addEventListener("transitionend", onTransitionEnd);
        teardown.push(() => node.removeEventListener("transitionend", onTransitionEnd));
        // Whole-panel drag along the dismissal axis. Interactive elements opt
        // out so buttons inside the panel stay clickable.
        teardown.push(onDrag(node, {
          onStart: (event) => {
            if (state?.() !== "open") return;
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
            const dismiss = (panelSize > 0 && displaced >= panelSize * DISMISS_DISTANCE)
              || releaseVelocity() >= DISMISS_VELOCITY;
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
        }));
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      <div data-slot="drawer-handle" class="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
      {children}
    </div>
  );
}

interface DrawerPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function DrawerHeader({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-header"
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

export function DrawerFooter({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-footer"
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

interface DrawerTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function DrawerTitle({ id, children, class: cls, ...attrs }: DrawerTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="drawer-title"
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

interface DrawerDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function DrawerDescription({ id, children, class: cls, ...attrs }: DrawerDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="drawer-description"
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

let drawerCount = 0;

export default function Drawer({ open, onClose, direction, title: titleText, description: descriptionText, closeOnEscape, closeOnOutside, children, class: cls, ...attrs }: DrawerProps): JSX.Element {
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
    if (open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, EXIT_FALLBACK_MS);
    }
  });

  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <DrawerOverlay state={state} fraction={dragFraction} />
          <DrawerContent
            state={state}
            direction={direction}
            fraction={dragFraction}
            aria-labelledby={titleId}
            aria-describedby={descriptionText === undefined ? undefined : descriptionId}
            closeOnEscape={closeOnEscape}
            closeOnOutside={closeOnOutside}
            onClose={onClose}
            onExited={finishExit}
            class={cls}
            {...attrs}
            children={[
              ...(titleText !== undefined ? [<DrawerTitle id={titleId}>{titleText}</DrawerTitle>] : []),
              ...(descriptionText !== undefined ? [<DrawerDescription id={descriptionId}>{descriptionText}</DrawerDescription>] : []),
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
