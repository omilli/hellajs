import * as SidebarCssJsx from "../../../dist/registry/sidebar/css/sidebar";
import * as SidebarTailwindJsx from "../../../dist/registry/sidebar/tailwind/sidebar";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { UiStyle } from "@hellajs/ui";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ComponentVariant, PartVariant } from "../../helpers/variants-core";

/** State the compiled SidebarProvider threads to its children function (mirrors the emitted SidebarState). */
export interface SidebarThreadedState {
  open: () => boolean;
  setOpen: (open: boolean) => void;
  mobile: () => boolean;
  openMobile: () => boolean;
  setOpenMobile: (open: boolean) => void;
  onToggle: () => void;
}
/** Prop bag for the compiled SidebarProvider (mirrors the emitted SidebarProviderProps). */
export interface SidebarProviderVariantProps {
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (state: SidebarThreadedState) => HellaChildren;
  class?: string;
}
/** Prop bag for the compiled Sidebar root part (mirrors the emitted SidebarProps). */
export interface SidebarVariantProps extends HTMLAttributes<"div"> {
  open?: () => boolean;
  mobile?: () => boolean;
  openMobile?: () => boolean;
  onOpenMobileChange?: (open: boolean) => void;
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled SidebarMenuButton part (mirrors the emitted props). */
export interface SidebarMenuButtonVariantProps extends HTMLAttributes<"button"> {
  active?: boolean;
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  open?: () => boolean;
  mobile?: () => boolean;
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}
/** Superset prop bag across Sidebar parts (variant unions conflict between the Sidebar root and its button parts, so both are omitted). */
export type SidebarPartVariantProps = Omit<SidebarVariantProps, "variant"> &
  Omit<SidebarMenuButtonVariantProps, "variant"> & {
    showOnHover?: boolean;
    showIcon?: boolean;
    value?: string | (() => string);
    placeholder?: string;
    id?: string;
    ariaLabel?: string;
    ariaInvalid?: boolean;
    oninput?: (v: string) => void;
    href?: string;
    onclick?: () => void;
    onToggle?: () => void;
  };
/** The named Sidebar parts beside the Sidebar root (every export; Sidebar has no default export). */
export const SIDEBAR_PARTS = [
  "Provider",
  "Trigger",
  "Rail",
  "Inset",
  "Input",
  "Header",
  "Footer",
  "Separator",
  "Content",
  "Group",
  "GroupLabel",
  "GroupAction",
  "GroupContent",
  "Menu",
  "MenuItem",
  "MenuButton",
  "MenuAction",
  "MenuBadge",
  "MenuSkeleton",
  "MenuSub",
  "MenuSubItem",
  "MenuSubButton",
] as const;
/**
 * Every compiled Sidebar root flavor from dist/registry.
 */
export const sidebarVariants: ComponentVariant<SidebarVariantProps>[] = [
  { style: "css", render: SidebarCssJsx.Sidebar, root: newestSidebarRoot },
  { style: "tailwind", render: SidebarTailwindJsx.Sidebar, root: newestSidebarRoot },
];
/**
 * Every compiled Sidebar part (SidebarProvider…SidebarMenuSubButton) at both styles.
 */
export const sidebarPartVariants: PartVariant<SidebarPartVariantProps>[] = SIDEBAR_PARTS.flatMap(
  (part) =>
    partVariants(part, "Sidebar", [
      [SidebarCssJsx as unknown as AnyModule, "css"],
      [SidebarTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);
/** The newest desktop sidebar root - sequential renders append fresh containers, so the last match is newest. */
function newestSidebarRoot(): Element | null {
  const roots = document.querySelectorAll('[data-slot="sidebar"]:not([data-mobile="true"])');
  return roots.length === 0 ? null : roots[roots.length - 1]!;
}
/** One compiled Sidebar module namespace - composition tests build same-style trees from these parts. */
export interface SidebarModuleVariant {
  style: UiStyle;
  mod: AnyModule;
}
/** Every compiled Sidebar module namespace from dist/registry. */
export const sidebarModuleVariants: SidebarModuleVariant[] = [
  { style: "css", mod: SidebarCssJsx as unknown as AnyModule },
  { style: "tailwind", mod: SidebarTailwindJsx as unknown as AnyModule },
];
/** Resolves one same-style Sidebar part render fn with its prop bag typed. */
export function sidebarModulePart<P extends object>(
  variant: SidebarModuleVariant,
  name: string,
): (props: P) => JSX.Element {
  return variant.mod[name] as unknown as (props: P) => JSX.Element;
}
