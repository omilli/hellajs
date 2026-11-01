import { dialog } from "@hellajs/headless";
import type { HellaChild, HellaChildren, HTMLAttributes } from "@hellajs/dom";

type SheetSide = "top" | "right" | "bottom" | "left";

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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInTop = keyframes({ from: { opacity: "0", transform: "translateY(-100%)" } });
const slideOutTop = keyframes({ to: { opacity: "0", transform: "translateY(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
const slideInBottom = keyframes({ from: { opacity: "0", transform: "translateY(100%)" } });
const slideOutBottom = keyframes({ to: { opacity: "0", transform: "translateY(100%)" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });

const base = style("sheet-base", {
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

const content = style("sheet-content", {
  background: tokens.background,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  padding: "1rem",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
});

const contentSides = {
  right: style("sheet-content-right", {
    bottom: "0",
    borderLeft: `1px solid ${tokens.border}`,
    height: "100%",
    right: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInRight} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutRight} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
  left: style("sheet-content-left", {
    bottom: "0",
    borderRight: `1px solid ${tokens.border}`,
    height: "100%",
    left: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInLeft} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutLeft} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }),
  top: style("sheet-content-top", {
    borderBottom: `1px solid ${tokens.border}`,
    height: "auto",
    left: "0",
    right: "0",
    top: "0",
    "&[data-state='open']": {
      animation: `${slideInTop} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutTop} 300ms ease-in both`,
    },
  }),
  bottom: style("sheet-content-bottom", {
    borderTop: `1px solid ${tokens.border}`,
    bottom: "0",
    height: "auto",
    left: "0",
    right: "0",
    "&[data-state='open']": {
      animation: `${slideInBottom} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutBottom} 300ms ease-in both`,
    },
  }),
};

const close = style("sheet-close", {
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
    backgroundColor: tokens.secondary,
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

const header = style("sheet-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
});

const footer = style("sheet-footer", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
});

const title = style("sheet-title", {
  color: tokens.foreground,
  fontWeight: "600",
});

const description = style("sheet-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

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
        [header, cls]
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
        [footer, cls]
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
        [title, cls]
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
        [description, cls]
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
        [content, contentSides[resolvedSide], cls]
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={closeOnOutside}
      overlay={() => (
        <Overlay
          data-slot="sheet-overlay"
          class={
            [base]
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
