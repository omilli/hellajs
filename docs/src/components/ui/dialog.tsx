import { dialog } from "@hellajs/headless";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";

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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style("dialog-overlay", {
  backgroundColor: "rgb(0 0 0 / 0.5)",
  inset: "0",
  position: "fixed",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
});

const content = style("dialog-content", {
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  padding: "1.5rem",
  position: "fixed",
  top: "50%",
  translate: "-50% -50%",
  width: "100%",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&": {
      maxWidth: "32rem",
    },
  },
});

const close = style("dialog-close", {
  borderRadius: `calc(${tokens.radius} * 0.2)`,
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: `0 0 0 2px ${tokens.background}, 0 0 0 4px ${tokens.ring}`,
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: tokens.accent,
    color: tokens.mutedForeground,
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
});

const header = style("dialog-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  textAlign: "center",
  "@media (min-width: 40rem)": {
    "&": {
      textAlign: "left",
    },
  },
});

const footer = style("dialog-footer", {
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
});

const title = style("dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
});

const description = style("dialog-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

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
        [header, cls]
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
        [footer, cls]
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
        [title, cls]
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
        [description, cls]
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
        [content, cls]
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={() => (
        <Overlay
          class={
            [base]
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
                    [close]
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
