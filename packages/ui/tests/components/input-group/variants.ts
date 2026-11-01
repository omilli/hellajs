import { InputGroup as InputGroupCssDefault } from "../../../dist/registry/input-group/css/input-group";
import { InputGroup as InputGroupTailwindDefault } from "../../../dist/registry/input-group/tailwind/input-group";
import * as InputGroupCssJsx from "../../../dist/registry/input-group/css/input-group";
import * as InputGroupTailwindJsx from "../../../dist/registry/input-group/tailwind/input-group";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled InputGroup variant (mirrors the emitted InputGroupProps). */
export interface InputGroupVariantProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  disabled?: boolean;
  class?: string;
}
/** Prop bag for the compiled InputGroupAddon part (mirrors the emitted props). */
export interface InputGroupAddonVariantProps {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
}
/** Prop bag for the compiled InputGroupButton part (mirrors the emitted props). */
export interface InputGroupButtonVariantProps {
  children?: HellaChildren;
  type?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
  onclick?: () => void;
}
/** Prop bag for the compiled InputGroupText part (mirrors the emitted props). */
export interface InputGroupTextVariantProps extends CardPartProps {}
/** Prop bag for the compiled InputGroupInput part (mirrors the emitted props). */
export interface InputGroupInputVariantProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}
/** Prop bag for the compiled InputGroupTextarea part (mirrors the emitted props). */
export interface InputGroupTextareaVariantProps {
  value?: string | (() => string);
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  rows?: number;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}
/** Superset prop bag across InputGroup parts. */
export type InputGroupPartVariantProps = InputGroupAddonVariantProps &
  InputGroupButtonVariantProps &
  InputGroupTextVariantProps &
  InputGroupInputVariantProps &
  InputGroupTextareaVariantProps;
/** The named InputGroup parts (the other InputGroup exports). */
export const INPUT_GROUP_PARTS = ["Addon", "Button", "Text", "Input", "Textarea"] as const;
/**
 * Every compiled InputGroup variant (the InputGroup export) from dist/registry.
 */
export const inputGroupVariants: ChildrenVariant<InputGroupVariantProps>[] = [
  { style: "css", render: InputGroupCssDefault, child: (value) => [value] },
  { style: "tailwind", render: InputGroupTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled InputGroup part (InputGroupAddon…InputGroupTextarea) at both styles.
 */
export const inputGroupPartVariants: PartVariant<InputGroupPartVariantProps>[] =
  INPUT_GROUP_PARTS.flatMap((part) =>
    partVariants(part, "InputGroup", [
      [InputGroupCssJsx as unknown as AnyModule, "css"],
      [InputGroupTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
