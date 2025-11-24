import { html } from "@hellajs/dom";
import { remove, selected, type RowSchema } from "./state";

export const Row = ({ row }: { row: RowSchema }) => html`
  <tr @class=${() => selected() === row.id ? 'danger' : ''} key=${row.id}>
    <td class="col-md-1">${row.id}</td>
    <td class="col-md-4">
      <a class="lbl" on:click=${() => selected(row.id)}>
        ${row.label}
      </a>
    </td>
    <td class="col-md-1">
      <a class="remove" on:click=${() => remove(row.id)}>
        <span class="glyphicon glyphicon-remove" ariaHidden="true"></span>
      </a>
    </td>
  </tr>
`;
