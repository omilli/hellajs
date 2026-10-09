import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

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

interface TableProps extends HTMLAttributes<"table"> {
  class?: string;
  children?: HellaChildren;
}

export default function Table({ children, class: cls, ...attrs }: TableProps): HellaNode {
  return html`
    <div
      data-slot="table-container"
      class="${
        // @hella:compose
        [container]
        // @hella:end
      }"
    >
      <table
        data-slot="table"
        class="${
          // @hella:compose
          [base, cls]
          // @hella:end
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
        // @hella:compose
        [header, cls]
        // @hella:end
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
        // @hella:compose
        [body, cls]
        // @hella:end
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
        // @hella:compose
        [footer, cls]
        // @hella:end
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
        // @hella:compose
        [row, cls]
        // @hella:end
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
        // @hella:compose
        [head, cls]
        // @hella:end
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
        // @hella:compose
        [cell, cls]
        // @hella:end
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
        // @hella:compose
        [caption, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</caption>
  ` as HellaNode;
}
