import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { html } from "@hellajs/dom";

export const tracker = style({
  marginTop: "1rem",
  padding: "1rem",
  minHeight: "3rem",
  border: "1px dashed #9ca3af",
  borderRadius: "0.375rem",
}, {
  label: "tracker"
});

export default function MouseTracker() {
  const pointerX = signal(0);
  const pointerY = signal(0);

  return html`
    <div class=${tracker} on:mousemove=${(event: MouseEvent) => {
      pointerX(event.clientX);
      pointerY(event.clientY);
    }}>
      Move your cursor here. Pointer: ${pointerX}, ${pointerY}
    </div>
  `;
}
