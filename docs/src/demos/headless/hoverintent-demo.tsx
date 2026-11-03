import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { hoverIntent } from "@hellajs/headless/utils";

export function HoverIntentDemo() {
  const open = signal(false);
  let disposeIntent: (() => void) | undefined;

  const hoverIntentDemo = style({
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .surface": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      fontSize: "0.875rem",
      padding: "0.5rem 0.75rem",
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={hoverIntentDemo}>
      <button
        type="button"
        class="trigger"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposeIntent = hoverIntent(node, {
            openDelay: 200,
            closeDelay: 150,
            onOpen: () => open(true),
            onClose: () => open(false),
          });
        }}
        hook:beforeDestroy={() => disposeIntent?.()}
      >
        Profile
      </button>
      {() => (open() ? <div class="surface">Profile card</div> : null)}
      <p class="note">
        {() => (open() ? "Open: the hover delay elapsed" : "Hover the button and hold to open")}
      </p>
    </div>
  );
}
