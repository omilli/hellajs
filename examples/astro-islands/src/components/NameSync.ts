import { signal } from "@hellajs/core";
import { $ref, html } from "@hellajs/dom";

export default function NameSync() {
  const name = signal("World");

  $ref("#name-input").on("input", (event) => {
    const input = event.target as HTMLInputElement;
    name(input.value);
  });
  $ref("#greeting").bind(() => `Hello, ${name()}!`);

  return html`
    <p>Typing in the input above updates the greeting through a $ref binding.</p>
  `;
}
