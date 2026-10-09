import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import Separator from "@registry/separator/css/separator.js";

const section = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
}, { label: "demo-section" });

const sectionTitle = style({
  fontSize: "1.125rem",
  fontWeight: 500,
  margin: 0,
}, { label: "demo-section-title" });

const sectionNote = style({
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  margin: 0,
}, { label: "demo-section-note" });

const keyRow = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.75rem",
  height: "2rem",
}, { label: "demo-key-row" });

export function SeparatorDemo() {
  return (
    <>
      <div class={section}>
        <h3 class={sectionTitle}>Profile</h3>
        <p class={sectionNote}>Your public profile details.</p>
      </div>
      <Separator>{[]}</Separator>
      <div class={section}>
        <h3 class={sectionTitle}>Security</h3>
        <p class={sectionNote}>Sessions and two-factor settings.</p>
      </div>
    </>
  );
}

export function SeparatorVerticalDemo() {
  return (
    <>
      <div class={keyRow}>
        <span>Import</span>
        <Separator orientation="vertical">{[]}</Separator>
        <span>Export</span>
        <Separator orientation="vertical">{[]}</Separator>
        <span>Delete</span>
      </div>
    </>
  );
}
