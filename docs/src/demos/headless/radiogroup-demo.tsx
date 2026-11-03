import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { radioGroup } from "@hellajs/headless";

export function RadioGroupDemo() {
  const value = signal("");

  const RadioGroup = radioGroup({
    value: () => value(),
    onValueChange: (next) => value(next),
  });

  const radioGroupDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [role="radiogroup"]': {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    '& [data-slot="radio-group-indicator"]': {
      display: "inline-flex",
      width: "0.875rem",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={radioGroupDemo}>
      <RadioGroup.Root>
        <RadioGroup.Item value="react">
          <RadioGroup.Indicator value="react" />
          React
        </RadioGroup.Item>
        <RadioGroup.Item value="solid">
          <RadioGroup.Indicator value="solid" />
          Solid
        </RadioGroup.Item>
        <RadioGroup.Item value="vue">
          <RadioGroup.Indicator value="vue" />
          Vue
        </RadioGroup.Item>
      </RadioGroup.Root>
      <p class="note">
        {() => (value() ? `Selected: ${value()}` : "Pick a framework; arrows move and select.")}
      </p>
    </div>
  );
}
