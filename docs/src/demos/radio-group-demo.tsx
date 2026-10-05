import { signal } from "@hellajs/core";
import RadioGroup from "@registry/radio-group/css/radio-group.js";

export function RadioGroupDemo() {
  const plan = signal("pro");

  return (
    <>
      <RadioGroup
        items={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "team", label: "Team", disabled: true },
        ]}
        value={plan}
        onValueChange={(next: string) => plan(next)}
      />
      <p class="demo-muted">{() => `Selected plan: ${plan()}. Arrow keys move focus and select, Home and End jump, and the disabled row is skipped.`}</p>
    </>
  );
}

export function RadioGroupHorizontalDemo() {
  return (
    <>
      <RadioGroup
        orientation="horizontal"
        items={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "System" },
        ]}
      />
    </>
  );
}
