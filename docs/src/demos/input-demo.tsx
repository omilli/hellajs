import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Input from "@registry/input/css/input.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  maxWidth: "26rem",
  width: "100%",
});



export default function InputDemo() {
  const email = signal("");

  return (
    <div class={stack}>
      <Input value={email} oninput={(v) => email(v)} placeholder="Email address" aria-label="Email address" />
      <p class={muted}>{() => `Echoing: ${email() === "" ? "nothing yet" : email()}`}</p>
    </div>
  );
}

export function InputInvalidDemo() {
  return (
    <div class={stack}>
      <Input placeholder="Required field" ariaInvalid={true} aria-label="Invalid input example" />
    </div>
  );
}
