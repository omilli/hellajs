import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { onPinch } from "@hellajs/headless/utils";

export function OnPinchDemo() {
  const report = signal("Pinch the pad with two pointers");
  let disposePinch: (() => void) | undefined;

  const onPinchDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .pad": {
      alignItems: "center",
      border: "1px dashed #3a3a48",
      display: "flex",
      justifyContent: "center",
      minHeight: "8rem",
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
    <div class={onPinchDemo}>
      <div
        class="pad"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposePinch = onPinch(node, {
            onMove: ({ scale, dx, dy }) => {
              node.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
              report(`Pinch: scale ${scale.toFixed(2)}x, pan (${Math.round(dx)}, ${Math.round(dy)})`);
            },
            onEnd: () => report("Pinch ended"),
          });
        }}
        hook:beforeDestroy={() => disposePinch?.()}
      >
        Pinch pad
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
