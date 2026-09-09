import { signal } from "@hellajs/core";

export default function Counter({ initial = 0 }: { initial?: number }) {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
