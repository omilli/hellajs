import { HTMLAttributes } from "@hellajs/dom";

interface ButtonProps extends HTMLAttributes<"button"> {
  id: string;
  text: string;
}

export const ActionButton = ({id, text, ...attrs}: ButtonProps) => (
  <div class="col-sm-6">
    <button
      id={id}
      on:click={attrs["on:click"]}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      {text}
    </button>
  </div>
);
