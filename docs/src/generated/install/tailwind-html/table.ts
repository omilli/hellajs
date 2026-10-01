import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): HellaNode {
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
          cn("w-full caption-bottom text-sm", props.class)
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
        cn("[&_tr]:border-b", props.class)
      }"
    >${() => props.children}</thead>
  ` as HellaNode;
}

export function TableBody(props: TablePartProps): HellaNode {
  return html`
    <tbody
      data-slot="table-body"
      class="${
        cn("[&_tr:last-child]:border-0", props.class)
      }"
    >${() => props.children}</tbody>
  ` as HellaNode;
}

export function TableFooter(props: TablePartProps): HellaNode {
  return html`
    <tfoot
      data-slot="table-footer"
      class="${
        cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", props.class)
      }"
    >${() => props.children}</tfoot>
  ` as HellaNode;
}

export function TableRow(props: TablePartProps): HellaNode {
  return html`
    <tr
      data-slot="table-row"
      class="${
        cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", props.class)
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
        cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", props.class)
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
        cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", props.class)
      }"
    >${() => props.children}</td>
  ` as HellaNode;
}

export function TableCaption(props: TablePartProps): HellaNode {
  return html`
    <caption
      data-slot="table-caption"
      class="${
        cn("mt-4 text-sm text-muted-foreground", props.class)
      }"
    >${() => props.children}</caption>
  ` as HellaNode;
}
