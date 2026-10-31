import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { dialog } from "@hellajs/headless";
import { Portal, registry } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import { onDrag } from "@hellajs/headless/utils";
import type {
  DrawerDirection,
  DrawerOverlayProps,
  DrawerCloseProps,
  DrawerPortalProps,
  DrawerTriggerProps,
  DrawerContentProps,
  DrawerPartProps,
  DrawerTitleProps,
  DrawerDescriptionProps,
  DrawerProps,
} from "./drawer-types.js";

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
        // @hella:compose
        [base, cls]
        // @hella:end
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
        // @hella:compose
        [close, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [content, contentDirections[direction], cls]
        // @hella:end
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
        // @hella:compose
        [content, contentDirections[resolvedDirection], cls]
        // @hella:end
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
