import { signal } from "@hellajs/core";
import { html } from "@hellajs/dom";

export default function MouseTracker() {
  const pointerX = signal(0);
  const pointerY = signal(0);

  return html`
    <div on:mousemove=${(event: MouseEvent) => {
      pointerX(event.clientX);
      pointerY(event.clientY);
    }}>
      Move your cursor here. Pointer: ${pointerX}, ${pointerY}
    </div>
  `;
}
