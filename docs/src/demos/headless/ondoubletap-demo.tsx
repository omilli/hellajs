import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onDoubleTap } from "@hellajs/headless/utils";

export function OnDoubleTapDemo() {
  const doubles = signal(0);
  const report = signal("Tap once to select, twice quickly to zoom");
  let disposeTaps: (() => void) | undefined;

  const onDoubleTapDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .tap-area": {
      alignItems: "center",
      border: "1px dashed #3a3a48",
      display: "flex",
      justifyContent: "center",
      minHeight: "5rem",
      touchAction: "manipulation",
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
    <div class={onDoubleTapDemo}>
      <div
        class="tap-area"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposeTaps = onDoubleTap(node, {
            onDoubleTap: () => {
              doubles(doubles() + 1);
              report(`Double tap: zoomed (doubles: ${doubles()})`);
            },
            onSingleTap: () => report("Single tap: selection point reported"),
          });
        }}
        hook:beforeDestroy={() => disposeTaps?.()}
      >
        Tap area
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
