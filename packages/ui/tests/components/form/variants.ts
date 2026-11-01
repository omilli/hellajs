import * as FormCssJsx from "../../../dist/registry/form/css/form";
import * as FormTailwindJsx from "../../../dist/registry/form/tailwind/form";
import type { GlobalHTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { UiStyle } from "@hellajs/ui";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, PartVariant } from "../../helpers/variants-core";

/** Superset prop bag across Form parts (mirrors the emitted part props). */
export interface FormPartVariantProps extends GlobalHTMLAttributes {
  error?: boolean | (() => boolean);
  invalid?: boolean | (() => boolean);
  describedBy?: string;
  errors?: string[] | (() => string[] | undefined);
  children?: HellaChildren;
  class?: string;
}
/** The named Form parts (every export beside the createForm controller). */
export const FORM_PARTS = ["Item", "Label", "Control", "Description", "Message"] as const;
/**
 * Every compiled Form part (FormItem…FormMessage) at both styles.
 */
export const formPartVariants: PartVariant<FormPartVariantProps>[] = FORM_PARTS.flatMap((part) =>
  partVariants(part, "Form", [
    [FormCssJsx as unknown as AnyModule, "css"],
    [FormTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
/** One compiled Form style's signals controller, so controller tests exercise both compiled modules. */
export interface FormApiVariant {
  style: UiStyle;
  createForm: typeof FormCssJsx.createForm;
}
/** Every compiled Form variant's createForm controller from dist/registry. */
export const formApiVariants: FormApiVariant[] = [
  { style: "css", createForm: FormCssJsx.createForm },
  { style: "tailwind", createForm: FormTailwindJsx.createForm },
];
