import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onDrag } from "@hellajs/headless/utils";

export function OnDragDemo() {
  const dx = signal(0);
  const dy = signal(0);
  let disposeDrag: (() => void) | undefined;

  const onDragDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .track": {
      alignItems: "center",
      backgroundColor: "#3a3a48",
      display: "flex",
      height: "5rem",
      justifyContent: "center",
      width: "16rem",
    },
    "& .handle": {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
      cursor: "grab",
      padding: "0.5rem 0.75rem",
      touchAction: "none",
      userSelect: "none",
    },
    "& .note": {
      fontSize: "0.8125rem",
      fontVariantNumeric: "tabular-nums",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={onDragDemo}>
      <div class="track">
        <div
          class="handle"
          style={() => `transform: translate(${dx()}px, ${dy()}px)`}
          hook:afterMount={(node) => {
            if (!(node instanceof HTMLElement)) return;
            disposeDrag = onDrag(node, {
              onMove: (delta) => {
                dx(delta.dx);
                dy(delta.dy);
              },
            });
          }}
          hook:beforeDestroy={() => disposeDrag?.()}
        >
          Drag me
        </div>
      </div>
      <p class="note">
        {() => `dx: ${Math.round(dx())} px, dy: ${Math.round(dy())} px from the drag start`}
      </p>
    </div>
  );
}
