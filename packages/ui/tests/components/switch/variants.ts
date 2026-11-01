import { Switch as SwitchCssJsx } from "../../../dist/registry/switch/css/switch";
import { Switch as SwitchTailwindJsx } from "../../../dist/registry/switch/tailwind/switch";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Switch variant (mirrors the emitted SwitchProps). */
export interface SwitchVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}
/**
 * Every compiled Switch variant from dist/registry: {css,tailwind}.
 */
export const switchVariants: ComponentVariant<SwitchVariantProps>[] = [
  { style: "css", render: SwitchCssJsx },
  { style: "tailwind", render: SwitchTailwindJsx },
];
