import { AlertDialog as AlertDialogCssDefault } from "../../../dist/registry/alert-dialog/css/alert-dialog";
import { AlertDialog as AlertDialogTailwindDefault } from "../../../dist/registry/alert-dialog/tailwind/alert-dialog";
import * as AlertDialogCssJsx from "../../../dist/registry/alert-dialog/css/alert-dialog";
import * as AlertDialogTailwindJsx from "../../../dist/registry/alert-dialog/tailwind/alert-dialog";
import type { HTMLAttributes, HellaChild } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AlertDialogPartVariantProps,
  AnyModule,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled AlertDialog variant (mirrors the emitted AlertDialogProps). */
export interface AlertDialogVariantProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "default" | "sm";
  closeOnEscape?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}
/** The named AlertDialog parts (the Header/Footer/Title/Description/Media/Action/Cancel vocabulary). */
export const ALERT_DIALOG_PARTS = [
  "Header",
  "Footer",
  "Title",
  "Description",
  "Media",
  "Action",
  "Cancel",
] as const;
/** One compiled AlertDialog flavor (the AlertDialog export). */
export type AlertDialogVariant = ChildrenVariant<AlertDialogVariantProps>;
/** The newest alert dialog panel portaled into document.body (role=alertdialog sorts after dialogs). */
function newestAlertDialogPanel(): Element | null {
  const panels = document.querySelectorAll('[role="alertdialog"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}
/**
 * Every compiled AlertDialog variant (the AlertDialog export) from dist/registry.
 * AlertDialog portals its panel into document.body, so `root` resolves the
 * newest alertdialog there instead of the mount container's first element child.
 */
export const alertDialogVariants: ChildrenVariant<AlertDialogVariantProps>[] = [
  {
    style: "css",
    render: AlertDialogCssDefault,
    child: (value) => [value],
    root: newestAlertDialogPanel,
  },
  {
    style: "tailwind",
    render: AlertDialogTailwindDefault,
    child: (value) => [value],
    root: newestAlertDialogPanel,
  },
];
/**
 * Every compiled AlertDialog part (AlertDialogHeader…AlertDialogCancel) at both styles.
 */
export const alertDialogPartVariants: PartVariant<AlertDialogPartVariantProps>[] =
  ALERT_DIALOG_PARTS.flatMap((part) =>
    partVariants(part, "AlertDialog", [
      [AlertDialogCssJsx as unknown as AnyModule, "css"],
      [AlertDialogTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
