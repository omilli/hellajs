import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Toggle, { toggleVariants } from "@registry/toggle/css/toggle.js";

const row = style({
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
});



export function ToggleDemo() {
  const bold = signal(false);

  return (
    <>
      <div class="demo-row">
        <Toggle
          pressed={bold}
          onPressedChange={(next: boolean) => bold(next)}
        >Bold</Toggle>
        <Toggle variant="outline">Italic</Toggle>
        <Toggle size="sm">Strike</Toggle>
        <Toggle size="lg" variant="outline">Underline</Toggle>
      </div>
      <p class="demo-muted">{() => `Bold is ${bold() ? "on" : "off"}: aria-pressed flips and the accent palette rides data-state.`}</p>
    </>
  );
}

export function ToggleNeighborDemo() {
  return (
    <>
      <div class="demo-row">
        <Toggle variant="outline" size="sm">Pin</Toggle>
        <button type="button" class={toggleVariants({ variant: "outline", size: "sm" })}>Neighbor</button>
      </div>
    </>
  );
}
