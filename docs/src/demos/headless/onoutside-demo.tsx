import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onOutside } from "@hellajs/headless/utils";

export function OnOutsideDemo() {
  const fires = signal(0);
  const report = signal("Clicks outside the menu fire the handler");
  let disposeOutside: (() => void) | undefined;

  const onOutsideDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .menu": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      fontSize: "0.875rem",
      padding: "1rem",
      width: "fit-content",
    },
    "& .note": {
      fontSize: "0.8125rem",
      fontVariantNumeric: "tabular-nums",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={onOutsideDemo}>
      <nav
        class="menu"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposeOutside = onOutside(() => [node], () => {
            const next = fires() + 1;
            fires(next);
            report(`Outside pointerdown: handler ran (fires: ${next})`);
          });
        }}
        hook:beforeDestroy={() => disposeOutside?.()}
      >
        <button
          type="button"
          onClick={() => report("Inside click: handler did not run")}
        >
          Menu
        </button>
      </nav>
      <p class="note">{() => report()}</p>
    </div>
  );
}
