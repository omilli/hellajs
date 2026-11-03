import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { toggleSwitch } from "@hellajs/headless";

export function ToggleSwitchDemo() {
  const checked = signal(false);

  const ToggleSwitch = toggleSwitch({
    checked: () => checked(),
    onCheckedChange: (next) => checked(next),
  });

  const toggleSwitchDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [role="switch"]': {
      borderRadius: "9999px",
      display: "inline-flex",
      height: "1.25rem",
      padding: "2px",
      width: "2.25rem",
    },
    '& [role="switch"][data-state="checked"]': {
      backgroundColor: "#e8e8f2",
    },
    '& [data-slot="switch-thumb"]': {
      backgroundColor: "#e8e8f2",
      borderRadius: "9999px",
      height: "1rem",
      width: "1rem",
    },
    '& [data-slot="switch-thumb"][data-state="checked"]': {
      backgroundColor: "#18181f",
      transform: "translateX(1rem)",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={toggleSwitchDemo}>
      <ToggleSwitch.Root>
        <ToggleSwitch.Indicator />
      </ToggleSwitch.Root>
      <p class="note">
        {() => (checked() ? "Airplane mode is on." : "Airplane mode is off.")}
      </p>
    </div>
  );
}
