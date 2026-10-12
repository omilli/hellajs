import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { ProgressValue, ProgressProps } from "./progress-types.js";

// @hella:styles
declare const base: string;
declare const indicator: string;
// @hella:end

export function Progress({ value, class: cls, ...attrs }: ProgressProps): HellaNode {
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
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      <div
        data-slot="progress-indicator"
        data-state="${state}"
        style="${() => `transform: translateX(-${100 - (current() ?? 0)}%)`}"
        class="${
          // @hella:compose
          [indicator]
          // @hella:end
        }"
      ></div>
    </div>
  ` as HellaNode;
}
