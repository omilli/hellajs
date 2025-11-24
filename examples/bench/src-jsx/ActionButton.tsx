interface ButtonProps {
  id: string;
  onClick: () => void;
  text: string;
}

export const ActionButton = ((props: ButtonProps) => (
  <div class="col-sm-6">
    <button
      id={props.id}
      on:click={props.onClick}
      class="btn btn-primary btn-block col-md-6"
      type="button"
    >
      {props.text}
    </button>
  </div>
));
