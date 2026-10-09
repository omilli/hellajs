import { signal } from "@hellajs/core";
import Textarea from "@registry/textarea/css/textarea.js";

export function TextareaDemo() {
  const bio = signal("");

  return (
    <>
      <Textarea
        value={bio}
        on:input={(e: Event) => bio((e.target as HTMLTextAreaElement).value)}
        placeholder="Tell us about yourself"
        rows={4}
        aria-label="Biography"
      />
      <p class="demo-muted">{() => `${bio().length} characters`}</p>
    </>
  );
}

export function TextareaInvalidDemo() {
  return (
    <>
      <Textarea placeholder="Required field" aria-invalid="true" aria-label="Invalid textarea example" />
    </>
  );
}
