import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface TableProps extends HTMLAttributes<"table"> {
  class?: string;
  children?: HellaChildren;
}

interface TableHeaderProps extends HTMLAttributes<"thead"> {
  class?: string;
  children?: HellaChildren;
}

interface TableBodyProps extends HTMLAttributes<"tbody"> {
  class?: string;
  children?: HellaChildren;
}

interface TableFooterProps extends HTMLAttributes<"tfoot"> {
  class?: string;
  children?: HellaChildren;
}

interface TableRowProps extends HTMLAttributes<"tr"> {
  class?: string;
  children?: HellaChildren;
}

interface TableHeadProps extends HTMLAttributes<"th"> {
  class?: string;
  children?: HellaChildren;
}

interface TableCellProps extends HTMLAttributes<"td"> {
  class?: string;
  children?: HellaChildren;
}

interface TableCaptionProps extends HTMLAttributes<"caption"> {
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

export function Table({ children, class: cls, ...attrs }: TableProps): JSX.Element {
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
          cn("w-full caption-bottom text-sm", cls)
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
        cn("[&_tr]:border-b", cls)
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
        cn("[&_tr:last-child]:border-0", cls)
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
        cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", cls)
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
        cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", cls)
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
        cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", cls)
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
        cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", cls)
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
        cn("mt-4 text-sm text-muted-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </caption>
  );
}
