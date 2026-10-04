import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { $ref, html } from "@hellajs/dom";

export const note = style({
  color: "#6b7280",
}, {
  label: "note"
});

export default function NameSync() {
  const name = signal("World");

  $ref("#name-input").on("input", (event) => {
    const input = event.target as HTMLInputElement;
    name(input.value);
  });
  $ref("#greeting").bind(() => `Hello, ${name()}!`);

  return html`
    <p class=${note}>Typing in the input above updates the greeting through a $ref binding.</p>
  `;
}
