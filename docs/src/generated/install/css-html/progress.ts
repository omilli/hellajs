import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const indeterminate = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(0)" },
});

const base = style("progress", {
  backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
  borderRadius: "calc(infinity * 1px)",
  height: "0.5rem",
  overflow: "hidden",
  position: "relative",
  width: "100%",
});

const indicator = style("progress-indicator", {
  backgroundColor: "var(--primary)",
  flex: "1",
  height: "100%",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&[data-state='indeterminate']": {
    animation: `${indeterminate} 2s linear infinite`,
  },
});

type ProgressValue = number | null | undefined;

interface ProgressProps extends HTMLAttributes<"div"> {
  class?: string;
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
}

export default function Progress({ value, class: cls, ...attrs }: ProgressProps): HellaNode {
  const current = (): ProgressValue => (typeof value === "function" ? value() : value);
  const state = (): string => {
    const v = current();
    return v == null ? "indeterminate" : v >= 100 ? "complete" : "loading";
  };
  return html`
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${() => current() ?? null}"
      data-state="${state}"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >
      <div
        data-slot="progress-indicator"
        data-state="${state}"
        style="${() => `transform: translateX(-${100 - (current() ?? 0)}%)`}"
        class="${
          [indicator]
        }"
      ></div>
    </div>
  ` as HellaNode;
}
