import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("card", {
  background: tokens.card,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 1.4)`,
  color: tokens.cardForeground,
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  paddingBlock: "1.5rem",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
});

const header = style("card-header", {
  alignItems: "start",
  container: "card-header / inline-size",
  display: "grid",
  gap: "0.5rem",
  gridAutoRows: "min-content",
  gridTemplateRows: "auto auto",
  paddingInline: "1.5rem",
  "&:has([data-slot='card-action'])": {
    gridTemplateColumns: "1fr auto",
  },
});

const title = style("card-title", {
  fontWeight: "600",
  lineHeight: "1",
});

const description = style("card-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

const action = style("card-action", {
  gridColumnStart: "2",
  gridRowEnd: "span 2",
  gridRowStart: "1",
  justifySelf: "end",
  alignSelf: "start",
});

const content = style("card-content", {
  paddingInline: "1.5rem",
});

const footer = style("card-footer", {
  alignItems: "center",
  display: "flex",
  paddingInline: "1.5rem",
});

css({
  ".border-b [data-slot='card-header'], .border-b ~ [data-slot='card-header']": {
    paddingBottom: "1.5rem",
  },
  ".border-t [data-slot='card-footer'], .border-t ~ [data-slot='card-footer']": {
    paddingTop: "1.5rem",
  },
});

interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Card({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardHeader({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-header"
      class="${
        [header, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardTitle({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-title"
      class="${
        [title, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardDescription({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-description"
      class="${
        [description, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardAction({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-action"
      class="${
        [action, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardContent({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-content"
      class="${
        [content, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardFooter({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-footer"
      class="${
        [footer, cls]
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}
