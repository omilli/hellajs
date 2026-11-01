import { Alert as AlertCssDefault } from "../../../dist/registry/alert/css/alert";
import { Alert as AlertTailwindDefault } from "../../../dist/registry/alert/tailwind/alert";
import * as AlertCssJsx from "../../../dist/registry/alert/css/alert";
import * as AlertTailwindJsx from "../../../dist/registry/alert/tailwind/alert";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled Alert variant (mirrors the emitted AlertProps). */
export interface AlertVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive";
}
/** The named Alert parts (the other Alert exports). */
export const ALERT_PARTS = ["Title", "Description"] as const;
/**
 * Every compiled Alert variant (the Alert export) from dist/registry.
 */
export const alertVariants: ChildrenVariant<AlertVariantProps>[] = [
  { style: "css", render: AlertCssDefault, child: (value) => [value] },
  { style: "tailwind", render: AlertTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Alert part (AlertTitle, AlertDescription) at both styles.
 */
export const alertPartVariants: PartVariant<CardPartProps>[] = ALERT_PARTS.flatMap((part) =>
  partVariants(part, "Alert", [
    [AlertCssJsx as unknown as AnyModule, "css"],
    [AlertTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
