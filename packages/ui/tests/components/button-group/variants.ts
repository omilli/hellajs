import { ButtonGroup as ButtonGroupCssDefault } from "../../../dist/registry/button-group/css/button-group";
import { ButtonGroup as ButtonGroupTailwindDefault } from "../../../dist/registry/button-group/tailwind/button-group";
import * as ButtonGroupCssJsx from "../../../dist/registry/button-group/css/button-group";
import * as ButtonGroupTailwindJsx from "../../../dist/registry/button-group/tailwind/button-group";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled ButtonGroup variant (mirrors the emitted ButtonGroupProps). */
export interface ButtonGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}
/** Prop bag for the compiled ButtonGroupText part (mirrors the emitted props). */
export interface ButtonGroupTextVariantProps extends CardPartProps {}
/** Prop bag for the compiled ButtonGroupSeparator part (mirrors the emitted props). */
export interface ButtonGroupSeparatorVariantProps extends HTMLAttributes<"div"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}
/** Superset prop bag across ButtonGroup parts. */
export type ButtonGroupPartVariantProps = ButtonGroupTextVariantProps &
  ButtonGroupSeparatorVariantProps;
/** The named ButtonGroup parts (the other ButtonGroup exports). */
export const BUTTON_GROUP_PARTS = ["Text", "Separator"] as const;
/**
 * Every compiled ButtonGroup variant (the ButtonGroup export) from dist/registry.
 */
export const buttonGroupVariants: ChildrenVariant<ButtonGroupVariantProps>[] = [
  { style: "css", render: ButtonGroupCssDefault, child: (value) => [value] },
  { style: "tailwind", render: ButtonGroupTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled ButtonGroup part (ButtonGroupText, ButtonGroupSeparator) at both styles.
 */
export const buttonGroupPartVariants: PartVariant<ButtonGroupPartVariantProps>[] =
  BUTTON_GROUP_PARTS.flatMap((part) =>
    partVariants(part, "ButtonGroup", [
      [ButtonGroupCssJsx as unknown as AnyModule, "css"],
      [ButtonGroupTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
