import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { dialog } from "@hellajs/headless";

export function DialogDemo() {
  const open = signal(false);

  const Dialog = dialog({
    open: () => open(),
    onOpenChange: (next) => open(next),
  });

  // The overlay and panel portal into document.body, outside the demo root,
  // so each carries its own style() registration instead of a nested
  // selector.
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
  });

  return (
    <div>
      <Dialog.Trigger class="trigger">Open</Dialog.Trigger>
      <Dialog.Content
        class={panel}
        overlay={(state) => <div class={overlay} data-state={state()} />}
      >
        <h2 class="title" id="dialog-title">Confirm</h2>
        <p class="body" id="dialog-description">Proceed with the action.</p>
        <Dialog.Close class="close">Close</Dialog.Close>
      </Dialog.Content>
    </div>
  );
}
