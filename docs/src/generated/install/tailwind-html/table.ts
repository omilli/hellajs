import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface TableProps extends HTMLAttributes<"table"> {
  class?: string;
  children?: HellaChildren;
}

export default function Table({ children, class: cls, ...attrs }: TableProps): HellaNode {
  return html`
    <div
      data-slot="table-container"
      class="${
        cn("relative w-full overflow-x-auto")
      }"
    >
      <table
        data-slot="table"
        class="${
          cn("w-full caption-bottom text-sm", cls)
        }"
        ...${attrs}
      >${() => children}</table>
    </div>
  ` as HellaNode;
}

interface TableHeaderProps extends HTMLAttributes<"thead"> {
  class?: string;
  children?: HellaChildren;
}

export function TableHeader({ children, class: cls, ...attrs }: TableHeaderProps): HellaNode {
  return html`
    <thead
      data-slot="table-header"
      class="${
        cn("[&_tr]:border-b", cls)
      }"
      ...${attrs}
    >${() => children}</thead>
  ` as HellaNode;
}

interface TableBodyProps extends HTMLAttributes<"tbody"> {
  class?: string;
  children?: HellaChildren;
}

export function TableBody({ children, class: cls, ...attrs }: TableBodyProps): HellaNode {
  return html`
    <tbody
      data-slot="table-body"
      class="${
        cn("[&_tr:last-child]:border-0", cls)
      }"
      ...${attrs}
    >${() => children}</tbody>
  ` as HellaNode;
}

interface TableFooterProps extends HTMLAttributes<"tfoot"> {
  class?: string;
  children?: HellaChildren;
}

export function TableFooter({ children, class: cls, ...attrs }: TableFooterProps): HellaNode {
  return html`
    <tfoot
      data-slot="table-footer"
      class="${
        cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", cls)
      }"
      ...${attrs}
    >${() => children}</tfoot>
  ` as HellaNode;
}

interface TableRowProps extends HTMLAttributes<"tr"> {
  class?: string;
  children?: HellaChildren;
}

export function TableRow({ children, class: cls, ...attrs }: TableRowProps): HellaNode {
  return html`
    <tr
      data-slot="table-row"
      class="${
        cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", cls)
      }"
      ...${attrs}
    >${() => children}</tr>
  ` as HellaNode;
}

interface TableHeadProps extends HTMLAttributes<"th"> {
  class?: string;
  children?: HellaChildren;
}

export function TableHead({ children, class: cls, ...attrs }: TableHeadProps): HellaNode {
  return html`
    <th
      data-slot="table-head"
      class="${
        cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", cls)
      }"
      ...${attrs}
    >${() => children}</th>
  ` as HellaNode;
}

interface TableCellProps extends HTMLAttributes<"td"> {
  class?: string;
  children?: HellaChildren;
}

export function TableCell({ children, class: cls, ...attrs }: TableCellProps): HellaNode {
  return html`
    <td
      data-slot="table-cell"
      class="${
        cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", cls)
      }"
      ...${attrs}
    >${() => children}</td>
  ` as HellaNode;
}

interface TableCaptionProps extends HTMLAttributes<"caption"> {
  class?: string;
  children?: HellaChildren;
}

export function TableCaption({ children, class: cls, ...attrs }: TableCaptionProps): HellaNode {
  return html`
    <caption
      data-slot="table-caption"
      class="${
        cn("mt-4 text-sm text-muted-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</caption>
  ` as HellaNode;
}
