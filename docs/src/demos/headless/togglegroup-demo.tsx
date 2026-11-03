import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { toggleGroup } from "@hellajs/headless";

export function ToggleGroupDemo() {
  const value = signal("");

  const ToggleGroup = toggleGroup({
    value: () => value(),
    onValueChange: (next) => value(next),
  });

  const toggleGroupDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [role="group"]': {
      display: "inline-flex",
    },
    '& [data-slot="toggle-group-item"][data-state="on"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={toggleGroupDemo}>
      <ToggleGroup.Root>
        <ToggleGroup.Item value="bold">Bold</ToggleGroup.Item>
        <ToggleGroup.Item value="italic">Italic</ToggleGroup.Item>
        <ToggleGroup.Item value="underline">Underline</ToggleGroup.Item>
      </ToggleGroup.Root>
      <p class="note">
        {() => (value() ? `Active: ${value()}` : "Single mode: one item at a time, re-click deselects.")}
      </p>
    </div>
  );
}
