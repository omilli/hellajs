import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";

interface CounterProps {
  initial?: number;
}

export const counterBtn = style({
  padding: "0.5rem 1.25rem",
  fontSize: "1rem",
  cursor: "pointer",
  borderRadius: "0.375rem",
  border: "1px solid #2563eb",
  backgroundColor: "#eff6ff",
});

export default function Counter({ initial = 0 }: CounterProps) {
  const count = signal(initial);

  return (
    <button class={counterBtn} on:click={() => count(count() + 1)}>
      {count()}
    </button>
  );
}
