import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const container = style("table-container", {
  overflowX: "auto",
  position: "relative",
  width: "100%",
});

const base = style("table", {
  captionSide: "bottom",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  width: "100%",
});

const header = style("table-header", {
  "& tr": {
    borderBottom: "1px solid var(--border)",
  },
});

const body = style("table-body", {
  "& tr:last-child": {
    borderBottom: "0",
  },
});

const footer = style("table-footer", {
  backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  borderTop: "1px solid var(--border)",
  fontWeight: "500",
  "& > tr:last-child": {
    borderBottom: "0",
  },
});

const row = style("table-row", {
  borderBottom: "1px solid var(--border)",
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&:has([aria-expanded='true'])": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&[data-state='selected']": {
    backgroundColor: "var(--muted)",
  },
});

const head = style("table-head", {
  color: "var(--foreground)",
  fontWeight: "500",
  height: "2.5rem",
  paddingInline: "0.5rem",
  textAlign: "left",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
});

const cell = style("table-cell", {
  padding: "0.5rem",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
});

const caption = style("table-caption", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  marginTop: "1rem",
});

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): HellaNode {
  return html`
    <div
      data-slot="table-container"
      class="${
        [container]
      }"
    >
      <table
        data-slot="table"
        class="${
          [base, props.class]
        }"
      >${() => props.children}</table>
    </div>
  ` as HellaNode;
}

interface TablePartProps {
  children?: HellaChildren;
  class?: string;
}

export function TableHeader(props: TablePartProps): HellaNode {
  return html`
    <thead
      data-slot="table-header"
      class="${
        [header, props.class]
      }"
    >${() => props.children}</thead>
  ` as HellaNode;
}

export function TableBody(props: TablePartProps): HellaNode {
  return html`
    <tbody
      data-slot="table-body"
      class="${
        [body, props.class]
      }"
    >${() => props.children}</tbody>
  ` as HellaNode;
}

export function TableFooter(props: TablePartProps): HellaNode {
  return html`
    <tfoot
      data-slot="table-footer"
      class="${
        [footer, props.class]
      }"
    >${() => props.children}</tfoot>
  ` as HellaNode;
}

export function TableRow(props: TablePartProps): HellaNode {
  return html`
    <tr
      data-slot="table-row"
      class="${
        [row, props.class]
      }"
    >${() => props.children}</tr>
  ` as HellaNode;
}

interface TableHeadProps {
  children?: HellaChildren;
  colSpan?: number;
  class?: string;
}

export function TableHead(props: TableHeadProps): HellaNode {
  return html`
    <th
      data-slot="table-head"
      colSpan="${props.colSpan}"
      class="${
        [head, props.class]
      }"
    >${() => props.children}</th>
  ` as HellaNode;
}

interface TableCellProps {
  children?: HellaChildren;
  colSpan?: number;
  class?: string;
}

export function TableCell(props: TableCellProps): HellaNode {
  return html`
    <td
      data-slot="table-cell"
      colSpan="${props.colSpan}"
      class="${
        [cell, props.class]
      }"
    >${() => props.children}</td>
  ` as HellaNode;
}

export function TableCaption(props: TablePartProps): HellaNode {
  return html`
    <caption
      data-slot="table-caption"
      class="${
        [caption, props.class]
      }"
    >${() => props.children}</caption>
  ` as HellaNode;
}
