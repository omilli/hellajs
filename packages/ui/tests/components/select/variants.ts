import * as SelectCssJsx from "../../../dist/registry/select/css/select";
import * as SelectTailwindJsx from "../../../dist/registry/select/tailwind/select";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled Select variant (mirrors the emitted SelectEntry). */
export interface SelectEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}
/** Prop bag shared by every compiled Select variant (mirrors the emitted SelectProps). */
export interface SelectVariantProps extends HTMLAttributes<"button"> {
  items?: SelectEntryVariant[] | (() => SelectEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  clearable?: boolean;
  class?: string;
}
/**
 * Every compiled Select variant (the Select export) from dist/registry.
 * Select's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const selectVariants: ComponentVariant<SelectVariantProps>[] = [
  {
    style: "css",
    render: (SelectCssJsx as unknown as AnyModule).Select as unknown as (
      props: SelectVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (SelectTailwindJsx as unknown as AnyModule).Select as unknown as (
      props: SelectVariantProps,
    ) => JSX.Element,
  },
];
