import { css } from "@hellajs/css";
import { size } from "../lib/utils";
import { modalModule } from "../lib/modal";

const modalStyles = modalModule();

export const Modal = () => {
  const showModal = () => {
    const dialog = document.getElementById("example-modal") as HTMLDialogElement;
    dialog?.showModal();
  };

  const closeModal = () => {
    const dialog = document.getElementById("example-modal") as HTMLDialogElement;
    dialog?.close();
  };

  return (
    <div>
      <h2 class={css({ fontSize: size(1.5), marginBottom: size(1), fontWeight: 600 })}>
        Modal (Dialog)
      </h2>

      <button class="btn btn-primary" onClick={showModal}>
        Open Modal
      </button>

      <dialog
        id="example-modal"
        class={modalStyles.baseDialog}
        onClick={(e: MouseEvent) => {
          const modal = document.getElementById("modal")?.getBoundingClientRect();
          if (!modal) return;
          const isInDialog =
            modal.top <= e.clientY &&
            e.clientY <= modal.top + modal.height &&
            modal.left <= e.clientX &&
            e.clientX <= modal.left + modal.width;

          !isInDialog && closeModal();
        }}
      >
        <div id="modal" class={css({
          padding: "1rem"
        })}>
          Dialog
        </div>
      </dialog>
    </div>
  );
};
