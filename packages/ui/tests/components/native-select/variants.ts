import { NativeSelect as NativeSelectCssDefault } from "../../../dist/registry/native-select/css/native-select";
import { NativeSelect as NativeSelectTailwindDefault } from "../../../dist/registry/native-select/tailwind/native-select";
import * as NativeSelectCssJsx from "../../../dist/registry/native-select/css/native-select";
import * as NativeSelectTailwindJsx from "../../../dist/registry/native-select/tailwind/native-select";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled NativeSelect variant (mirrors the emitted NativeSelectProps). */
export interface NativeSelectVariantProps extends HTMLAttributes<"select"> {
  class?: string;
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
}
/** The named NativeSelect parts (the other NativeSelect exports). */
export const NATIVE_SELECT_PARTS = ["Option", "OptGroup"] as const;
/**
 * Every compiled NativeSelect variant (the NativeSelect export) from dist/registry.
 * Options are authored by the caller as children.
 */
export const nativeSelectVariants: ChildrenVariant<NativeSelectVariantProps>[] = [
  { style: "css", render: NativeSelectCssDefault, child: (value) => [value] },
  { style: "tailwind", render: NativeSelectTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled NativeSelect part (NativeSelectOption, NativeSelectOptGroup) at both styles.
 */
export const nativeSelectPartVariants: PartVariant<CardPartProps>[] = NATIVE_SELECT_PARTS.flatMap(
  (part) =>
    partVariants(part, "NativeSelect", [
      [NativeSelectCssJsx as unknown as AnyModule, "css"],
      [NativeSelectTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);
