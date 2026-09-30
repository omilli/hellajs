import type { HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const container = style({
  overflowX: "auto",
  position: "relative",
  width: "100%",
}, { label: "hella-table-container", layer: "hella" });

const base = style({
  captionSide: "bottom",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  width: "100%",
}, { label: "hella-table", layer: "hella" });

const header = style({
  "& tr": {
    borderBottom: "1px solid var(--border)",
  },
}, { label: "hella-table-header", layer: "hella" });

const body = style({
  "& tr:last-child": {
    borderBottom: "0",
  },
}, { label: "hella-table-body", layer: "hella" });

const footer = style({
  backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  borderTop: "1px solid var(--border)",
  fontWeight: "500",
  "& > tr:last-child": {
    borderBottom: "0",
  },
}, { label: "hella-table-footer", layer: "hella" });

const row = style({
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
}, { label: "hella-table-row", layer: "hella" });

const head = style({
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
}, { label: "hella-table-head", layer: "hella" });

const cell = style({
  padding: "0.5rem",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
}, { label: "hella-table-cell", layer: "hella" });

const caption = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  marginTop: "1rem",
}, { label: "hella-table-caption", layer: "hella" });

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): JSX.Element {
  return (
    <div
      data-slot="table-container"
      class={
        [container]
      }
    >
      <table
        data-slot="table"
        class={
          [base, props.class]
        }
      >
        {props.children}
      </table>
    </div>
  );
}

interface TablePartProps {
  children?: HellaChildren;
  class?: string;
}

export function TableHeader(props: TablePartProps): JSX.Element {
  return (
    <thead
      data-slot="table-header"
      class={
        [header, props.class]
      }
    >
      {props.children}
    </thead>
  );
}

export function TableBody(props: TablePartProps): JSX.Element {
  return (
    <tbody
      data-slot="table-body"
      class={
        [body, props.class]
      }
    >
      {props.children}
    </tbody>
  );
}

export function TableFooter(props: TablePartProps): JSX.Element {
  return (
    <tfoot
      data-slot="table-footer"
      class={
        [footer, props.class]
      }
    >
      {props.children}
    </tfoot>
  );
}

export function TableRow(props: TablePartProps): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      class={
        [row, props.class]
      }
    >
      {props.children}
    </tr>
  );
}

interface TableHeadProps {
  children?: HellaChildren;
  colSpan?: number;
  class?: string;
}

export function TableHead(props: TableHeadProps): JSX.Element {
  return (
    <th
      data-slot="table-head"
      colSpan={props.colSpan}
      class={
        [head, props.class]
      }
    >
      {props.children}
    </th>
  );
}

interface TableCellProps {
  children?: HellaChildren;
  colSpan?: number;
  class?: string;
}

export function TableCell(props: TableCellProps): JSX.Element {
  return (
    <td
      data-slot="table-cell"
      colSpan={props.colSpan}
      class={
        [cell, props.class]
      }
    >
      {props.children}
    </td>
  );
}

export function TableCaption(props: TablePartProps): JSX.Element {
  return (
    <caption
      data-slot="table-caption"
      class={
        [caption, props.class]
      }
    >
      {props.children}
    </caption>
  );
}
