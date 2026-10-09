import { signal } from "@hellajs/core";
import NativeSelect from "@registry/native-select/css/native-select.js";

export function NativeSelectDemo() {
  const region = signal("eu");

  return (
    <>
      <NativeSelect
        value={region}
        on:change={(e: Event) => region((e.target as HTMLSelectElement).value)}
        aria-label="Region"
      >
        <option value="eu">EU Central</option>
        <option value="us">US East</option>
        <option value="ap" disabled>AP South (coming soon)</option>
      </NativeSelect>
      <p class="demo-muted">{() => `Echoing: ${region()}`}</p>
    </>
  );
}

export function NativeSelectCompactDemo() {
  return (
    <>
      <NativeSelect size="sm" aria-label="Compact select">
        <option value="a">Compact option A</option>
        <option value="b">Compact option B</option>
      </NativeSelect>
    </>
  );
}
