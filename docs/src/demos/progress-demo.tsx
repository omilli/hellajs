import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Progress from "@registry/progress/css/progress.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  maxWidth: "26rem",
  width: "100%",
});

const advance = style({
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) - 2px)",
  cursor: "pointer",
  fontSize: "0.75rem",
  padding: "0.25rem 0.5rem",
  width: "fit-content",
}, { label: "demo-advance" });

export default function ProgressDemo() {
  const uploaded = signal(40);
  const step = () => uploaded(uploaded() >= 100 ? 0 : uploaded() + 20);

  return (
    <div class={stack}>
      <Progress value={uploaded} />
      <button class={advance} on:click={step}>{() => `Advance upload (${uploaded()}%)`}</button>
    </div>
  );
}

export function ProgressIndeterminateDemo() {
  const scanning = signal<number | null>(null);

  return (
    <div class={stack}>
      <Progress value={scanning} />
    </div>
  );
}
