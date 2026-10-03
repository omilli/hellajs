import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Switch from "@registry/switch/css/switch.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
});

const switchRow = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
}, { label: "demo-switch-row" });

export default function SwitchDemo() {
  const airplane = signal(false);

  return (
    <div class={stack}>
      <label class={switchRow}>
        <Switch
          checked={airplane}
          onCheckedChange={(next: boolean) => airplane(next)}
        /> Airplane mode ({() => (airplane() ? "on" : "off")})
      </label>
    </div>
  );
}

export function SwitchDisabledDemo() {
  return (
    <div class={stack}>
      <label class={switchRow}><Switch checked={true} disabled /> Managed by policy</label>
    </div>
  );
}
