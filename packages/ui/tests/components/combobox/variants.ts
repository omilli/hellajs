import * as ComboboxCssJsx from "../../../dist/registry/combobox/css/combobox";
import * as ComboboxTailwindJsx from "../../../dist/registry/combobox/tailwind/combobox";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled Combobox variant (mirrors the emitted ComboboxEntry). */
export interface ComboboxEntryVariant {
  value: string;
  label?: string;
  disabled?: boolean;
}
/** Prop bag shared by every compiled Combobox variant (mirrors the emitted ComboboxProps). */
export interface ComboboxVariantProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntryVariant[] | (() => ComboboxEntryVariant[]);
  keyBy?: "value";
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  filter?: (items: ComboboxEntryVariant[], query: string) => ComboboxEntryVariant[];
  showClear?: boolean;
  class?: string;
}
/**
 * Every compiled Combobox variant (the Combobox export) from dist/registry.
 * Combobox's content portals into document.body on open, so the suites
 * render the wrapper root and resolve content through the helpers/anchored pollers.
 */
export const comboboxVariants: ComponentVariant<ComboboxVariantProps>[] = [
  {
    style: "css",
    render: (ComboboxCssJsx as unknown as AnyModule).Combobox as unknown as (
      props: ComboboxVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (ComboboxTailwindJsx as unknown as AnyModule).Combobox as unknown as (
      props: ComboboxVariantProps,
    ) => JSX.Element,
  },
];
