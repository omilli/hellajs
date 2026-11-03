import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onSwipe } from "@hellajs/headless/utils";

export function OnSwipeDemo() {
  const dx = signal(0);
  const report = signal("Drag the card sideways and release");
  let disposeSwipe: (() => void) | undefined;

  const onSwipeDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .card": {
      alignItems: "center",
      border: "1px dashed #3a3a48",
      cursor: "grab",
      display: "flex",
      justifyContent: "center",
      minHeight: "5rem",
      touchAction: "none",
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
    <div class={onSwipeDemo}>
      <div
        class="card"
        style={() => `transform: translate(${dx()}px, 0)`}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposeSwipe = onSwipe(node, {
            onMove: ({ dx: moved }) => dx(moved),
            onCommit: ({ direction, dx: total }) => {
              report(`Committed: ${direction} at dx: ${Math.round(total)} px`);
              dx(0);
            },
            onCancel: () => {
              report("Cancelled: snapped back");
              dx(0);
            },
          });
        }}
        hook:beforeDestroy={() => disposeSwipe?.()}
      >
        Swipe me
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
