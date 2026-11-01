import { dialog } from "@hellajs/headless";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import type {
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
  const { Content, Close, Overlay } = dialog({
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
      overlay={() => (
        <Overlay
          data-slot="sheet-overlay"
          class={
            // @hella:compose
            [base]
            // @hella:end
          }
        />
      )}
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
