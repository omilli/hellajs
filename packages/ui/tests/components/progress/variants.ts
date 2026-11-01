import { Progress as ProgressCssJsx } from "../../../dist/registry/progress/css/progress";
import { Progress as ProgressTailwindJsx } from "../../../dist/registry/progress/tailwind/progress";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Progress variant (mirrors the emitted ProgressProps). */
export interface ProgressVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
}
/**
 * Every compiled Progress variant from dist/registry. Progress renders no
 * children, so the suites carry no `child` wrapper.
 */
export const progressVariants: ComponentVariant<ProgressVariantProps>[] = [
  { style: "css", render: ProgressCssJsx },
  { style: "tailwind", render: ProgressTailwindJsx },
];
