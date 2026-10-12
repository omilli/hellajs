import type { TableProps, TableHeaderProps, TableBodyProps, TableFooterProps, TableRowProps, TableHeadProps, TableCellProps, TableCaptionProps } from "./table-types.js";

// @hella:styles
declare const base: string;
declare const body: string;
declare const caption: string;
declare const cell: string;
declare const container: string;
declare const footer: string;
declare const head: string;
declare const header: string;
declare const row: string;
// @hella:end

export function Table({ children, class: cls, ...attrs }: TableProps): JSX.Element {
  return (
    <div
      data-slot="table-container"
      class={
        // @hella:compose
        [container]
        // @hella:end
      }
    >
      <table
        data-slot="table"
        class={
          // @hella:compose
          [base, cls]
          // @hella:end
        }
        {...attrs}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, class: cls, ...attrs }: TableHeaderProps): JSX.Element {
  return (
    <thead
      data-slot="table-header"
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, class: cls, ...attrs }: TableBodyProps): JSX.Element {
  return (
    <tbody
      data-slot="table-body"
      class={
        // @hella:compose
        [body, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </tbody>
  );
}

export function TableFooter({ children, class: cls, ...attrs }: TableFooterProps): JSX.Element {
  return (
    <tfoot
      data-slot="table-footer"
      class={
        // @hella:compose
        [footer, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({ children, class: cls, ...attrs }: TableRowProps): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      class={
        // @hella:compose
        [row, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, class: cls, ...attrs }: TableHeadProps): JSX.Element {
  return (
    <th
      data-slot="table-head"
      class={
        // @hella:compose
        [head, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, class: cls, ...attrs }: TableCellProps): JSX.Element {
  return (
    <td
      data-slot="table-cell"
      class={
        // @hella:compose
        [cell, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </td>
  );
}

export function TableCaption({ children, class: cls, ...attrs }: TableCaptionProps): JSX.Element {
  return (
    <caption
      data-slot="table-caption"
      class={
        // @hella:compose
        [caption, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </caption>
  );
}
