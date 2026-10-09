import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const contentSides = {
  right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom: "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
};

/** Accessibility state shared by the animated sheet parts. */
type SheetState = () => "open" | "closed";

/** Side the panel slides in from. */
type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetOverlayProps extends HTMLAttributes<"div"> {
  state?: SheetState;
  class?: string;
}

export function SheetOverlay({ state, class: cls, ...attrs }: SheetOverlayProps): JSX.Element {
  return (
    <div
      data-slot="sheet-overlay"
      data-state={state?.()}
      class={
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }
      {...attrs}
    />
  );
}

interface SheetCloseProps extends HTMLAttributes<"button"> {
  state?: SheetState;
  onClose?: () => void;
  class?: string;
}

export function SheetClose({ state, onClose, "on:click": userClick, class: cls, ...attrs }: SheetCloseProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sheet-close"
      data-state={state?.()}
      class={
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", cls)
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

interface SheetTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function SheetTrigger({ children, class: cls, ...attrs }: SheetTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sheet-trigger"
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

interface SheetContentProps extends HTMLAttributes<"div"> {
  state?: SheetState;
  side?: SheetSide;
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
 * Title/Description parts carry the required aria wiring: pass their
 * generated ids as the panel's `aria-labelledby`/`aria-describedby` attrs
 * even in manual compositions, screen readers announce nothing without them.
 */
export function SheetContent({ state, side, showCloseButton, closeOnEscape, closeOnOutside, onClose, onExited, children, class: cls, ...attrs }: SheetContentProps): JSX.Element {
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
    if (closeOnOutside !== false && onClose) wirings.push(onOutside(() => [target], onClose));
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (state?.() === "closed") disposeWirings();
    else installWirings();
  });

  const resolvedSide = side ?? "right";

  return (
    <div
      data-slot="sheet-content"
      data-state={state?.()}
      data-side={resolvedSide}
      role="dialog"
      aria-modal="true"
      class={
        cn("fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", contentSides[resolvedSide], cls)
      }
      hook:afterMount={(node) => {
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
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
      {showCloseButton !== false && (
        <SheetClose state={state} onClose={onClose} />
      )}
    </div>
  );
}

interface SheetPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetHeader({ children, class: cls, ...attrs }: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-header"
      class={
        cn("flex flex-col gap-1.5 p-4", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SheetFooter({ children, class: cls, ...attrs }: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-footer"
      class={
        cn("mt-auto flex flex-col gap-2 p-4", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface SheetTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetTitle({ id, children, class: cls, ...attrs }: SheetTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="sheet-title"
      class={
        cn("font-semibold text-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

interface SheetDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

export function SheetDescription({ id, children, class: cls, ...attrs }: SheetDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="sheet-description"
      class={
        cn("text-sm text-muted-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

interface SheetProps extends HTMLAttributes<"div"> {
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

export default function Sheet({ open, onClose, side, title: titleText, description: descriptionText, showCloseButton, closeOnEscape, closeOnOutside, children, class: cls, ...attrs }: SheetProps): JSX.Element {
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
    if (open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 350);
    }
  });

  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <SheetOverlay state={state} />
          <SheetContent
            state={state}
            side={side}
            aria-labelledby={titleId}
            aria-describedby={descriptionText === undefined ? undefined : descriptionId}
            showCloseButton={showCloseButton}
            closeOnEscape={closeOnEscape}
            closeOnOutside={closeOnOutside}
            onClose={onClose}
            onExited={finishExit}
            class={cls}
            {...attrs}
            children={[
              ...(titleText !== undefined ? [<SheetTitle id={titleId}>{titleText}</SheetTitle>] : []),
              ...(descriptionText !== undefined ? [<SheetDescription id={descriptionId}>{descriptionText}</SheetDescription>] : []),
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
