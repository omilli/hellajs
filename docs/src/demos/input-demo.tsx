import { signal } from "@hellajs/core";
import Input from "@registry/input/css/input.js";

export function InputDemo() {
  const email = signal("");

  return (
    <>
      <Input value={email} oninput={(v) => email(v)} placeholder="Email address" aria-label="Email address" />
      <p class="demo-muted">{() => `Echoing: ${email() === "" ? "nothing yet" : email()}`}</p>
    </>
  );
}

export function InputInvalidDemo() {
  return (
    <>
      <Input placeholder="Required field" ariaInvalid={true} aria-label="Invalid input example" />
    </>
  );
}
