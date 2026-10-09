import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Button from "@registry/button/css/button.js";
import DirectionProvider from "@registry/direction/css/direction.js";



const panel = style({
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.75rem",
}, { label: "demo-panel" });

export function DirectionDemo() {
  const dir = signal<"ltr" | "rtl">("ltr");
  const flip = () => dir(dir() === "ltr" ? "rtl" : "ltr");

  return (
    <>
      <Button variant="outline" size="sm" on:click={flip}>{() => `Flip direction (${dir()})`}</Button>
      <DirectionProvider dir={dir}>
        <p class={panel}>This paragraph flips its inline direction with the wrapper's dir attribute; the wrapper itself stays out of layout.</p>
      </DirectionProvider>
    </>
  );
}

export function DirectionNestedDemo() {
  return (
    <>
      <DirectionProvider dir="rtl">
        <p class={panel}>النص العربي</p>
        <DirectionProvider dir="ltr">
          <p class={panel}>English inline</p>
        </DirectionProvider>
      </DirectionProvider>
    </>
  );
}
