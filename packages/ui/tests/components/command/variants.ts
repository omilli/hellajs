import * as CommandCssJsx from "../../../dist/registry/command/css/command";
import * as CommandTailwindJsx from "../../../dist/registry/command/tailwind/command";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled Command variant (mirrors the emitted CommandItemData). */
export interface CommandItemDataVariant {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}
/** Prop bag shared by every compiled Command variant (mirrors the emitted CommandProps). */
export interface CommandVariantProps extends HTMLAttributes<"div"> {
  items?: CommandItemDataVariant[] | (() => CommandItemDataVariant[]);
  filter?: (items: CommandItemDataVariant[], query: string) => CommandItemDataVariant[];
  loop?: boolean;
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
  children?: HellaChildren;
}
/** Prop bag shared by every compiled Command dialog variant (mirrors the emitted CommandDialogProps). */
export interface CommandDialogVariantProps extends HTMLAttributes<"div"> {
  items?: CommandItemDataVariant[] | (() => CommandItemDataVariant[]);
  filter?: (items: CommandItemDataVariant[], query: string) => CommandItemDataVariant[];
  loop?: boolean;
  value?: () => string;
  onValueChange?: (value: string) => void;
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  class?: string;
  children?: HellaChildren;
}
/**
 * Every compiled Command variant (the Command export) from dist/registry.
 */
export const commandVariants: ComponentVariant<CommandVariantProps>[] = [
  {
    style: "css",
    render: (CommandCssJsx as unknown as AnyModule).Command as unknown as (
      props: CommandVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (CommandTailwindJsx as unknown as AnyModule).Command as unknown as (
      props: CommandVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Command dialog variant (the CommandDialog export) from dist/registry.
 */
export const commandDialogVariants: ComponentVariant<CommandDialogVariantProps>[] = [
  {
    style: "css",
    render: (CommandCssJsx as unknown as AnyModule).CommandDialog as unknown as (
      props: CommandDialogVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (CommandTailwindJsx as unknown as AnyModule).CommandDialog as unknown as (
      props: CommandDialogVariantProps,
    ) => JSX.Element,
  },
];
