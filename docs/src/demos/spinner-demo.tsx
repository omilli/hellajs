import { style } from "@hellajs/css";
import Spinner from "@registry/spinner/css/spinner.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

const sizeRow = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  display: "flex",
  gap: "0.5rem",
}, { label: "demo-size-row" });

const sizeLabel = style({
  fontSize: "0.875rem",
}, { label: "demo-size-label" });

const spinnerSm = style({ height: "0.75rem", width: "0.75rem" }, { label: "demo-sp-sm" });
const spinnerLg = style({ height: "1.5rem", width: "1.5rem" }, { label: "demo-sp-lg" });

const busyButton = style({
  alignItems: "center",
  background: "var(--primary)",
  borderRadius: "calc(var(--radius) - 2px)",
  color: "var(--primary-foreground)",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: 500,
  gap: "0.5rem",
  opacity: 0.5,
  padding: "0.5rem 1rem",
}, { label: "demo-busy-button" });

export default function SpinnerDemo() {
  return (
    <div class={stack}>
      <div class={sizeRow}>
        <Spinner class={spinnerSm} />
        <span class={sizeLabel}>Small</span>
      </div>
      <div class={sizeRow}>
        <Spinner />
        <span class={sizeLabel}>Default</span>
      </div>
      <div class={sizeRow}>
        <Spinner class={spinnerLg} />
        <span class={sizeLabel}>Large</span>
      </div>
    </div>
  );
}

export function SpinnerBusyDemo() {
  return (
    <div class={stack}>
      <button type="button" disabled class={busyButton}>
        <Spinner />
        Saving...
      </button>
    </div>
  );
}
