import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Textarea from "@registry/textarea/css/textarea.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  maxWidth: "26rem",
  width: "100%",
});



export default function TextareaDemo() {
  const bio = signal("");

  return (
    <div class={stack}>
      <Textarea value={bio} oninput={(v) => bio(v)} placeholder="Tell us about yourself" rows={4} ariaLabel="Biography" />
      <p class={muted}>{() => `${bio().length} characters`}</p>
    </div>
  );
}

export function TextareaInvalidDemo() {
  return (
    <div class={stack}>
      <Textarea placeholder="Required field" ariaInvalid={true} ariaLabel="Invalid textarea example" />
    </div>
  );
}
