import { signal } from "@hellajs/core";
import { counterBtn } from "../theme";

export default function Counter({ initial = 0 }: { initial?: number }) {
  const count = signal(initial);
  return <button class={counterBtn} on:click={() => count(count() + 1)}>{count()}</button>;
}
