import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Checkbox from "@registry/checkbox/css/checkbox.js";

const checkRow = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "demo-check-row" });

export function CheckboxDemo() {
  const subscribed = signal(false);

  return (
    <>
      <label class={checkRow}>
        <Checkbox checked={subscribed} onCheckedChange={(next: boolean) => subscribed(next)} />
        Subscribe ({() => (subscribed() ? "on" : "off")})
      </label>
    </>
  );
}

export function CheckboxIndeterminateDemo() {
  return (
    <>
      <label class={checkRow}><Checkbox indeterminate /> Notify participants</label>
      <label class={checkRow}><Checkbox checked={true} /> Email receipts</label>
    </>
  );
}
