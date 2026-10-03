import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Toggle, { toggleVariants } from "@registry/toggle/css/toggle.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

const row = style({
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
});



export default function ToggleDemo() {
  const bold = signal(false);

  return (
    <div class={stack}>
      <div class={row}>
        <Toggle
          pressed={bold}
          onPressedChange={(next: boolean) => bold(next)}
        >Bold</Toggle>
        <Toggle variant="outline">Italic</Toggle>
        <Toggle size="sm">Strike</Toggle>
        <Toggle size="lg" variant="outline">Underline</Toggle>
      </div>
      <p class={muted}>{() => `Bold is ${bold() ? "on" : "off"}: aria-pressed flips and the accent palette rides data-state.`}</p>
    </div>
  );
}

export function ToggleNeighborDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Toggle variant="outline" size="sm">Pin</Toggle>
        <button type="button" class={toggleVariants({ variant: "outline", size: "sm" })}>Neighbor</button>
      </div>
    </div>
  );
}
