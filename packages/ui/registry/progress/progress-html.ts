import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const indicator: string;
// @hella:end

type ProgressValue = number | null | undefined;

interface ProgressProps {
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
  class?: string;
}

export default function Progress(props: ProgressProps): HellaNode {
  const current = (): ProgressValue => (typeof props.value === "function" ? props.value() : props.value);
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
        [base, props.class]
        // @hella:end
      }"
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
