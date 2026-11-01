import { Table as TableCssDefault } from "../../../dist/registry/table/css/table";
import { Table as TableTailwindDefault } from "../../../dist/registry/table/tailwind/table";
import * as TableCssJsx from "../../../dist/registry/table/css/table";
import * as TableTailwindJsx from "../../../dist/registry/table/tailwind/table";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag for compiled TableHead/TableCell parts (mirrors the emitted props). */
export interface TableCellVariantProps extends CardPartProps {}
/** The named Table parts (the other Table exports). */
export const TABLE_PARTS = ["Header", "Body", "Footer", "Row", "Head", "Cell", "Caption"] as const;
/**
 * Every compiled Table variant (the Table export) from dist/registry.
 */
export const tableVariants: ChildrenVariant<CardPartProps>[] = [
  { style: "css", render: TableCssDefault, child: (value) => [value] },
  { style: "tailwind", render: TableTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Table part (TableHeader…TableCaption) at both styles.
 */
export const tablePartVariants: PartVariant<TableCellVariantProps>[] = TABLE_PARTS.flatMap((part) =>
  partVariants(part, "Table", [
    [TableCssJsx as unknown as AnyModule, "css"],
    [TableTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
