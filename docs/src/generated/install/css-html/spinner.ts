import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

const base = style("spinner", {
  animation: `${spin} 1s linear infinite`,
  height: "1rem",
  width: "1rem",
});

interface SpinnerProps extends HTMLAttributes<"svg"> {
  class?: string;
}

export default function Spinner({ class: cls, ...attrs }: SpinnerProps): HellaNode {
  return html`
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
      class="${
        [base, cls]
      }"
      ...${attrs}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ` as HellaNode;
}
