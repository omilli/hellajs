import { Spinner as SpinnerCssJsx } from "../../../dist/registry/spinner/css/spinner";
import { Spinner as SpinnerTailwindJsx } from "../../../dist/registry/spinner/tailwind/spinner";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Spinner variant (mirrors the emitted SpinnerProps). */
export interface SpinnerVariantProps extends HTMLAttributes<"svg"> {
  class?: string;
}
/**
 * Every compiled Spinner variant from dist/registry. Spinner renders fixed svg
 * innards, so the suites carry no `child` wrapper.
 */
export const spinnerVariants: ComponentVariant<SpinnerVariantProps>[] = [
  { style: "css", render: SpinnerCssJsx },
  { style: "tailwind", render: SpinnerTailwindJsx },
];
