import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import NativeSelect from "@registry/native-select/css/native-select.js";
import { muted } from "./demo-kit";

const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.75rem",
});



export default function NativeSelectDemo() {
  const region = signal("eu");

  return (
    <div class={row}>
      <NativeSelect value={region} onchange={(v) => region(v)} ariaLabel="Region">
        <option value="eu">EU Central</option>
        <option value="us">US East</option>
        <option value="ap" disabled>AP South (coming soon)</option>
      </NativeSelect>
      <p class={muted}>{() => `Echoing: ${region()}`}</p>
    </div>
  );
}

export function NativeSelectCompactDemo() {
  return (
    <div class={row}>
      <NativeSelect size="sm" ariaLabel="Compact select">
        <option value="a">Compact option A</option>
        <option value="b">Compact option B</option>
      </NativeSelect>
    </div>
  );
}
