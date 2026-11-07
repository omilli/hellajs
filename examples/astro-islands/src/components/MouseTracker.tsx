import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";

export const tracker = style({
  marginTop: "1rem",
  padding: "1rem",
  minHeight: "3rem",
  border: "1px dashed #9ca3af",
  borderRadius: "0.375rem",
});

// client:only on the page: pointer coordinates only exist in a live browser,
// so the server render would emit a static "0, 0" island whose markup the
// client throws away anyway - skipping the server render loses nothing and
// keeps the component free of server branches.
export default function MouseTracker() {
  const pointerX = signal(0);
  const pointerY = signal(0);

  return (
    <div
      class={tracker}
      on:mousemove={(event: MouseEvent) => {
        pointerX(event.clientX);
        pointerY(event.clientY);
      }}
    >
      Move your cursor here. Pointer: {pointerX}, {pointerY}
    </div>
  );
}
