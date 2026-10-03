import { cx, style } from "@hellajs/css";
import AspectRatio from "@registry/aspect-ratio/css/aspect-ratio.js";
import { stack } from "./demo-kit";

const row = style({
  display: "flex",
  gap: "0.75rem",
  width: "100%",
});

const box = style({
  background: "var(--muted)",
  borderRadius: "var(--radius)",
  overflow: "hidden",
}, { label: "demo-box" });

const fill = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  height: "100%",
  justifyContent: "center",
  width: "100%",
}, { label: "demo-fill" });

const square = style({ width: "8rem" }, { label: "demo-w-square" });
const grow = style({ flex: 1 }, { label: "demo-w-grow" });

export default function AspectRatioDemo() {
  return (
    <div class={stack}>
      <AspectRatio ratio={16 / 9} class={box}>
        <div class={fill}>16 / 9</div>
      </AspectRatio>
    </div>
  );
}

export function AspectRatioRatiosDemo() {
  return (
    <div class={row}>
      <AspectRatio ratio={1} class={cx(box, square)}>
        <div class={fill}>1 / 1</div>
      </AspectRatio>
      <AspectRatio ratio={4 / 3} class={cx(box, grow)}>
        <div class={fill}>4 / 3</div>
      </AspectRatio>
    </div>
  );
}
