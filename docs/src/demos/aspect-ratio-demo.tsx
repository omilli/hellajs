import { cx, style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import AspectRatio from "@registry/aspect-ratio/css/aspect-ratio.js";

const box = style({
  background: tokens.muted,
  borderRadius: tokens.radius,
  overflow: "hidden",
}, { label: "demo-box" });

const fill = style({
  alignItems: "center",
  color: tokens.mutedForeground,
  display: "flex",
  fontSize: "0.875rem",
  height: "100%",
  justifyContent: "center",
  width: "100%",
}, { label: "demo-fill" });

const square = style({ width: "8rem" }, { label: "demo-w-square" });
const grow = style({ flex: 1 }, { label: "demo-w-grow" });

export function AspectRatioDemo() {
  return (
    <AspectRatio ratio={16 / 9} class={box}>
      <div class={fill}>16 / 9</div>
    </AspectRatio>
  );
}

export function AspectRatioRatiosDemo() {
  return (
    <>
      <AspectRatio ratio={1} class={cx(box, square)}>
        <div class={fill}>1 / 1</div>
      </AspectRatio>
      <AspectRatio ratio={4 / 3} class={cx(box, grow)}>
        <div class={fill}>4 / 3</div>
      </AspectRatio>
    </>
  );
}
