import { Accordion as AccordionCssDefault } from "../../../dist/registry/accordion/css/accordion";
import { Accordion as AccordionTailwindDefault } from "../../../dist/registry/accordion/tailwind/accordion";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled Accordion variant (mirrors the emitted AccordionEntry). */
export interface AccordionEntryVariant {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}
/** Prop bag shared by every compiled Accordion variant (mirrors the emitted AccordionProps). */
export interface AccordionVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: AccordionEntryVariant[] | (() => AccordionEntryVariant[]);
  keyBy?: "value";
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
}
/**
 * Every compiled Accordion variant (the Accordion export) from dist/registry.
 * Accordion takes an items array, so the suites carry no `child` wrapper.
 */
export const accordionVariants: ComponentVariant<AccordionVariantProps>[] = [
  { style: "css", render: AccordionCssDefault },
  { style: "tailwind", render: AccordionTailwindDefault },
];
