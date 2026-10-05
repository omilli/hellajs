import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("empty", {
  alignItems: "center",
  borderStyle: "dashed",
  borderRadius: "var(--radius)",
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
    backgroundColor: "var(--muted)",
    borderRadius: "var(--radius)",
    color: "var(--foreground)",
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
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.625rem",
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: "var(--primary)",
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

interface EmptyPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Empty(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyHeader(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-header"
      class="${
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface EmptyMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon";
  class?: string;
}

export function EmptyMedia(props: EmptyMediaProps): HellaNode {
  return html`
    <div
      data-slot="empty-icon"
      data-variant="${props.variant ?? "default"}"
      class="${
        [
          media,
          mediaVariants[props.variant ?? "default"],
          props.class,
        ]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyTitle(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-title"
      class="${
        [title, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyDescription(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-description"
      class="${
        [description, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyContent(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
