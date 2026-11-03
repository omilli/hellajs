import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onEscape } from "@hellajs/headless/utils";

export function OnEscapeDemo() {
  const mounted = signal(true);
  const report = signal("Focus inside the panel, then press Escape");
  let disposeEscape: (() => void) | undefined;

  const onEscapeDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .panel": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      display: "flex",
      flexDirection: "column",
      fontSize: "0.875rem",
      gap: "0.75rem",
      padding: "1rem",
      width: "16rem",
    },
    "& .panel p": {
      margin: 0,
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={onEscapeDemo}>
      {() =>
        mounted() ? (
          <div
            class="panel"
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              disposeEscape = onEscape(node, () => {
                report("Escape fired on the panel: handler ran");
                mounted(false);
              });
            }}
            hook:beforeDestroy={() => {
              disposeEscape?.();
              disposeEscape = undefined;
            }}
          >
            <p>Press Escape while focus is inside this panel.</p>
            <button type="button">Focus here first</button>
          </div>
        ) : (
          <button
            type="button"
            class="restore"
            on:click={() => {
              mounted(true);
              report("Panel rewired: focus inside and press Escape again");
            }}
          >
            Restore panel
          </button>
        )
      }
      <p class="note">{() => report()}</p>
    </div>
  );
}
