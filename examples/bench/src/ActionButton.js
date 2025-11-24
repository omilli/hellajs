import { html } from "@hellajs/dom";

export const ActionButton = ({ id, onClick, text }) => html`
  <div class="col-sm-6">
    <button
      id=${id}
      on:click=${onClick}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      ${text}
    </button>
  </div>
`;
