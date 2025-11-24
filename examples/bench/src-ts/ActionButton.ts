import { html } from "@hellajs/dom";

interface ButtonProps {
  id: string;
  onClick: () => void;
  text: string;
}

export const ActionButton = ({ id, onClick, text }: ButtonProps) => html`
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
