import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

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
    borderBottom: `1px solid ${tokens.border}`,
  },
});

const body = style("table-body", {
  "& tr:last-child": {
    borderBottom: "0",
  },
});

const footer = style("table-footer", {
  backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  borderTop: `1px solid ${tokens.border}`,
  fontWeight: "500",
  "& > tr:last-child": {
    borderBottom: "0",
  },
});

const row = style("table-row", {
  borderBottom: `1px solid ${tokens.border}`,
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&:has([aria-expanded='true'])": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&[data-state='selected']": {
    backgroundColor: tokens.muted,
  },
});

const head = style("table-head", {
  color: tokens.foreground,
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
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  marginTop: "1rem",
});

interface TableProps extends HTMLAttributes<"table"> {
  class?: string;
  children?: HellaChildren;
}

export default function Table({ children, class: cls, ...attrs }: TableProps): JSX.Element {
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
          [base, cls]
        }
        {...attrs}
      >
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps extends HTMLAttributes<"thead"> {
  class?: string;
  children?: HellaChildren;
}

export function TableHeader({ children, class: cls, ...attrs }: TableHeaderProps): JSX.Element {
  return (
    <thead
      data-slot="table-header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </thead>
  );
}

interface TableBodyProps extends HTMLAttributes<"tbody"> {
  class?: string;
  children?: HellaChildren;
}

export function TableBody({ children, class: cls, ...attrs }: TableBodyProps): JSX.Element {
  return (
    <tbody
      data-slot="table-body"
      class={
        [body, cls]
      }
      {...attrs}
    >
      {children}
    </tbody>
  );
}

interface TableFooterProps extends HTMLAttributes<"tfoot"> {
  class?: string;
  children?: HellaChildren;
}

export function TableFooter({ children, class: cls, ...attrs }: TableFooterProps): JSX.Element {
  return (
    <tfoot
      data-slot="table-footer"
      class={
        [footer, cls]
      }
      {...attrs}
    >
      {children}
    </tfoot>
  );
}

interface TableRowProps extends HTMLAttributes<"tr"> {
  class?: string;
  children?: HellaChildren;
}

export function TableRow({ children, class: cls, ...attrs }: TableRowProps): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      class={
        [row, cls]
      }
      {...attrs}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps extends HTMLAttributes<"th"> {
  class?: string;
  children?: HellaChildren;
}

export function TableHead({ children, class: cls, ...attrs }: TableHeadProps): JSX.Element {
  return (
    <th
      data-slot="table-head"
      class={
        [head, cls]
      }
      {...attrs}
    >
      {children}
    </th>
  );
}

interface TableCellProps extends HTMLAttributes<"td"> {
  class?: string;
  children?: HellaChildren;
}

export function TableCell({ children, class: cls, ...attrs }: TableCellProps): JSX.Element {
  return (
    <td
      data-slot="table-cell"
      class={
        [cell, cls]
      }
      {...attrs}
    >
      {children}
    </td>
  );
}

interface TableCaptionProps extends HTMLAttributes<"caption"> {
  class?: string;
  children?: HellaChildren;
}

export function TableCaption({ children, class: cls, ...attrs }: TableCaptionProps): JSX.Element {
  return (
    <caption
      data-slot="table-caption"
      class={
        [caption, cls]
      }
      {...attrs}
    >
      {children}
    </caption>
  );
}
