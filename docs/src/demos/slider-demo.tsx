import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Slider from "@registry/slider/css/slider.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "26rem",
  width: "100%",
});

const controlRow = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  width: "100%",
}, { label: "demo-control-row" });

const verticalViewport = style({
  alignItems: "center",
  display: "flex",
  height: "10rem",
  width: "100%",
}, { label: "demo-vertical-viewport" });

export default function SliderDemo() {
  const volume = signal(40);

  return (
    <div class={stack}>
      <label class={controlRow}>
        Volume: {() => `${volume()}%`}
        <Slider
          value={() => [volume()]}
          onValueChange={(next: number[]) => volume(next[0] ?? 0)}
        />
      </label>
      <p class={muted}>One value, one thumb: drag the knob or focus it and use the arrow keys; every accepted move reports through onValueChange.</p>
    </div>
  );
}

export function SliderThumbsDemo() {
  const range = signal([25, 75]);

  return (
    <div class={stack}>
      <label class={controlRow}>
        Price range: {() => range()[0]} to {() => range()[1]}
        <Slider
          value={range}
          minStepsBetweenThumbs={5}
          onValueChange={(next: number[]) => range([...next])}
        />
      </label>
    </div>
  );
}

export function SliderVerticalDemo() {
  return (
    <div class={stack}>
      <div class={verticalViewport}>
        <Slider value={[60]} orientation="vertical" />
      </div>
    </div>
  );
}
