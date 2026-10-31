import { dialog } from "@hellajs/headless";
import { Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";

type SheetState = () => "open" | "closed";

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetOverlayProps extends HTMLAttributes<"div"> {
  state?: SheetState;
  class?: string;
}

interface SheetCloseProps extends HTMLAttributes<"button"> {
  state?: SheetState;
  onClose?: () => void;
  class?: string;
}

interface SheetPortalProps {
  children?: HellaChildren;
}

interface SheetTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
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

interface SheetPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface SheetTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

interface SheetDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
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
import { cn } from "./cn.js";

const contentSides = {
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
};

/** Side the panel slides in from. */

/** Fallback budget for the exit slide (the panel stays mounted until its animationend or this budget). */
const EXIT_FALLBACK_MS = 350;

const CloseIcon = (): JSX.Element => (
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
);

/** The screen-covering backdrop; the factory's Overlay with the backdrop style. */
export function SheetOverlay({ state, class: cls, ...attrs }: SheetOverlayProps): JSX.Element {
  const { Overlay } = dialog({ open: () => (state?.() ?? "open") === "open" });
  return (
    <Overlay
      data-slot="sheet-overlay"
      class={
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }
      {...attrs}
    />
  );
}

/** The X close button; the factory's Close with the X icon and its sr-only label. */
export function SheetClose({
  state,
  onClose,
  "on:click": userClick,
  class: cls,
  ...attrs
}: SheetCloseProps): JSX.Element {
  const { Close } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
  });
  return (
    <Close
      data-slot="sheet-close"
      class={
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", cls)
      }
      on:click={userClick}
      {...attrs}
    >
      <CloseIcon />
      <span class="sr-only">Close</span>
    </Close>
  );
}

/** Portals the manual composition's parts into document.body. */
export function SheetPortal(props: SheetPortalProps): JSX.Element {
  return <Portal to="body">{props.children}</Portal>;
}

/** The manual trigger button; the factory's Trigger owning the aria contract over the wrapper's own state. */
export function SheetTrigger({ children, class: cls, ...attrs }: SheetTriggerProps): JSX.Element {
  const { Trigger } = dialog();
  return (
    <Trigger
      data-slot="sheet-trigger"
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/**
 * The sheet panel. Manual composition portals it alongside a SheetOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the Sheet export below shows the wired composition). The
 * Title/Description parts carry the required aria wiring: pass their
 * generated ids as the panel's `aria-labelledby`/`aria-describedby` attrs
 * even in manual compositions, screen readers announce nothing without them.
 * The panel renders inline where placed: the factory's gate and portal
 * belong to the composed Sheet.
 */
export function SheetContent({
  state,
  side,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: SheetContentProps): JSX.Element {
  const resolvedSide = side ?? "right";
  const { Content, Close } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
    fallbackMs: EXIT_FALLBACK_MS,
  });

  return (
    <Content
      portal={false}
      data-slot="sheet-content"
      data-side={resolvedSide}
      escape={closeOnEscape}
      outside={closeOnOutside}
      onExited={onExited}
      class={
        cn("fixed z-50 flex flex-col gap-4 p-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", contentSides[resolvedSide], cls)
      }
      {...attrs}
    >
      {children}
      {showCloseButton !== false && (
        <Close
          data-slot="sheet-close"
          class={
            cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary")
          }
        >
          <CloseIcon />
          <span class="sr-only">Close</span>
        </Close>
      )}
    </Content>
  );
}

export function SheetHeader({ children, class: cls, ...attrs }: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-header"
      class={
        cn("flex flex-col gap-1.5", cls)
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
        cn("mt-auto flex flex-col gap-2", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
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

export function SheetDescription({
  id,
  children,
  class: cls,
  ...attrs
}: SheetDescriptionProps): JSX.Element {
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

let sheetCount = 0;

export function Sheet({
  open,
  onClose,
  side,
  title: titleText,
  description: descriptionText,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  children,
  class: cls,
  ...attrs
}: SheetProps): JSX.Element {
  const titleId = `hella-sheet-title-${++sheetCount}`;
  const descriptionId = `hella-sheet-description-${sheetCount}`;
  const resolvedSide = side ?? "right";
  const { Content, Close } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    fallbackMs: EXIT_FALLBACK_MS,
  });

  return (
    <Content
      data-slot="sheet-content"
      data-side={resolvedSide}
      class={
        cn("fixed z-50 flex flex-col gap-4 p-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", contentSides[resolvedSide], cls)
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={(state) => <SheetOverlay state={state} />}
      {...attrs}
      children={
        [
          ...(titleText !== undefined ? [<SheetTitle id={titleId}>{titleText}</SheetTitle>] : []),
          ...(descriptionText !== undefined
            ? [<SheetDescription id={descriptionId}>{descriptionText}</SheetDescription>]
            : []),
          ...flattenChildren(children),
          ...(showCloseButton !== false
            ? [
                <Close
                  data-slot="sheet-close"
                  class={
                    cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary")
                  }
                >
                  <CloseIcon />
                  <span class="sr-only">Close</span>
                </Close>,
              ]
            : []),
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
