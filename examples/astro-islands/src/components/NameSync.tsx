import { signal } from "@hellajs/core";
import { $ref } from "@hellajs/dom";

export default function NameSync() {
  const name = signal("User");

  $ref("#name-input")
    .text(name)
    .on("input", (event) => {
      const input = event.target as HTMLInputElement;
      name(input.value);
    });

  $ref("#greeting").text(() => `Hello, ${name()}!`);

  return <p>Typing in the input above updates the greeting through a $ref binding.</p>;
}
