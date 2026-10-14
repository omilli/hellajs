import { html, HTMLAttributes } from "@hellajs/dom";

interface ButtonProps extends HTMLAttributes<"button"> {
  text: string;
}

export const ActionButton = ({ text, ...attrs }: ButtonProps) => html`
  <div class="col-sm-6">
    <button
      id=${attrs.id}
      on:click=${attrs["on:click"]}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      ${text}
    </button>
  </div>
`;
