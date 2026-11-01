import { Pagination as PaginationCssDefault } from "../../../dist/registry/pagination/css/pagination";
import { Pagination as PaginationTailwindDefault } from "../../../dist/registry/pagination/tailwind/pagination";
import * as PaginationCssJsx from "../../../dist/registry/pagination/css/pagination";
import * as PaginationTailwindJsx from "../../../dist/registry/pagination/tailwind/pagination";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled Pagination variant (mirrors the emitted PaginationProps). */
export interface PaginationVariantProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled PaginationLink part (mirrors the emitted props). */
export interface PaginationLinkVariantProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
  isActive?: boolean;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}
/** Prop bag for the compiled PaginationPrevious/Next parts (mirrors the emitted props). */
export interface PaginationNavVariantProps extends HTMLAttributes<"a"> {
  class?: string;
  isActive?: boolean;
}
/** Prop bag for the compiled PaginationContent/PaginationItem parts (mirrors the emitted props). */
export interface PaginationContentVariantProps extends CardPartProps {}
/** Prop bag for the compiled PaginationEllipsis part (mirrors the emitted props). */
export interface PaginationEllipsisVariantProps extends HTMLAttributes<"span"> {
  class?: string;
}
/** Superset prop bag across Pagination parts. */
export type PaginationPartVariantProps = PaginationLinkVariantProps &
  PaginationNavVariantProps &
  PaginationContentVariantProps &
  PaginationEllipsisVariantProps;
/** The named Pagination parts (the other Pagination exports). */
export const PAGINATION_PARTS = [
  "Content",
  "Item",
  "Link",
  "Previous",
  "Next",
  "Ellipsis",
] as const;
/**
 * Every compiled Pagination variant (the Pagination export) from dist/registry.
 */
export const paginationVariants: ChildrenVariant<PaginationVariantProps>[] = [
  { style: "css", render: PaginationCssDefault, child: (value) => [value] },
  { style: "tailwind", render: PaginationTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Pagination part (PaginationContent…PaginationEllipsis) at both styles.
 */
export const paginationPartVariants: PartVariant<PaginationPartVariantProps>[] =
  PAGINATION_PARTS.flatMap((part) =>
    partVariants(part, "Pagination", [
      [PaginationCssJsx as unknown as AnyModule, "css"],
      [PaginationTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
