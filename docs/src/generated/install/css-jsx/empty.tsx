import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("empty", {
  alignItems: "center",
  borderStyle: "dashed",
  borderRadius: tokens.radius,
  boxSizing: "border-box",
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "1.5rem",
  justifyContent: "center",
  minWidth: "0",
  paddingBlock: "1.5rem",
  paddingInline: "1.5rem",
  textAlign: "center",
  textWrap: "balance",
  "@media (min-width: 48rem)": {
    paddingBlock: "3rem",
    paddingInline: "3rem",
  },
});

const header = style("empty-header", {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  maxWidth: "24rem",
  textAlign: "center",
});

const media = style("empty-media", {
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  justifyContent: "center",
  marginBottom: "0.5rem",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
});

const mediaVariants = {
  default: style("empty-media-default", {
    backgroundColor: "transparent",
  }),
  icon: style("empty-media-icon", {
    alignItems: "center",
    backgroundColor: tokens.muted,
    borderRadius: tokens.radius,
    color: tokens.foreground,
    display: "flex",
    flexShrink: "0",
    height: "2.5rem",
    justifyContent: "center",
    width: "2.5rem",
    "& svg:not([class*='size-'])": {
      height: "1.5rem",
      width: "1.5rem",
    },
  }),
};

const title = style("empty-title", {
  fontSize: "1.125rem",
  fontWeight: "500",
  letterSpacing: "-0.025em",
  lineHeight: "1.75rem",
});

const description = style("empty-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.625rem",
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: tokens.primary,
  },
});

const content = style("empty-content", {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  fontSize: "0.875rem",
  gap: "1rem",
  lineHeight: "1.25rem",
  maxWidth: "24rem",
  minWidth: "0",
  textAlign: "center",
  textWrap: "balance",
  width: "100%",
});

interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Empty({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty"
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function EmptyHeader({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface EmptyMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon";
}

export function EmptyMedia({ variant, children, class: cls, ...attrs }: EmptyMediaProps): JSX.Element {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant ?? "default"}
      class={
        [
          media,
          mediaVariants[variant ?? "default"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function EmptyTitle({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-title"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function EmptyDescription({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function EmptyContent({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-content"
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
