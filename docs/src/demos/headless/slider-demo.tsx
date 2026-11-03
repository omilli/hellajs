import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { slider } from "@hellajs/headless";

export function SliderDemo() {
  const volume = signal(40);

  const Slider = slider({
    value: () => [volume()],
    onValueChange: (next) => volume(next[0] ?? 0),
  });

  const sliderDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "300px",
    '& [data-slot="slider"]': {
      alignItems: "center",
      display: "flex",
      padding: "0.5rem 0",
      position: "relative",
      touchAction: "none",
      userSelect: "none",
    },
    '& [data-slot="slider-track"]': {
      backgroundColor: "#3a3a48",
      height: "0.5rem",
      position: "relative",
      width: "100%",
    },
    '& [data-slot="slider-range"]': {
      backgroundColor: "#e8e8f2",
      height: "100%",
      position: "absolute",
    },
    '& [data-slot="slider-thumb"]': {
      backgroundColor: "#1c1c26",
      border: "2px solid #e8e8f2",
      boxSizing: "border-box",
      height: "1rem",
      width: "1rem",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={sliderDemo}>
      <Slider.Root>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb index={0} />
      </Slider.Root>
      <p class="note">{() => `Volume: ${volume()}`}</p>
    </div>
  );
}
