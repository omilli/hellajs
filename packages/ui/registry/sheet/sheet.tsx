import { dialog } from "@hellajs/headless";
import { Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import type {
  SheetOverlayProps,
  SheetCloseProps,
  SheetPortalProps,
  SheetTriggerProps,
  SheetContentProps,
  SheetPartProps,
  SheetTitleProps,
  SheetDescriptionProps,
  SheetProps,
} from "./sheet-types.js";

// @hella:styles
declare const base: string;
declare const close: string;
declare const content: string;
declare const contentSides: Record<string, string>;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

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
        // @hella:compose
        [base, cls]
        // @hella:end
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
        // @hella:compose
        [close, cls]
        // @hella:end
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
        // @hella:compose
        [content, contentSides[resolvedSide], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      {showCloseButton !== false && (
        <Close
          data-slot="sheet-close"
          class={
            // @hella:compose
            [close]
            // @hella:end
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

export function SheetFooter({ children, class: cls, ...attrs }: SheetPartProps): JSX.Element {
  return (
    <div
      data-slot="sheet-footer"
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

export function SheetTitle({ id, children, class: cls, ...attrs }: SheetTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="sheet-title"
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
        // @hella:compose
        [content, contentSides[resolvedSide], cls]
        // @hella:end
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
                    // @hella:compose
                    [close]
                    // @hella:end
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
