import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { dialog } from "@hellajs/headless";
import { registry } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";
import { onDrag } from "@hellajs/headless/utils";

type DrawerDirection = "top" | "right" | "bottom" | "left";

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

export function DrawerHeader({ children, class: cls, ...attrs }: DrawerPartProps): JSX.Element {
  return (
    <div
      data-slot="drawer-header"
      class={
        cn("flex flex-col gap-0.5 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left", cls)
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
        cn("mt-auto flex flex-col gap-2", cls)
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
  const resolvedDirection = direction ?? "bottom";
  const dragFraction = signal(0);
  const { Content, Overlay } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    fallbackMs: EXIT_FALLBACK_MS,
  });
  // The overlay fades in proportion to the panel's drag displacement.
  const overlayStyle = (): Record<string, string> | undefined => {
    const f = dragFraction();
    return f > 0 ? { opacity: String(Math.max(0, 1 - f)) } : undefined;
  };

  return (
    <Content
      data-slot="drawer-content"
      data-vaul-drawer-direction={resolvedDirection}
      class={
        cn("group/drawer-content fixed z-50 flex h-auto flex-col p-4 bg-background transition ease-in-out data-[dragging]:transition-none", contentDirections[resolvedDirection], cls)
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={() => (
        <Overlay
          data-slot="drawer-overlay"
          style={overlayStyle}
          class={
            cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0")
          }
        />
      )}
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
