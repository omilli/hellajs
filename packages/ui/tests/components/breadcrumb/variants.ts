import * as BreadcrumbCssJsx from "../../../dist/registry/breadcrumb/css/breadcrumb";
import * as BreadcrumbTailwindJsx from "../../../dist/registry/breadcrumb/tailwind/breadcrumb";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ComponentVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Breadcrumb variant (mirrors the emitted BreadcrumbProps). */
export interface BreadcrumbVariantProps extends HTMLAttributes<"nav"> {
  children?: HellaChildren;
  class?: string;
}
/** Superset prop bag across Breadcrumb parts (mirrors the emitted part props). */
export interface BreadcrumbPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  href?: string;
  class?: string;
}
/** The named Breadcrumb parts (the other Breadcrumb exports). */
export const BREADCRUMB_PARTS = ["List", "Item", "Link", "Page", "Separator", "Ellipsis"] as const;
/**
 * Every compiled Breadcrumb variant (the Breadcrumb export) from dist/registry.
 */
export const breadcrumbVariants: ComponentVariant<BreadcrumbVariantProps>[] = [
  {
    style: "css",
    render: (BreadcrumbCssJsx as unknown as AnyModule).Breadcrumb as unknown as (
      props: BreadcrumbVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (BreadcrumbTailwindJsx as unknown as AnyModule).Breadcrumb as unknown as (
      props: BreadcrumbVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Breadcrumb part (BreadcrumbList…BreadcrumbEllipsis) at both styles.
 */
export const breadcrumbPartVariants: PartVariant<BreadcrumbPartVariantProps>[] =
  BREADCRUMB_PARTS.flatMap((part) =>
    partVariants(part, "Breadcrumb", [
      [BreadcrumbCssJsx as unknown as AnyModule, "css"],
      [BreadcrumbTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
