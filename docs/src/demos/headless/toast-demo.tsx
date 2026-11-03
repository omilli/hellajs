import { style } from "@hellajs/css";
import { toast, Toaster } from "@hellajs/headless";

export function ToastDemo() {
  const toastDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The Toaster portals its ol into document.body, outside the demo root, so
  // the stack carries its own style() registration instead of a nested
  // selector.
  const toaster = style({
    bottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
    position: "fixed",
    right: "1rem",
    zIndex: 10,
    '& li[data-slot="toast"]': {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      fontSize: "0.875rem",
      padding: "0.75rem 0.875rem",
      width: "18rem",
    },
  });

  return (
    <div class={toastDemo}>
      <button
        on:click={() =>
          toast("Saved", { description: "Your work is safe", type: "success" })
        }
      >
        Save
      </button>
      <p class="note">Enqueue a card; it dismisses itself after four seconds.</p>
      <Toaster class={toaster} />
    </div>
  );
}
