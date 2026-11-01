import { Sheet as SheetCssDefault } from "../../../dist/registry/sheet/css/sheet";
import { Sheet as SheetTailwindDefault } from "../../../dist/registry/sheet/tailwind/sheet";
import * as SheetCssJsx from "../../../dist/registry/sheet/css/sheet";
import * as SheetTailwindJsx from "../../../dist/registry/sheet/tailwind/sheet";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Sheet variant (mirrors the emitted SheetProps). */
export interface SheetVariantProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  side?: "top" | "right" | "bottom" | "left";
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}
/** Superset prop bag across Sheet parts (mirrors the emitted part props). */
export interface SheetPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  class?: string;
}
/** The named Sheet parts (the Header/Footer/Title/Description vocabulary). */
export const SHEET_PARTS = ["Header", "Footer", "Title", "Description"] as const;
/** One compiled Sheet flavor (the Sheet export). */
export type SheetVariant = ChildrenVariant<SheetVariantProps>;
/** The newest sheet panel portaled into document.body. */
function newestSheetPanel(): Element | null {
  const panels = document.querySelectorAll('[data-slot="sheet-content"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}
/**
 * Every compiled Sheet variant (the Sheet export) from dist/registry.
 */
export const sheetVariants: ChildrenVariant<SheetVariantProps>[] = [
  { style: "css", render: SheetCssDefault, child: (value) => [value], root: newestSheetPanel },
  {
    style: "tailwind",
    render: SheetTailwindDefault,
    child: (value) => [value],
    root: newestSheetPanel,
  },
];
/**
 * Every compiled Sheet part (SheetHeader…SheetDescription) at both styles.
 */
export const sheetPartVariants: PartVariant<SheetPartVariantProps>[] = SHEET_PARTS.flatMap((part) =>
  partVariants(part, "Sheet", [
    [SheetCssJsx as unknown as AnyModule, "css"],
    [SheetTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
