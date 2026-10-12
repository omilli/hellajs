import type { HTMLAttributes } from "@hellajs/dom";

interface SpinnerProps extends HTMLAttributes<"svg"> {
  class?: string;
}
import { cn } from "./cn.js";

export function Spinner({ class: cls, ...attrs }: SpinnerProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="status"
      aria-label="Loading"
      class={
        cn("size-4 animate-spin", cls)
      }
      {...attrs}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
