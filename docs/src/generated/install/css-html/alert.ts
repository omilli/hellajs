import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("alert", {
  alignItems: "start",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
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
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
  }),
  destructive: style("alert-destructive", {
    backgroundColor: "var(--card)",
    color: "var(--destructive)",
    "& > [data-slot='alert-description']": {
      color: "color-mix(in oklab, var(--destructive) 90%, transparent)",
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
  color: "var(--muted-foreground)",
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

interface AlertProps {
  children?: HellaChildren;
  variant?: "default" | "destructive";
  class?: string;
}

export default function Alert(props: AlertProps): HellaNode {
  return html`
    <div
      data-slot="alert"
      role="alert"
      class="${
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AlertPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertTitle(props: AlertPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-title"
      class="${
        [title, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AlertDescription(props: AlertPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-description"
      class="${
        [description, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
