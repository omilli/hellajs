import * as FieldCssJsx from "../../../dist/registry/field/css/field";
import * as FieldTailwindJsx from "../../../dist/registry/field/tailwind/field";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, PartVariant } from "../../helpers/variants-core";

/** Prop bag for the compiled FieldSet/FieldGroup/FieldContent parts (mirrors the emitted props). */
export interface FieldPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled FieldLegend part (mirrors the emitted props). */
export interface FieldLegendVariantProps extends FieldPartProps {
  variant?: "legend" | "label";
}
/** Prop bag for the compiled Field root (mirrors the emitted FieldProps). */
export interface FieldVariantProps extends FieldPartProps {
  orientation?: "vertical" | "horizontal" | "responsive";
  invalid?: boolean;
}
/** Prop bag for the compiled FieldLabel part (mirrors the emitted props). */
export interface FieldLabelVariantProps extends FieldPartProps {}
/** Prop bag for the compiled FieldError part (mirrors the emitted props). */
export interface FieldErrorVariantProps extends FieldPartProps {
  errors?: Array<{ message?: string } | undefined>;
}
/** Superset prop bag across Field parts. */
export type FieldPartVariantProps = FieldLegendVariantProps &
  FieldVariantProps &
  FieldLabelVariantProps &
  FieldErrorVariantProps;
/** The named Field parts (every export; Field has no default export). */
export const FIELD_PARTS = [
  "Set",
  "Legend",
  "Group",
  "Content",
  "Label",
  "Title",
  "Description",
  "Separator",
  "Error",
] as const;
/** Field part lookup: Field roots are built through the "Field" prop prefix. */
export const FIELD_PROP_PREFIX = "Field";
/**
 * Every compiled Field part (FieldSet…FieldError) at both styles.
 */
export const fieldPartVariants: PartVariant<FieldPartVariantProps>[] = FIELD_PARTS.flatMap((part) =>
  partVariants(part, "Field", [
    [FieldCssJsx as unknown as AnyModule, "css"],
    [FieldTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
/**
 * Every compiled Field root (the named Field export — the module has no default) at both styles.
 */
export const fieldVariants: PartVariant<FieldVariantProps>[] = [
  {
    part: "Field",
    style: "css",
    render: (FieldCssJsx as unknown as AnyModule).Field as unknown as (
      props: FieldVariantProps,
    ) => JSX.Element,
  },
  {
    part: "Field",
    style: "tailwind",
    render: (FieldTailwindJsx as unknown as AnyModule).Field as unknown as (
      props: FieldVariantProps,
    ) => JSX.Element,
  },
];
