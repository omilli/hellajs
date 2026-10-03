import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import RadioGroup from "@registry/radio-group/css/radio-group.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

export default function RadioGroupDemo() {
  const plan = signal("pro");

  return (
    <div class={stack}>
      <RadioGroup
        items={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "team", label: "Team", disabled: true },
        ]}
        value={plan}
        onValueChange={(next: string) => plan(next)}
      />
      <p class={muted}>{() => `Selected plan: ${plan()}. Arrow keys move focus and select, Home and End jump, and the disabled row is skipped.`}</p>
    </div>
  );
}

export function RadioGroupHorizontalDemo() {
  return (
    <div class={stack}>
      <RadioGroup
        orientation="horizontal"
        items={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "System" },
        ]}
      />
    </div>
  );
}
