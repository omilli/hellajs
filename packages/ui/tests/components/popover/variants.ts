import * as PopoverCssJsx from "../../../dist/registry/popover/css/popover";
import * as PopoverTailwindJsx from "../../../dist/registry/popover/tailwind/popover";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant, MenuModuleTable } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Popover variant (mirrors the emitted PopoverProps). */
export interface PopoverVariantProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
/** Module table backing the composed Popover vocabulary (Header/Title/Description): [style] resolves the compiled namespace, so the composed test renders the content-slot panel in the same style as the root. */
export const popoverModules: MenuModuleTable = {
  css: PopoverCssJsx as unknown as AnyModule,
  tailwind: PopoverTailwindJsx as unknown as AnyModule,
};
/**
 * Every compiled Popover variant (the Popover export) from dist/registry.
 * Popover's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const popoverVariants: ComponentVariant<PopoverVariantProps>[] = [
  {
    style: "css",
    render: (PopoverCssJsx as unknown as AnyModule).Popover as unknown as (
      props: PopoverVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (PopoverTailwindJsx as unknown as AnyModule).Popover as unknown as (
      props: PopoverVariantProps,
    ) => JSX.Element,
  },
];
