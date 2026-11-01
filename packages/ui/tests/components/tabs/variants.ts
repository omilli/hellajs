import { Tabs as TabsCssDefault } from "../../../dist/registry/tabs/css/tabs";
import { Tabs as TabsTailwindDefault } from "../../../dist/registry/tabs/tailwind/tabs";
import type { HTMLAttributes, HellaChild } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled Tabs variant (mirrors the emitted TabsItem). */
export interface TabsItem {
  id: string;
  label: string;
  content: HellaChild | (() => HellaChild);
}
/** Prop bag shared by every compiled Tabs variant (mirrors the emitted TabsProps). */
export interface TabsVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: TabsItem[] | (() => TabsItem[]);
  initialId?: string;
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
}
/** One compiled Tabs flavor (the Tabs export). */
export type TabsVariant = ComponentVariant<TabsVariantProps>;
/**
 * Every compiled Tabs variant (the Tabs export) from dist/registry.
 * Tabs renders no children prop, so the suites carry no `child` wrapper.
 */
export const tabsVariants: TabsVariant[] = [
  { style: "css", render: TabsCssDefault },
  { style: "tailwind", render: TabsTailwindDefault },
];
