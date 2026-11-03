import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { toggle } from "@hellajs/headless";

export function ToggleDemo() {
  const pressed = signal(false);

  const Toggle = toggle({
    pressed: () => pressed(),
    onPressedChange: (next) => pressed(next),
  });

  const toggleDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [data-slot="toggle"][data-state="on"]': {
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
    <div class={toggleDemo}>
      <Toggle.Root>Bold</Toggle.Root>
      <p class="note">
        {() => (pressed() ? "Pressed: bold text on." : "Pressed off; click to bold.")}
      </p>
    </div>
  );
}
