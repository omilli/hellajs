import { effect, signal } from "@hellajs/core";
import { Portal, registry } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";
import { modal, onDrag } from "@hellajs/headless";
import type { Signal } from "@hellajs/core";

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
import { cn } from "./cn.js";

const contentDirections = {
  top: "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
  bottom:
    "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
  right:
    "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
  left: "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
};

/** Accessibility state shared by the animated drawer parts. */

/** Edge the drawer mounts on; drag dismissal runs along this axis. */

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

export function DrawerOverlay({
  state,
  fraction,
  class: cls,
  ...attrs
}: DrawerOverlayProps): JSX.Element {
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
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }
      {...attrs}
    />
  );
}

export function DrawerClose({
  state,
  onClose,
  "on:click": userClick,
  class: cls,
  ...attrs
}: DrawerCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-close"
      data-state={state?.()}
      class={
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", cls)
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onClose?.();
      }}
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

/** Portals the manual composition's parts into document.body. */
export function DrawerPortal(props: DrawerPortalProps): JSX.Element {
  return <Portal to="body">{props.children}</Portal>;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function DrawerTrigger({ children, class: cls, ...attrs }: DrawerTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="drawer-trigger"
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

/**
 * The drawer panel. Manual composition portals it alongside a DrawerOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the Drawer export below shows the wired composition). The
 * whole panel drags along its dismissal axis; the pointer-follow is instant
 * (data-dragging suspends the transform transition), and release either
 * dismisses - past 25% of the panel size, or moving faster than 500px/s -
 * or springs back through the restored transition.
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
  let panel: HTMLElement | undefined;
  const direction = drawerDirection ?? "bottom";
  let dragging = false;
  let panelSize = 0;
  // Signed displacement (px, positive toward dismissal) + timestamp of the
  // last two drag samples — the release velocity source.
  let samples: { d: number; t: number }[] = [];

  const startExit = (): void => {
    if (panel === undefined || !panel.isConnected) return;
    panel.style.transform = EXIT_TRANSFORM[direction];
  };

  // The close flip slides the panel off-edge through the restored transition
  // (trap/escape/outside disarm through modal's own re-arm); reopening
  // re-arms without a remount.
  effect(() => {
    if (state?.() === "closed") startExit();
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
        cn("group/drawer-content fixed z-50 flex h-auto flex-col bg-background transition ease-in-out data-[dragging]:transition-none", contentDirections[direction], cls)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        panel = node;
        // Enter: start fully off-edge, force the commit, then release - the
        // content's transform transition carries the slide-in (vaul parity).
        node.style.transform = EXIT_TRANSFORM[direction];
        void node.offsetWidth;
        node.style.transform = "";
        // A manual composition without a state getter arms permanently and
        // disposes with the panel.
        modal(node, {
          state: state ?? (() => "open"),
          onClose,
          escape: closeOnEscape,
          outside: closeOnOutside,
          onExited,
        });
        // Whole-panel drag along the dismissal axis. Interactive elements opt
        // out so buttons inside the panel stay clickable. Node-registered, so
        // the wiring disposes when the panel leaves the DOM.
        registry.addEffect(node, () =>
          onDrag(node, {
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
              fraction?.(
                panelSize > 0 ? Math.min(1, Math.max(0, d * SIGN[direction]) / panelSize) : 0,
              );
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
      }}
      {...attrs}
    >
      <div
        data-slot="drawer-handle"
        class="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
      />
      {children}
    </div>
  );
}

export function DrawerHeader({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-header"
      class={
        cn("flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left", cls)
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
        cn("mt-auto flex flex-col gap-2 p-4", cls)
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
        cn("font-semibold text-foreground", cls)
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
        cn("text-sm text-muted-foreground", cls)
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
      {() =>
        visible() && (
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
              children={
                [
                  ...(titleText !== undefined
                    ? [<DrawerTitle id={titleId}>{titleText}</DrawerTitle>]
                    : []),
                  ...(descriptionText !== undefined
                    ? [<DrawerDescription id={descriptionId}>{descriptionText}</DrawerDescription>]
                    : []),
                  ...flattenChildren(children),
                ] as HellaChild[]
              }
            />
          </Portal>
        )
      }
    </>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
