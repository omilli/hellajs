import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import Progress from "@registry/progress/css/progress.js";

const advance = style({
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} - 2px)`,
  cursor: "pointer",
  fontSize: "0.75rem",
  padding: "0.25rem 0.5rem",
  width: "fit-content",
}, { label: "demo-advance" });

export function ProgressDemo() {
  const uploaded = signal(40);
  const step = () => uploaded(uploaded() >= 100 ? 0 : uploaded() + 20);

  return (
    <>
      <Progress value={uploaded} />
      <button class={advance} on:click={step}>{() => `Advance upload (${uploaded()}%)`}</button>
    </>
  );
}

export function ProgressIndeterminateDemo() {
  const scanning = signal<number | null>(null);

  return (
    <>
      <Progress value={scanning} />
    </>
  );
}
