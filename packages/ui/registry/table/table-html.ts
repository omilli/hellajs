import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface TableProps {
  children?: HellaChildren;
  class?: string;
}

export default function Table(props: TableProps): HellaNode {
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
          [base, props.class]
          // @hella:end
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
        // @hella:compose
        [header, props.class]
        // @hella:end
      }"
    >${() => props.children}</thead>
  ` as HellaNode;
}

export function TableBody(props: TablePartProps): HellaNode {
  return html`
    <tbody
      data-slot="table-body"
      class="${
        // @hella:compose
        [body, props.class]
        // @hella:end
      }"
    >${() => props.children}</tbody>
  ` as HellaNode;
}

export function TableFooter(props: TablePartProps): HellaNode {
  return html`
    <tfoot
      data-slot="table-footer"
      class="${
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${() => props.children}</tfoot>
  ` as HellaNode;
}

export function TableRow(props: TablePartProps): HellaNode {
  return html`
    <tr
      data-slot="table-row"
      class="${
        // @hella:compose
        [row, props.class]
        // @hella:end
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
        // @hella:compose
        [head, props.class]
        // @hella:end
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
        // @hella:compose
        [cell, props.class]
        // @hella:end
      }"
    >${() => props.children}</td>
  ` as HellaNode;
}

export function TableCaption(props: TablePartProps): HellaNode {
  return html`
    <caption
      data-slot="table-caption"
      class="${
        // @hella:compose
        [caption, props.class]
        // @hella:end
      }"
    >${() => props.children}</caption>
  ` as HellaNode;
}
