import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onLongPress } from "@hellajs/headless/utils";

export function OnLongPressDemo() {
  const report = signal("Press and hold the tile");
  let disposePress: (() => void) | undefined;

  const onLongPressDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .tile": {
      alignItems: "center",
      border: "1px dashed #3a3a48",
      display: "flex",
      justifyContent: "center",
      minHeight: "5rem",
      userSelect: "none",
      width: "14rem",
    },
    "& .note": {
      fontSize: "0.8125rem",
      fontVariantNumeric: "tabular-nums",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={onLongPressDemo}>
      <div
        class="tile"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposePress = onLongPress(node, (event) => {
            report(`Press fired at (${event.clientX}, ${event.clientY}) after the 400ms hold`);
          }, { duration: 400 });
        }}
        hook:beforeDestroy={() => disposePress?.()}
      >
        Hold me
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
