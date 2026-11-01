import { Collapsible as CollapsibleCssDefault } from "../../../dist/registry/collapsible/css/collapsible";
import { Collapsible as CollapsibleTailwindDefault } from "../../../dist/registry/collapsible/tailwind/collapsible";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Collapsible variant (mirrors the emitted CollapsibleProps). */
export interface CollapsibleVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Controlled open state. When given, the root never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
}
/**
 * Every compiled Collapsible variant (the Collapsible export) from dist/registry.
 * Collapsible takes trigger/content props, so the suites carry no `child` wrapper.
 */
export const collapsibleVariants: ComponentVariant<CollapsibleVariantProps>[] = [
  { style: "css", render: CollapsibleCssDefault },
  { style: "tailwind", render: CollapsibleTailwindDefault },
];
