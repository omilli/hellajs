import { signal } from "@hellajs/core";
import Textarea from "@registry/textarea/css/textarea.js";

export function TextareaDemo() {
  const bio = signal("");

  return (
    <>
      <Textarea value={bio} oninput={(v) => bio(v)} placeholder="Tell us about yourself" rows={4} ariaLabel="Biography" />
      <p class="demo-muted">{() => `${bio().length} characters`}</p>
    </>
  );
}

export function TextareaInvalidDemo() {
  return (
    <>
      <Textarea placeholder="Required field" ariaInvalid={true} ariaLabel="Invalid textarea example" />
    </>
  );
}
