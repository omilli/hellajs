import type { HellaChildren } from "@hellajs/dom";

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

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): JSX.Element {
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
          [base, props.class]
          // @hella:end
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
        // @hella:compose
        [header, props.class]
        // @hella:end
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
        // @hella:compose
        [body, props.class]
        // @hella:end
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
        // @hella:compose
        [footer, props.class]
        // @hella:end
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
        // @hella:compose
        [row, props.class]
        // @hella:end
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
        // @hella:compose
        [head, props.class]
        // @hella:end
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
        // @hella:compose
        [cell, props.class]
        // @hella:end
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
        // @hella:compose
        [caption, props.class]
        // @hella:end
      }
    >
      {props.children}
    </caption>
  );
}
