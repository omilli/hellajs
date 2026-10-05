import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Switch from "@registry/switch/css/switch.js";

const switchRow = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
}, { label: "demo-switch-row" });

export function SwitchDemo() {
  const airplane = signal(false);

  return (
    <>
      <label class={switchRow}>
        <Switch
          checked={airplane}
          onCheckedChange={(next: boolean) => airplane(next)}
        /> Airplane mode ({() => (airplane() ? "on" : "off")})
      </label>
    </>
  );
}

export function SwitchDisabledDemo() {
  return (
    <>
      <label class={switchRow}><Switch checked={true} disabled /> Managed by policy</label>
    </>
  );
}
