import { style } from "@hellajs/css";
import Label from "@registry/label/css/label.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
});

const bareInput = style({
  background: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) - 2px)",
  display: "flex",
  fontSize: "0.875rem",
  height: "2.25rem",
  maxWidth: "20rem",
  padding: "0 0.75rem",
  width: "100%",
}, { label: "demo-bare-input" });

const dimmed = style({ opacity: 0.5 }, { label: "demo-dimmed" });

export function LabelDemo() {
  return (
    <>
      <Label for="demo-name">Project name</Label>
      <input id="demo-name" placeholder="acme-site" class={bareInput} />
    </>
  );
}

export function LabelDisabledDemo() {
  return (
    <div class="demo-stack group" data-disabled="true">
      <Label for="demo-region">Region</Label>
      <input id="demo-region" value="eu-central-1" disabled class={`${bareInput} ${dimmed}`} />
    </div>
  );
}
