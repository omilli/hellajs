import { signal } from "@hellajs/core";
import { NativeSelect, NativeSelectOption } from "@components/ui/native-select.js";

export function NativeSelectDemo() {
  const region = signal("eu");

  return (
    <>
      <NativeSelect
        value={region}
        on:change={(e: Event) => region((e.target as HTMLSelectElement).value)}
        aria-label="Region"
      >
        <NativeSelectOption value="eu">EU Central</NativeSelectOption>
        <NativeSelectOption value="us">US East</NativeSelectOption>
        <NativeSelectOption value="ap" disabled>AP South (coming soon)</NativeSelectOption>
      </NativeSelect>
      <p class="demo-muted">{() => `Echoing: ${region()}`}</p>
    </>
  );
}

export function NativeSelectCompactDemo() {
  return (
    <>
      <NativeSelect size="sm" aria-label="Compact select">
        <NativeSelectOption value="a">Compact option A</NativeSelectOption>
        <NativeSelectOption value="b">Compact option B</NativeSelectOption>
      </NativeSelect>
    </>
  );
}
