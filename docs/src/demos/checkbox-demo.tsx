import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Checkbox from "@registry/checkbox/css/checkbox.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  maxWidth: "26rem",
  width: "100%",
});

const checkRow = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "demo-check-row" });

export default function CheckboxDemo() {
  const subscribed = signal(false);

  return (
    <div class={stack}>
      <label class={checkRow}>
        <Checkbox checked={subscribed} onCheckedChange={(next: boolean) => subscribed(next)} />
        Subscribe ({() => (subscribed() ? "on" : "off")})
      </label>
    </div>
  );
}

export function CheckboxIndeterminateDemo() {
  return (
    <div class={stack}>
      <label class={checkRow}><Checkbox indeterminate /> Notify participants</label>
      <label class={checkRow}><Checkbox checked={true} /> Email receipts</label>
    </div>
  );
}
