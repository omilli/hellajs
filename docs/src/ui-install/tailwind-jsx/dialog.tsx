import { dialog } from "@hellajs/headless";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";

type DialogState = () => "open" | "closed";

interface DialogOverlayProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  class?: string;
}

interface DialogCloseProps extends HTMLAttributes<"button"> {
  state?: DialogState;
  onClose?: () => void;
  class?: string;
}

interface DialogContentProps extends HTMLAttributes<"div"> {
  state?: DialogState;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

interface DialogPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface DialogTitleProps extends HTMLAttributes<"h2"> {
  children?: HellaChildren;
  class?: string;
}

interface DialogDescriptionProps extends HTMLAttributes<"p"> {
  children?: HellaChildren;
  class?: string;
}

interface DialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

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
export function DialogOverlay({ state, class: cls, ...attrs }: DialogOverlayProps): JSX.Element {
  const { Overlay } = dialog({ open: () => (state?.() ?? "open") === "open" });
  return (
    <Overlay
      class={
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", cls)
      }
      {...attrs}
    />
  );
}

/** The X close button; the factory's Close with the X icon and its sr-only label. */
export function DialogClose({
  state,
  onClose,
  "on:click": userClick,
  class: cls,
  ...attrs
}: DialogCloseProps): JSX.Element {
  const { Close } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
  });
  return (
    <Close
      class={
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
      }
      on:click={userClick}
      {...attrs}
    >
      <CloseIcon />
      <span class="sr-only">Close</span>
    </Close>
  );
}

/**
 * The dialog panel. Manual composition portals it alongside a DialogOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the Dialog export below shows the wired composition). The panel
 * renders inline where placed: the factory's gate and portal belong to the
 * composed Dialog.
 */
export function DialogContent({
  state,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: DialogContentProps): JSX.Element {
  const { Content, Close } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
  });
  return (
    <Content
      portal={false}
      escape={closeOnEscape}
      outside={closeOnOutside}
      onExited={onExited}
      class={
        cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", cls)
      }
      {...attrs}
    >
      {children}
      {showCloseButton !== false && (
        <Close
          class={
            cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4")
          }
        >
          <CloseIcon />
          <span class="sr-only">Close</span>
        </Close>
      )}
    </Content>
  );
}

export function DialogHeader({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      class={
        cn("flex flex-col gap-2 text-center sm:text-left", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      class={
        cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ id, children, class: cls, ...attrs }: DialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="dialog-title"
      class={
        cn("text-lg leading-none font-semibold", cls)
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  id,
  children,
  class: cls,
  ...attrs
}: DialogDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="dialog-description"
      class={
        cn("text-sm text-muted-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

let dialogCount = 0;

export function Dialog({
  open,
  onClose,
  title: titleText,
  description: descriptionText,
  showCloseButton,
  closeOnEscape,
  closeOnOutside,
  children,
  class: cls,
  ...attrs
}: DialogProps): JSX.Element {
  const titleId = `hella-dialog-title-${++dialogCount}`;
  const descriptionId = `hella-dialog-description-${dialogCount}`;
  const { Content, Close } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });

  return (
    <Content
      class={
        cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", cls)
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={(state) => <DialogOverlay state={state} />}
      {...attrs}
      children={
        [
          ...(titleText !== undefined ? [<DialogTitle id={titleId}>{titleText}</DialogTitle>] : []),
          ...(descriptionText !== undefined
            ? [<DialogDescription id={descriptionId}>{descriptionText}</DialogDescription>]
            : []),
          ...flattenChildren(children),
          ...(showCloseButton !== false
            ? [
                <Close
                  class={
                    cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4")
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
