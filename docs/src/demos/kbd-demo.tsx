import { style } from "@hellajs/css";
import Kbd, { KbdGroup } from "@registry/kbd/css/kbd.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
});

const keyRow = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
}, { label: "demo-key-row" });

export default function KbdDemo() {
  return (
    <div class={stack}>
      <div class={keyRow}>
        Save changes <Kbd>⌘S</Kbd>
      </div>
      <div class={keyRow}>
        Dismiss <Kbd>esc</Kbd>
      </div>
    </div>
  );
}

export function KbdGroupDemo() {
  return (
    <div class={stack}>
      <KbdGroup>
        <Kbd>ctrl</Kbd>
        <Kbd>shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>
    </div>
  );
}
