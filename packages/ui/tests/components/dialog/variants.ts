import { Dialog as DialogCssDefault } from "../../../dist/registry/dialog/css/dialog";
import { Dialog as DialogTailwindDefault } from "../../../dist/registry/dialog/tailwind/dialog";
import * as DialogCssJsx from "../../../dist/registry/dialog/css/dialog";
import * as DialogTailwindJsx from "../../../dist/registry/dialog/tailwind/dialog";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Dialog variant (mirrors the emitted DialogProps). */
export interface DialogVariantProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}
/** Superset prop bag across Dialog parts (mirrors the emitted part props). */
export interface DialogPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  class?: string;
}
/** One compiled Dialog flavor (the Dialog export). */
export type DialogVariant = ChildrenVariant<DialogVariantProps>;
/** The newest dialog panel portaled into document.body — portal renders accumulate one panel per mount. */
function newestDialogPanel(): Element | null {
  const panels = document.querySelectorAll('[role="dialog"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}
/** The named Dialog parts (the Header/Footer/Title/Description vocabulary). */
export const DIALOG_PARTS = ["Header", "Footer", "Title", "Description"] as const;
/**
 * Every compiled Dialog part at both styles.
 */
export const dialogPartVariants: PartVariant<DialogPartVariantProps>[] = DIALOG_PARTS.flatMap(
  (part) =>
    partVariants(part, "Dialog", [
      [DialogCssJsx as unknown as AnyModule, "css"],
      [DialogTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);
/**
 * Every compiled Dialog variant (the Dialog export) from dist/registry.
 * Dialog portals its panel into document.body, so `root` resolves the newest
 * panel there instead of the mount container's first element child.
 */
export const dialogVariants: DialogVariant[] = [
  { style: "css", render: DialogCssDefault, child: (value) => [value], root: newestDialogPanel },
  {
    style: "tailwind",
    render: DialogTailwindDefault,
    child: (value) => [value],
    root: newestDialogPanel,
  },
];
