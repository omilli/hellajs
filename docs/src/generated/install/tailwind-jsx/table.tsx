import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): JSX.Element {
  return (
    <div
      data-slot="table-container"
      class={
        cn("relative w-full overflow-x-auto")
      }
    >
      <table
        data-slot="table"
        class={
          cn("w-full caption-bottom text-sm", props.class)
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
        cn("[&_tr]:border-b", props.class)
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
        cn("[&_tr:last-child]:border-0", props.class)
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
        cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", props.class)
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
        cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", props.class)
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
        cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", props.class)
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
        cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", props.class)
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
        cn("mt-4 text-sm text-muted-foreground", props.class)
      }
    >
      {props.children}
    </caption>
  );
}
