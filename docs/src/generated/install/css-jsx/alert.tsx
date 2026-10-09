import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("alert", {
  alignItems: "start",
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  boxSizing: "border-box",
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateColumns: "0 1fr",
  lineHeight: "1.25rem",
  paddingBlock: "0.75rem",
  paddingInline: "1rem",
  position: "relative",
  rowGap: "0.125rem",
  width: "100%",
  "&:has(> svg)": {
    columnGap: "0.75rem",
    gridTemplateColumns: "1rem 1fr",
  },
  "& > svg": {
    color: "currentColor",
    height: "1rem",
    translate: "0 0.125rem",
    width: "1rem",
  },
});

const variants = {
  default: style("alert-default", {
    backgroundColor: tokens.card,
    color: tokens.cardForeground,
  }),
  destructive: style("alert-destructive", {
    backgroundColor: tokens.card,
    color: tokens.destructive,
    "& > [data-slot='alert-description']": {
      color: `color-mix(in oklab, ${tokens.destructive} 90%, transparent)`,
    },
    "& > svg": {
      color: "currentColor",
    },
  }),
};

const title = style("alert-title", {
  display: "-webkit-box",
  fontWeight: "500",
  gridColumnStart: "2",
  letterSpacing: "-0.025em",
  lineHeight: "1.25rem",
  minHeight: "1rem",
  overflow: "clip",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: "1",
});

const description = style("alert-description", {
  color: tokens.mutedForeground,
  display: "grid",
  fontSize: "0.875rem",
  gap: "0.25rem",
  gridColumnStart: "2",
  justifyItems: "start",
  lineHeight: "1.25rem",
  "& p": {
    lineHeight: "1.625rem",
  },
});

interface AlertProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive";
}

export default function Alert({ variant, children, class: cls, ...attrs }: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      class={
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AlertPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AlertTitle({ children, class: cls, ...attrs }: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-title"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, class: cls, ...attrs }: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
