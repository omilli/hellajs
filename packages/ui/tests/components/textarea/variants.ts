import { Textarea as TextareaCssJsx } from "../../../dist/registry/textarea/css/textarea";
import { Textarea as TextareaTailwindJsx } from "../../../dist/registry/textarea/tailwind/textarea";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Textarea variant (mirrors the emitted TextareaProps). */
export interface TextareaVariantProps extends HTMLAttributes<"textarea"> {
  class?: string;
}
/**
 * Every compiled Textarea variant from dist/registry. Textarea renders no
 * children (its value is the property), so the suites carry no `child` wrapper.
 */
export const textareaVariants: ComponentVariant<TextareaVariantProps>[] = [
  { style: "css", render: TextareaCssJsx },
  { style: "tailwind", render: TextareaTailwindJsx },
];
