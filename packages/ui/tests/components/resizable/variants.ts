import { ResizablePanelGroup as ResizableCssDefault } from "../../../dist/registry/resizable/css/resizable";
import { ResizablePanelGroup as ResizableTailwindDefault } from "../../../dist/registry/resizable/tailwind/resizable";
import * as ResizableCssJsx from "../../../dist/registry/resizable/css/resizable";
import * as ResizableTailwindJsx from "../../../dist/registry/resizable/tailwind/resizable";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled ResizablePanelGroup variant (mirrors the emitted ResizablePanelGroupProps). */
export interface ResizableVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  direction?: "horizontal" | "vertical";
  onLayout?: (sizes: number[]) => void;
}
/**
 * Every compiled ResizablePanelGroup variant (the ResizablePanelGroup export) from dist/registry.
 * The group takes composed children, so the suites carry a child wrapper rendering a panel/handle/panel stack.
 */
export const resizableVariants: ChildrenVariant<ResizableVariantProps>[] = [
  {
    style: "css",
    render: ResizableCssDefault,
    child: (value) => [
      ResizableCssJsx.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableCssJsx.ResizableHandle({}),
      ResizableCssJsx.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
  {
    style: "tailwind",
    render: ResizableTailwindDefault,
    child: (value) => [
      ResizableTailwindJsx.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableTailwindJsx.ResizableHandle({}),
      ResizableTailwindJsx.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
];
/** Superset prop bag across Resizable parts (mirrors the emitted part props). */
export interface ResizablePartVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  withHandle?: boolean;
}
/** The named Resizable parts (the other ResizablePanelGroup exports). */
export const RESIZABLE_PARTS = ["Panel", "Handle"] as const;
/**
 * Every compiled Resizable part (ResizablePanel, ResizableHandle) at both styles.
 */
export const resizablePartVariants: PartVariant<ResizablePartVariantProps>[] =
  RESIZABLE_PARTS.flatMap((part) =>
    partVariants(part, "Resizable", [
      [ResizableCssJsx as unknown as AnyModule, "css"],
      [ResizableTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
