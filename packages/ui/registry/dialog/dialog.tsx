import { dialog } from "@hellajs/headless";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import type {
  DialogPartProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogProps,
} from "./dialog-types.js";

// @hella:styles
declare const base: string;
declare const close: string;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

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

export function DialogHeader({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-header"
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

export function DialogFooter({ children, class: cls, ...attrs }: DialogPartProps): JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
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

export function DialogTitle({ id, children, class: cls, ...attrs }: DialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="dialog-title"
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
  const { Content, Close, Overlay } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });

  return (
    <Content
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={() => (
        <Overlay
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
          ...(titleText !== undefined ? [<DialogTitle id={titleId}>{titleText}</DialogTitle>] : []),
          ...(descriptionText !== undefined
            ? [<DialogDescription id={descriptionId}>{descriptionText}</DialogDescription>]
            : []),
          ...flattenChildren(children),
          ...(showCloseButton !== false
            ? [
                <Close
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
