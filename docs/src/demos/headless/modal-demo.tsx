import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { modal } from "@hellajs/headless/utils";

export function ModalDemo() {
  const showPanel = signal(false);
  const openState = signal(false);

  const modalDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The overlay and panel are fixed overlays, outside the demo root's flow,
  // so each carries its own style() registration.
  const overlay = style({
    backgroundColor: "rgb(0 0 0 / 0.55)",
    inset: 0,
    position: "fixed",
    zIndex: 10,
  });

  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    left: "50%",
    padding: "1.5rem",
    position: "fixed",
    top: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 11,
    '&[data-state="closed"]': {
      opacity: 0,
    },
  });

  return (
    <div class={modalDemo}>
      <button
        type="button"
        class="trigger"
        on:click={() => {
          // Arm before mounting: the panel's data-state effect reads this signal
          // at creation, so the flip must precede the region rebuild.
          openState(true);
          showPanel(true);
        }}
      >
        Open modal
      </button>
      {() =>
        showPanel() ? (
          <div class={overlay}>
            {/* hook:afterMount precedes data-state on purpose: attrs wire in
            source order, and an effect created before the hook (a reactive
            attr below it) re-running between insertion and the afterMount
            walk marks the node mounted, cancelling the pending afterMount. */}
            <div
              role="dialog"
              aria-modal="true"
              class={panel}
              hook:afterMount={(node) => {
                if (!(node instanceof HTMLElement)) return;
                modal(node, {
                  state: () => (openState() ? "open" : "closed"),
                  onClose: () => openState(false),
                  onExited: () => showPanel(false),
                });
              }}
              data-state={() => (openState() ? "open" : "closed")}
            >
              <h2 class="title" id="modal-demo-title">Confirm</h2>
              <p class="body" id="modal-demo-description">
                The panel is armed: focus is trapped while open.
              </p>
              <button type="button" class="close" on:click={() => openState(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null
      }
      <p class="note">
        {() =>
          !showPanel()
            ? "Open the modal, then press Escape"
            : openState()
              ? "Armed: Escape and outside clicks close through the exit hook"
              : "Closing: the exit hook unmounts the panel"
        }
      </p>
    </div>
  );
}
