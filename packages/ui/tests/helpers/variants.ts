import { expect } from "bun:test";
import type { Signal } from "@hellajs/core";
import { delay, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and a component's Portal must share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import ButtonCssJsx from "../../dist/registry/button/css/button";
import ButtonCssHtml from "../../dist/registry/button/css/button-html";
import ButtonTailwindJsx from "../../dist/registry/button/tailwind/button";
import ButtonTailwindHtml from "../../dist/registry/button/tailwind/button-html";
import InputCssJsx from "../../dist/registry/input/css/input";
import InputCssHtml from "../../dist/registry/input/css/input-html";
import InputTailwindJsx from "../../dist/registry/input/tailwind/input";
import InputTailwindHtml from "../../dist/registry/input/tailwind/input-html";
import CardCssDefault from "../../dist/registry/card/css/card";
import CardCssHtmlDefault from "../../dist/registry/card/css/card-html";
import CardTailwindDefault from "../../dist/registry/card/tailwind/card";
import CardTailwindHtmlDefault from "../../dist/registry/card/tailwind/card-html";
import * as CardCssJsx from "../../dist/registry/card/css/card";
import * as CardCssHtml from "../../dist/registry/card/css/card-html";
import * as CardTailwindJsx from "../../dist/registry/card/tailwind/card";
import * as CardTailwindHtml from "../../dist/registry/card/tailwind/card-html";
import DialogCssDefault from "../../dist/registry/dialog/css/dialog";
import DialogCssHtmlDefault from "../../dist/registry/dialog/css/dialog-html";
import DialogTailwindDefault from "../../dist/registry/dialog/tailwind/dialog";
import DialogTailwindHtmlDefault from "../../dist/registry/dialog/tailwind/dialog-html";
import * as DialogCssJsx from "../../dist/registry/dialog/css/dialog";
import * as DialogCssHtml from "../../dist/registry/dialog/css/dialog-html";
import * as DialogTailwindJsx from "../../dist/registry/dialog/tailwind/dialog";
import * as DialogTailwindHtml from "../../dist/registry/dialog/tailwind/dialog-html";
import TabsCssDefault from "../../dist/registry/tabs/css/tabs";
import TabsCssHtmlDefault from "../../dist/registry/tabs/css/tabs-html";
import TabsTailwindDefault from "../../dist/registry/tabs/tailwind/tabs";
import TabsTailwindHtmlDefault from "../../dist/registry/tabs/tailwind/tabs-html";
import * as TabsCssJsx from "../../dist/registry/tabs/css/tabs";
import * as TabsCssHtml from "../../dist/registry/tabs/css/tabs-html";
import * as TabsTailwindJsx from "../../dist/registry/tabs/tailwind/tabs";
import * as TabsTailwindHtml from "../../dist/registry/tabs/tailwind/tabs-html";
import BadgeCssJsx from "../../dist/registry/badge/css/badge";
import BadgeCssHtml from "../../dist/registry/badge/css/badge-html";
import BadgeTailwindJsx from "../../dist/registry/badge/tailwind/badge";
import BadgeTailwindHtml from "../../dist/registry/badge/tailwind/badge-html";
import AlertCssDefault from "../../dist/registry/alert/css/alert";
import AlertCssHtmlDefault from "../../dist/registry/alert/css/alert-html";
import AlertTailwindDefault from "../../dist/registry/alert/tailwind/alert";
import AlertTailwindHtmlDefault from "../../dist/registry/alert/tailwind/alert-html";
import * as AlertCssJsx from "../../dist/registry/alert/css/alert";
import * as AlertCssHtml from "../../dist/registry/alert/css/alert-html";
import * as AlertTailwindJsx from "../../dist/registry/alert/tailwind/alert";
import * as AlertTailwindHtml from "../../dist/registry/alert/tailwind/alert-html";
import KbdCssDefault from "../../dist/registry/kbd/css/kbd";
import KbdCssHtmlDefault from "../../dist/registry/kbd/css/kbd-html";
import KbdTailwindDefault from "../../dist/registry/kbd/tailwind/kbd";
import KbdTailwindHtmlDefault from "../../dist/registry/kbd/tailwind/kbd-html";
import * as KbdCssJsx from "../../dist/registry/kbd/css/kbd";
import * as KbdCssHtml from "../../dist/registry/kbd/css/kbd-html";
import * as KbdTailwindJsx from "../../dist/registry/kbd/tailwind/kbd";
import * as KbdTailwindHtml from "../../dist/registry/kbd/tailwind/kbd-html";
import SeparatorCssJsx from "../../dist/registry/separator/css/separator";
import SeparatorCssHtml from "../../dist/registry/separator/css/separator-html";
import SeparatorTailwindJsx from "../../dist/registry/separator/tailwind/separator";
import SeparatorTailwindHtml from "../../dist/registry/separator/tailwind/separator-html";
import SkeletonCssJsx from "../../dist/registry/skeleton/css/skeleton";
import SkeletonCssHtml from "../../dist/registry/skeleton/css/skeleton-html";
import SkeletonTailwindJsx from "../../dist/registry/skeleton/tailwind/skeleton";
import SkeletonTailwindHtml from "../../dist/registry/skeleton/tailwind/skeleton-html";
import SpinnerCssJsx from "../../dist/registry/spinner/css/spinner";
import SpinnerCssHtml from "../../dist/registry/spinner/css/spinner-html";
import SpinnerTailwindJsx from "../../dist/registry/spinner/tailwind/spinner";
import SpinnerTailwindHtml from "../../dist/registry/spinner/tailwind/spinner-html";
import EmptyCssDefault from "../../dist/registry/empty/css/empty";
import EmptyCssHtmlDefault from "../../dist/registry/empty/css/empty-html";
import EmptyTailwindDefault from "../../dist/registry/empty/tailwind/empty";
import EmptyTailwindHtmlDefault from "../../dist/registry/empty/tailwind/empty-html";
import * as EmptyCssJsx from "../../dist/registry/empty/css/empty";
import * as EmptyCssHtml from "../../dist/registry/empty/css/empty-html";
import * as EmptyTailwindJsx from "../../dist/registry/empty/tailwind/empty";
import * as EmptyTailwindHtml from "../../dist/registry/empty/tailwind/empty-html";
import LabelCssJsx from "../../dist/registry/label/css/label";
import LabelCssHtml from "../../dist/registry/label/css/label-html";
import LabelTailwindJsx from "../../dist/registry/label/tailwind/label";
import LabelTailwindHtml from "../../dist/registry/label/tailwind/label-html";
import TextareaCssJsx from "../../dist/registry/textarea/css/textarea";
import TextareaCssHtml from "../../dist/registry/textarea/css/textarea-html";
import TextareaTailwindJsx from "../../dist/registry/textarea/tailwind/textarea";
import TextareaTailwindHtml from "../../dist/registry/textarea/tailwind/textarea-html";
import NativeSelectCssDefault from "../../dist/registry/native-select/css/native-select";
import NativeSelectCssHtmlDefault from "../../dist/registry/native-select/css/native-select-html";
import NativeSelectTailwindDefault from "../../dist/registry/native-select/tailwind/native-select";
import NativeSelectTailwindHtmlDefault from "../../dist/registry/native-select/tailwind/native-select-html";
import * as NativeSelectCssJsx from "../../dist/registry/native-select/css/native-select";
import * as NativeSelectCssHtml from "../../dist/registry/native-select/css/native-select-html";
import * as NativeSelectTailwindJsx from "../../dist/registry/native-select/tailwind/native-select";
import * as NativeSelectTailwindHtml from "../../dist/registry/native-select/tailwind/native-select-html";
import AspectRatioCssJsx from "../../dist/registry/aspect-ratio/css/aspect-ratio";
import AspectRatioCssHtml from "../../dist/registry/aspect-ratio/css/aspect-ratio-html";
import AspectRatioTailwindJsx from "../../dist/registry/aspect-ratio/tailwind/aspect-ratio";
import AspectRatioTailwindHtml from "../../dist/registry/aspect-ratio/tailwind/aspect-ratio-html";
import AvatarCssDefault from "../../dist/registry/avatar/css/avatar";
import AvatarCssHtmlDefault from "../../dist/registry/avatar/css/avatar-html";
import AvatarTailwindDefault from "../../dist/registry/avatar/tailwind/avatar";
import AvatarTailwindHtmlDefault from "../../dist/registry/avatar/tailwind/avatar-html";
import * as AvatarCssJsx from "../../dist/registry/avatar/css/avatar";
import * as AvatarCssHtml from "../../dist/registry/avatar/css/avatar-html";
import * as AvatarTailwindJsx from "../../dist/registry/avatar/tailwind/avatar";
import * as AvatarTailwindHtml from "../../dist/registry/avatar/tailwind/avatar-html";
import ProgressCssJsx from "../../dist/registry/progress/css/progress";
import ProgressCssHtml from "../../dist/registry/progress/css/progress-html";
import ProgressTailwindJsx from "../../dist/registry/progress/tailwind/progress";
import ProgressTailwindHtml from "../../dist/registry/progress/tailwind/progress-html";
import TableCssDefault from "../../dist/registry/table/css/table";
import TableCssHtmlDefault from "../../dist/registry/table/css/table-html";
import TableTailwindDefault from "../../dist/registry/table/tailwind/table";
import TableTailwindHtmlDefault from "../../dist/registry/table/tailwind/table-html";
import * as TableCssJsx from "../../dist/registry/table/css/table";
import * as TableCssHtml from "../../dist/registry/table/css/table-html";
import * as TableTailwindJsx from "../../dist/registry/table/tailwind/table";
import * as TableTailwindHtml from "../../dist/registry/table/tailwind/table-html";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import type { UiFormat, UiStyle } from "@hellajs/ui";

/** Prop bag shared by every compiled Button variant (mirrors the emitted ButtonProps). */
export interface ButtonVariantProps {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  ariaInvalid?: boolean;
  class?: string;
  onclick?: () => void;
}

/** Prop bag shared by every compiled Input variant (mirrors the emitted InputProps). */
export interface InputVariantProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

/** Prop bag shared by every compiled Card part (mirrors the emitted CardPartProps). */
export interface CardPartProps {
  children?: HellaChildren;
  class?: string;
}

/** Item shape of every compiled Tabs variant (mirrors the emitted TabsItem). */
export interface TabsItem {
  id: string;
  label: string;
  content: HellaChild | (() => HellaChild);
}

/** Prop bag shared by every compiled Tabs variant (mirrors the emitted TabsProps). */
export interface TabsVariantProps {
  items: TabsItem[];
  initialId?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
  class?: string;
}

/** Prop bag shared by every compiled Dialog variant (mirrors the emitted DialogProps). */
export interface DialogVariantProps {
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

/** One compiled component flavor — style × format. */
export interface ComponentVariant<P extends object> {
  style: UiStyle;
  format: UiFormat;
  render: (props: P) => HellaNode;
  /** Resolves the compared root for portal variants; defaults to the mount container's first element child. */
  root?: () => Element | null;
}

/** ComponentVariant for a component that renders children. */
export interface ChildrenVariant<P extends object> extends ComponentVariant<P> {
  child: (value: HellaChild) => HellaChildren;
}

/** Prop bag shared by every compiled Badge variant (mirrors the emitted BadgeProps). */
export interface BadgeVariantProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  ariaInvalid?: boolean;
  class?: string;
}

/** Prop bag shared by every compiled Alert variant (mirrors the emitted AlertProps). */
export interface AlertVariantProps {
  children?: HellaChildren;
  variant?: "default" | "destructive";
  class?: string;
}

/** Prop bag shared by every compiled Kbd variant (mirrors the emitted KbdProps). */
export interface KbdVariantProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag shared by every compiled Separator variant (mirrors the emitted SeparatorProps). */
export interface SeparatorVariantProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

/** Prop bag shared by every compiled Skeleton variant (mirrors the emitted SkeletonProps). */
export interface SkeletonVariantProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag shared by every compiled Spinner variant (mirrors the emitted SpinnerProps). */
export interface SpinnerVariantProps {
  class?: string;
}

/** Prop bag shared by every compiled Empty part (mirrors the emitted EmptyPartProps). */
export interface EmptyPartProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag for the compiled EmptyMedia part (mirrors the emitted EmptyMediaProps). */
export interface EmptyMediaVariantProps extends EmptyPartProps {
  variant?: "default" | "icon";
}

/** Prop bag shared by every compiled Label variant (mirrors the emitted LabelProps). */
export interface LabelVariantProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

/** Prop bag shared by every compiled Textarea variant (mirrors the emitted TextareaProps). */
export interface TextareaVariantProps {
  value?: string | (() => string);
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  rows?: number;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

/** Prop bag shared by every compiled NativeSelect variant (mirrors the emitted NativeSelectProps). */
export interface NativeSelectVariantProps {
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  onchange?: (v: string) => void;
}

/** Prop bag shared by every compiled AspectRatio variant (mirrors the emitted AspectRatioProps). */
export interface AspectRatioVariantProps {
  ratio?: number;
  children?: HellaChildren;
  class?: string;
}

/** Prop bag shared by every compiled Avatar part (mirrors the emitted AvatarBadgeProps). */
export interface AvatarPartProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag for the compiled Avatar root (mirrors the emitted AvatarProps). */
export interface AvatarVariantProps extends AvatarPartProps {
  size?: "default" | "sm" | "lg";
}

/** Prop bag for the compiled AvatarImage part (mirrors the emitted AvatarImageProps). */
export interface AvatarImageVariantProps extends AvatarPartProps {
  src?: string;
  alt?: string;
  loaded?: (value?: boolean) => boolean;
}

/** Prop bag for the compiled AvatarFallback part (mirrors the emitted AvatarFallbackProps). */
export interface AvatarFallbackVariantProps extends AvatarPartProps {
  loaded?: () => boolean;
}

/** Prop bag shared by every compiled Progress variant (mirrors the emitted ProgressProps). */
export interface ProgressVariantProps {
  value?: number | null | (() => number | null);
  class?: string;
}

/** Prop bag for compiled TableHead/TableCell parts (mirrors the emitted props). */
export interface TableCellVariantProps extends CardPartProps {
  colSpan?: number;
}

/** One compiled Button flavor. */
export type ButtonVariant = ChildrenVariant<ButtonVariantProps>;

/** One compiled Input flavor. */
export type InputVariant = ComponentVariant<InputVariantProps>;

/** One compiled Card flavor (the default Card export). */
export type CardVariant = ChildrenVariant<CardPartProps>;

/** One compiled Dialog flavor (the default Dialog export). */
export type DialogVariant = ChildrenVariant<DialogVariantProps>;

/** One compiled Tabs flavor (the default Tabs export). */
export type TabsVariant = ComponentVariant<TabsVariantProps>;

/** One named part of a multi-part component, at one flavor. */
export interface PartVariant<P extends object> extends ComponentVariant<P> {
  part: string;
}

/** The newest dialog panel portaled into document.body — portal renders accumulate one panel per mount. */
function newestDialogPanel(): Element | null {
  const panels = document.querySelectorAll('[role="dialog"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}

/**
 * Every compiled Button variant from dist/registry: {css,tailwind} × {jsx,html}.
 */
export const buttonVariants: ButtonVariant[] = [
  { style: "css", format: "jsx", render: ButtonCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: ButtonCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: ButtonTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: ButtonTailwindHtml, child: (value) => value },
];

/**
 * Every compiled Input variant from dist/registry: {css,tailwind} × {jsx,html}.
 * Input renders no children, so the suites carry no `child` wrapper.
 */
export const inputVariants: InputVariant[] = [
  { style: "css", format: "jsx", render: InputCssJsx },
  { style: "css", format: "html", render: InputCssHtml },
  { style: "tailwind", format: "jsx", render: InputTailwindJsx },
  { style: "tailwind", format: "html", render: InputTailwindHtml },
];

/**
 * Every compiled Card variant (the default export) from dist/registry.
 */
export const cardVariants: CardVariant[] = [
  { style: "css", format: "jsx", render: CardCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: CardCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: CardTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: CardTailwindHtmlDefault, child: (value) => value },
];

/** The named Card parts (every export except the default Card). */
export const CARD_PARTS = ["Header", "Title", "Description", "Action", "Content", "Footer"] as const;

/** The named Dialog parts (every export except the default Dialog). */
export const DIALOG_PARTS = ["Overlay", "Content", "Header", "Footer", "Title", "Description", "Close"] as const;

/** The named Tabs parts (every export except the default Tabs). */
export const TABS_PARTS = ["List", "Trigger", "Content"] as const;

export type AnyModule = Record<string, (props: never) => HellaNode>;

/** Builds one PartVariant per flavor for a named component part. */
function partVariants<P extends object>(
  part: string,
  prop: string,
  modules: [mod: AnyModule, style: UiStyle, format: UiFormat][],
): PartVariant<P>[] {
  return modules.map(([mod, style, format]) => ({
    part,
    style,
    format,
    render: mod[`${prop}${part}`] as unknown as (props: P) => HellaNode,
  }));
}

/**
 * Every compiled Card part (CardHeader…CardFooter) at every flavor.
 */
export const cardPartVariants: PartVariant<CardPartProps & { children?: HellaChildren }>[] = CARD_PARTS.flatMap((part) =>
  partVariants(part, "Card", [
    [CardCssJsx as unknown as AnyModule, "css", "jsx"],
    [CardCssHtml as unknown as AnyModule, "css", "html"],
    [CardTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [CardTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Dialog part at every flavor.
 */
export const dialogPartVariants: PartVariant<Record<string, never> & { children?: HellaChildren }>[] = DIALOG_PARTS.flatMap((part) =>
  partVariants(part, "Dialog", [
    [DialogCssJsx as unknown as AnyModule, "css", "jsx"],
    [DialogCssHtml as unknown as AnyModule, "css", "html"],
    [DialogTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [DialogTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Tabs part at every flavor.
 */
export const tabsPartVariants: PartVariant<Record<string, never> & { children?: HellaChildren }>[] = TABS_PARTS.flatMap((part) =>
  partVariants(part, "Tabs", [
    [TabsCssJsx as unknown as AnyModule, "css", "jsx"],
    [TabsCssHtml as unknown as AnyModule, "css", "html"],
    [TabsTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [TabsTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Dialog variant (the default export) from dist/registry.
 * Dialog portals its panel into document.body, so `root` resolves the newest
 * panel there instead of the mount container's first element child.
 */
export const dialogVariants: DialogVariant[] = [
  { style: "css", format: "jsx", render: DialogCssDefault, child: (value) => [value], root: newestDialogPanel },
  { style: "css", format: "html", render: DialogCssHtmlDefault, child: (value) => value, root: newestDialogPanel },
  { style: "tailwind", format: "jsx", render: DialogTailwindDefault, child: (value) => [value], root: newestDialogPanel },
  { style: "tailwind", format: "html", render: DialogTailwindHtmlDefault, child: (value) => value, root: newestDialogPanel },
];

/**
 * Every compiled Tabs variant (the default export) from dist/registry.
 * Tabs renders no children prop, so the suites carry no `child` wrapper.
 */
export const tabsVariants: TabsVariant[] = [
  { style: "css", format: "jsx", render: TabsCssDefault },
  { style: "css", format: "html", render: TabsCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: TabsTailwindDefault },
  { style: "tailwind", format: "html", render: TabsTailwindHtmlDefault },
];

/**
 * Every compiled Badge variant (the default export) from dist/registry.
 */
export const badgeVariants: ChildrenVariant<BadgeVariantProps>[] = [
  { style: "css", format: "jsx", render: BadgeCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: BadgeCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: BadgeTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: BadgeTailwindHtml, child: (value) => value },
];

/** The named Alert parts (every export except the default Alert). */
export const ALERT_PARTS = ["Title", "Description"] as const;

/**
 * Every compiled Alert variant (the default export) from dist/registry.
 */
export const alertVariants: ChildrenVariant<AlertVariantProps>[] = [
  { style: "css", format: "jsx", render: AlertCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: AlertCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: AlertTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: AlertTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Alert part (AlertTitle, AlertDescription) at every flavor.
 */
export const alertPartVariants: PartVariant<CardPartProps>[] = ALERT_PARTS.flatMap((part) =>
  partVariants(part, "Alert", [
    [AlertCssJsx as unknown as AnyModule, "css", "jsx"],
    [AlertCssHtml as unknown as AnyModule, "css", "html"],
    [AlertTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [AlertTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** The named Kbd parts (every export except the default Kbd). */
export const KBD_PARTS = ["Group"] as const;

/**
 * Every compiled Kbd variant (the default export) from dist/registry.
 */
export const kbdVariants: ChildrenVariant<KbdVariantProps>[] = [
  { style: "css", format: "jsx", render: KbdCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: KbdCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: KbdTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: KbdTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Kbd part (KbdGroup) at every flavor.
 */
export const kbdPartVariants: PartVariant<CardPartProps>[] = KBD_PARTS.flatMap((part) =>
  partVariants(part, "Kbd", [
    [KbdCssJsx as unknown as AnyModule, "css", "jsx"],
    [KbdCssHtml as unknown as AnyModule, "css", "html"],
    [KbdTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [KbdTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Separator variant from dist/registry. Separator carries an
 * optional children passthrough, so the suites wrap children like Badge.
 */
export const separatorVariants: ChildrenVariant<SeparatorVariantProps>[] = [
  { style: "css", format: "jsx", render: SeparatorCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: SeparatorCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: SeparatorTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: SeparatorTailwindHtml, child: (value) => value },
];

/**
 * Every compiled Skeleton variant from dist/registry.
 */
export const skeletonVariants: ChildrenVariant<SkeletonVariantProps>[] = [
  { style: "css", format: "jsx", render: SkeletonCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: SkeletonCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: SkeletonTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: SkeletonTailwindHtml, child: (value) => value },
];

/**
 * Every compiled Spinner variant from dist/registry. Spinner renders fixed svg
 * innards, so the suites carry no `child` wrapper.
 */
export const spinnerVariants: ComponentVariant<SpinnerVariantProps>[] = [
  { style: "css", format: "jsx", render: SpinnerCssJsx },
  { style: "css", format: "html", render: SpinnerCssHtml },
  { style: "tailwind", format: "jsx", render: SpinnerTailwindJsx },
  { style: "tailwind", format: "html", render: SpinnerTailwindHtml },
];

/** The named Empty parts (every export except the default Empty). */
export const EMPTY_PARTS = ["Header", "Media", "Title", "Description", "Content"] as const;

/**
 * Every compiled Empty variant (the default export) from dist/registry.
 */
export const emptyVariants: ChildrenVariant<EmptyPartProps>[] = [
  { style: "css", format: "jsx", render: EmptyCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: EmptyCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: EmptyTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: EmptyTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Empty part (EmptyHeader…EmptyContent) at every flavor.
 */
export const emptyPartVariants: PartVariant<EmptyMediaVariantProps>[] = EMPTY_PARTS.flatMap((part) =>
  partVariants(part, "Empty", [
    [EmptyCssJsx as unknown as AnyModule, "css", "jsx"],
    [EmptyCssHtml as unknown as AnyModule, "css", "html"],
    [EmptyTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [EmptyTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Label variant from dist/registry.
 */
export const labelVariants: ChildrenVariant<LabelVariantProps>[] = [
  { style: "css", format: "jsx", render: LabelCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: LabelCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: LabelTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: LabelTailwindHtml, child: (value) => value },
];

/**
 * Every compiled Textarea variant from dist/registry. Textarea renders no
 * children (its value is the property), so the suites carry no `child` wrapper.
 */
export const textareaVariants: ComponentVariant<TextareaVariantProps>[] = [
  { style: "css", format: "jsx", render: TextareaCssJsx },
  { style: "css", format: "html", render: TextareaCssHtml },
  { style: "tailwind", format: "jsx", render: TextareaTailwindJsx },
  { style: "tailwind", format: "html", render: TextareaTailwindHtml },
];

/** The named NativeSelect parts (every export except the default NativeSelect). */
export const NATIVE_SELECT_PARTS = ["Option", "OptGroup"] as const;

/**
 * Every compiled NativeSelect variant (the default export) from dist/registry.
 * Options are authored by the caller as children.
 */
export const nativeSelectVariants: ChildrenVariant<NativeSelectVariantProps>[] = [
  { style: "css", format: "jsx", render: NativeSelectCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: NativeSelectCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: NativeSelectTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: NativeSelectTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled NativeSelect part (NativeSelectOption, NativeSelectOptGroup) at every flavor.
 */
export const nativeSelectPartVariants: PartVariant<CardPartProps>[] = NATIVE_SELECT_PARTS.flatMap((part) =>
  partVariants(part, "NativeSelect", [
    [NativeSelectCssJsx as unknown as AnyModule, "css", "jsx"],
    [NativeSelectCssHtml as unknown as AnyModule, "css", "html"],
    [NativeSelectTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [NativeSelectTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled AspectRatio variant from dist/registry.
 */
export const aspectRatioVariants: ChildrenVariant<AspectRatioVariantProps>[] = [
  { style: "css", format: "jsx", render: AspectRatioCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: AspectRatioCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: AspectRatioTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: AspectRatioTailwindHtml, child: (value) => value },
];

/** The named Avatar parts (every export except the default Avatar). */
export const AVATAR_PARTS = ["Image", "Fallback", "Badge", "Group", "GroupCount"] as const;

/** Superset prop bag across Avatar parts (Image carries src/alt/loaded; Fallback carries loaded). */
export type AvatarPartVariantProps = AvatarImageVariantProps & AvatarFallbackVariantProps;

/**
 * Every compiled Avatar variant (the default export) from dist/registry.
 */
export const avatarVariants: ChildrenVariant<AvatarVariantProps>[] = [
  { style: "css", format: "jsx", render: AvatarCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: AvatarCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: AvatarTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: AvatarTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Avatar part (AvatarImage…AvatarGroupCount) at every flavor.
 */
export const avatarPartVariants: PartVariant<AvatarPartVariantProps>[] = AVATAR_PARTS.flatMap((part) =>
  partVariants(part, "Avatar", [
    [AvatarCssJsx as unknown as AnyModule, "css", "jsx"],
    [AvatarCssHtml as unknown as AnyModule, "css", "html"],
    [AvatarTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [AvatarTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Progress variant from dist/registry. Progress renders no
 * children, so the suites carry no `child` wrapper.
 */
export const progressVariants: ComponentVariant<ProgressVariantProps>[] = [
  { style: "css", format: "jsx", render: ProgressCssJsx },
  { style: "css", format: "html", render: ProgressCssHtml },
  { style: "tailwind", format: "jsx", render: ProgressTailwindJsx },
  { style: "tailwind", format: "html", render: ProgressTailwindHtml },
];

/** The named Table parts (every export except the default Table). */
export const TABLE_PARTS = ["Header", "Body", "Footer", "Row", "Head", "Cell", "Caption"] as const;

/**
 * Every compiled Table variant (the default export) from dist/registry.
 */
export const tableVariants: ChildrenVariant<CardPartProps>[] = [
  { style: "css", format: "jsx", render: TableCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: TableCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: TableTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: TableTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Table part (TableHeader…TableCaption) at every flavor.
 */
export const tablePartVariants: PartVariant<TableCellVariantProps>[] = TABLE_PARTS.flatMap((part) =>
  partVariants(part, "Table", [
    [TableCssJsx as unknown as AnyModule, "css", "jsx"],
    [TableCssHtml as unknown as AnyModule, "css", "html"],
    [TableTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [TableTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Mounts a compiled variant into a fresh container and returns the rendered root element.
 * @param variant Compiled variant to render.
 * @param props Props handed to the variant's component.
 */
export function renderVariant<P extends object>(variant: ComponentVariant<P>, props: P): Element {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root (html-format components returning an arrow) cannot pass through mount's
  // resolve-once unwrap — wrap it so it mounts as a reactive child like any template slot.
  mount(typeof rendered === "function" ? html`<div>${rendered}</div>` : rendered, container);
  return variant.root ? variant.root()! : container.firstElementChild!;
}

/** Splits a rendered element's class attribute into its exact tokens (no filtering). */
export function classTokens(el: Element): string[] {
  return (el.getAttribute("class") ?? "").split(" ");
}

/** The element's inline styles as collapsed text — object-form (jsx) and string-form (html) flavors serialize differently. */
export function inlineStyles(el: HTMLElement): string {
  return (el.getAttribute("style") ?? el.style.cssText).replaceAll(" ", "");
}

/**
 * Polls (microtask hops) until the observer-driven mount walk has wired the given hook-carrying
 * element; hook-less roots carry no state, so callers pass the element that owns the hooks.
 */
export async function awaitWiring(stateEl: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(stateEl)?.isMounted) return;
    await delay();
  }
  expect(peekState(stateEl)?.isMounted).toBe(true);
}

/**
 * Renders every suite variant and asserts identical tag structure and identical
 * non-class attributes. Class values are normalized out — hashed registry classes
 * vs utility tokens differ by construction. The all-variant drift guard.
 * @param suites Compiled variants to compare.
 * @param props Extra props applied uniformly to every render.
 * @param ignoreAttributes Attribute names excluded from the comparison (volatile values, e.g. generated ids).
 */
export function assertStructuralParity<P extends object>(
  suites: (ComponentVariant<P> & { child?: (value: HellaChild) => HellaChildren })[],
  props: P = {} as P,
  ignoreAttributes: string[] = [],
): void {
  const ignored = new Set(["class", ...ignoreAttributes]);
  const [head, ...rest] = suites.map((suite) => {
    const el = suite.child
      ? renderVariant(suite, { ...props, children: suite.child("Parity") } as P)
      : renderVariant(suite, props);
    return {
      tag: el.tagName,
      attributes: Array.from(el.attributes)
        .filter(({ name }) => !ignored.has(name))
        .map(({ name, value }) => `${name}="${value}"`)
        .sort(),
    };
  });
  for (const shape of rest) expect(shape).toEqual(head as { tag: string; attributes: string[]; });
}

import ButtonGroupCssDefault from "../../dist/registry/button-group/css/button-group";
import ButtonGroupCssHtmlDefault from "../../dist/registry/button-group/css/button-group-html";
import ButtonGroupTailwindDefault from "../../dist/registry/button-group/tailwind/button-group";
import ButtonGroupTailwindHtmlDefault from "../../dist/registry/button-group/tailwind/button-group-html";
import * as ButtonGroupCssJsx from "../../dist/registry/button-group/css/button-group";
import * as ButtonGroupCssHtml from "../../dist/registry/button-group/css/button-group-html";
import * as ButtonGroupTailwindJsx from "../../dist/registry/button-group/tailwind/button-group";
import * as ButtonGroupTailwindHtml from "../../dist/registry/button-group/tailwind/button-group-html";
import InputGroupCssDefault from "../../dist/registry/input-group/css/input-group";
import InputGroupCssHtmlDefault from "../../dist/registry/input-group/css/input-group-html";
import InputGroupTailwindDefault from "../../dist/registry/input-group/tailwind/input-group";
import InputGroupTailwindHtmlDefault from "../../dist/registry/input-group/tailwind/input-group-html";
import * as InputGroupCssJsx from "../../dist/registry/input-group/css/input-group";
import * as InputGroupCssHtml from "../../dist/registry/input-group/css/input-group-html";
import * as InputGroupTailwindJsx from "../../dist/registry/input-group/tailwind/input-group";
import * as InputGroupTailwindHtml from "../../dist/registry/input-group/tailwind/input-group-html";
import * as FieldCssJsx from "../../dist/registry/field/css/field";
import * as FieldCssHtml from "../../dist/registry/field/css/field-html";
import * as FieldTailwindJsx from "../../dist/registry/field/tailwind/field";
import * as FieldTailwindHtml from "../../dist/registry/field/tailwind/field-html";
import PaginationCssDefault from "../../dist/registry/pagination/css/pagination";
import PaginationCssHtmlDefault from "../../dist/registry/pagination/css/pagination-html";
import PaginationTailwindDefault from "../../dist/registry/pagination/tailwind/pagination";
import PaginationTailwindHtmlDefault from "../../dist/registry/pagination/tailwind/pagination-html";
import * as PaginationCssJsx from "../../dist/registry/pagination/css/pagination";
import * as PaginationCssHtml from "../../dist/registry/pagination/css/pagination-html";
import * as PaginationTailwindJsx from "../../dist/registry/pagination/tailwind/pagination";
import * as PaginationTailwindHtml from "../../dist/registry/pagination/tailwind/pagination-html";
import * as ItemCssJsx from "../../dist/registry/item/css/item";
import * as ItemCssHtml from "../../dist/registry/item/css/item-html";
import * as ItemTailwindJsx from "../../dist/registry/item/tailwind/item";
import * as ItemTailwindHtml from "../../dist/registry/item/tailwind/item-html";
import MarkerCssDefault from "../../dist/registry/marker/css/marker";
import MarkerCssHtmlDefault from "../../dist/registry/marker/css/marker-html";
import MarkerTailwindDefault from "../../dist/registry/marker/tailwind/marker";
import MarkerTailwindHtmlDefault from "../../dist/registry/marker/tailwind/marker-html";
import * as MarkerCssJsx from "../../dist/registry/marker/css/marker";
import * as MarkerCssHtml from "../../dist/registry/marker/css/marker-html";
import * as MarkerTailwindJsx from "../../dist/registry/marker/tailwind/marker";
import * as MarkerTailwindHtml from "../../dist/registry/marker/tailwind/marker-html";
import DirectionCssDefault from "../../dist/registry/direction/css/direction";
import DirectionCssHtmlDefault from "../../dist/registry/direction/css/direction-html";
import DirectionTailwindDefault from "../../dist/registry/direction/tailwind/direction";
import DirectionTailwindHtmlDefault from "../../dist/registry/direction/tailwind/direction-html";

/** Prop bag shared by every compiled ButtonGroup variant (mirrors the emitted ButtonGroupProps). */
export interface ButtonGroupVariantProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

/** Prop bag for the compiled ButtonGroupText part (mirrors the emitted props). */
export interface ButtonGroupTextVariantProps extends CardPartProps {}

/** Prop bag for the compiled ButtonGroupSeparator part (mirrors the emitted props). */
export interface ButtonGroupSeparatorVariantProps {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

/** Superset prop bag across ButtonGroup parts. */
export type ButtonGroupPartVariantProps = ButtonGroupTextVariantProps & ButtonGroupSeparatorVariantProps;

/** The named ButtonGroup parts (every export except the default ButtonGroup). */
export const BUTTON_GROUP_PARTS = ["Text", "Separator"] as const;

/**
 * Every compiled ButtonGroup variant (the default export) from dist/registry.
 */
export const buttonGroupVariants: ChildrenVariant<ButtonGroupVariantProps>[] = [
  { style: "css", format: "jsx", render: ButtonGroupCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: ButtonGroupCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: ButtonGroupTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: ButtonGroupTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled ButtonGroup part (ButtonGroupText, ButtonGroupSeparator) at every flavor.
 */
export const buttonGroupPartVariants: PartVariant<ButtonGroupPartVariantProps>[] = BUTTON_GROUP_PARTS.flatMap((part) =>
  partVariants(part, "ButtonGroup", [
    [ButtonGroupCssJsx as unknown as AnyModule, "css", "jsx"],
    [ButtonGroupCssHtml as unknown as AnyModule, "css", "html"],
    [ButtonGroupTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ButtonGroupTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled InputGroup variant (mirrors the emitted InputGroupProps). */
export interface InputGroupVariantProps {
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
export type InputGroupPartVariantProps = InputGroupAddonVariantProps & InputGroupButtonVariantProps
  & InputGroupTextVariantProps & InputGroupInputVariantProps & InputGroupTextareaVariantProps;

/** The named InputGroup parts (every export except the default InputGroup). */
export const INPUT_GROUP_PARTS = ["Addon", "Button", "Text", "Input", "Textarea"] as const;

/**
 * Every compiled InputGroup variant (the default export) from dist/registry.
 */
export const inputGroupVariants: ChildrenVariant<InputGroupVariantProps>[] = [
  { style: "css", format: "jsx", render: InputGroupCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: InputGroupCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: InputGroupTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: InputGroupTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled InputGroup part (InputGroupAddon…InputGroupTextarea) at every flavor.
 */
export const inputGroupPartVariants: PartVariant<InputGroupPartVariantProps>[] = INPUT_GROUP_PARTS.flatMap((part) =>
  partVariants(part, "InputGroup", [
    [InputGroupCssJsx as unknown as AnyModule, "css", "jsx"],
    [InputGroupCssHtml as unknown as AnyModule, "css", "html"],
    [InputGroupTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [InputGroupTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag for the compiled FieldSet/FieldGroup/FieldContent parts (mirrors the emitted props). */
export interface FieldPartProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag for the compiled FieldLegend part (mirrors the emitted props). */
export interface FieldLegendVariantProps extends FieldPartProps {
  variant?: "legend" | "label";
}

/** Prop bag for the compiled Field root (mirrors the emitted FieldProps). */
export interface FieldVariantProps extends FieldPartProps {
  orientation?: "vertical" | "horizontal" | "responsive";
  disabled?: boolean;
  invalid?: boolean;
}

/** Prop bag for the compiled FieldLabel part (mirrors the emitted props). */
export interface FieldLabelVariantProps extends FieldPartProps {
  for?: string;
}

/** Prop bag for the compiled FieldError part (mirrors the emitted props). */
export interface FieldErrorVariantProps extends FieldPartProps {
  errors?: Array<{ message?: string } | undefined>;
}

/** Superset prop bag across Field parts. */
export type FieldPartVariantProps = FieldLegendVariantProps & FieldVariantProps & FieldLabelVariantProps & FieldErrorVariantProps;

/** The named Field parts (every export; Field has no default export). */
export const FIELD_PARTS = ["Set", "Legend", "Group", "Content", "Label", "Title", "Description", "Separator", "Error"] as const;

/** Field part lookup: Field roots are built through the "Field" prop prefix. */
export const FIELD_PROP_PREFIX = "Field";

/**
 * Every compiled Field part (FieldSet…FieldError) at every flavor.
 */
export const fieldPartVariants: PartVariant<FieldPartVariantProps>[] = FIELD_PARTS.flatMap((part) =>
  partVariants(part, "Field", [
    [FieldCssJsx as unknown as AnyModule, "css", "jsx"],
    [FieldCssHtml as unknown as AnyModule, "css", "html"],
    [FieldTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [FieldTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled Pagination variant (mirrors the emitted PaginationProps). */
export interface PaginationVariantProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag for the compiled PaginationLink part (mirrors the emitted props). */
export interface PaginationLinkVariantProps {
  children?: HellaChildren;
  isActive?: boolean;
  href?: string;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  class?: string;
  onclick?: () => void;
}

/** Prop bag for the compiled PaginationPrevious/Next parts (mirrors the emitted props). */
export interface PaginationNavVariantProps {
  isActive?: boolean;
  href?: string;
  class?: string;
  onclick?: () => void;
}

/** Prop bag for the compiled PaginationContent/PaginationItem parts (mirrors the emitted props). */
export interface PaginationContentVariantProps extends CardPartProps {}

/** Prop bag for the compiled PaginationEllipsis part (mirrors the emitted props). */
export interface PaginationEllipsisVariantProps {
  class?: string;
}

/** Superset prop bag across Pagination parts. */
export type PaginationPartVariantProps = PaginationLinkVariantProps & PaginationNavVariantProps
  & PaginationContentVariantProps & PaginationEllipsisVariantProps;

/** The named Pagination parts (every export except the default Pagination). */
export const PAGINATION_PARTS = ["Content", "Item", "Link", "Previous", "Next", "Ellipsis"] as const;

/**
 * Every compiled Pagination variant (the default export) from dist/registry.
 */
export const paginationVariants: ChildrenVariant<PaginationVariantProps>[] = [
  { style: "css", format: "jsx", render: PaginationCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: PaginationCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: PaginationTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: PaginationTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Pagination part (PaginationContent…PaginationEllipsis) at every flavor.
 */
export const paginationPartVariants: PartVariant<PaginationPartVariantProps>[] = PAGINATION_PARTS.flatMap((part) =>
  partVariants(part, "Pagination", [
    [PaginationCssJsx as unknown as AnyModule, "css", "jsx"],
    [PaginationCssHtml as unknown as AnyModule, "css", "html"],
    [PaginationTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [PaginationTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag for the compiled ItemGroup/ItemContent/ItemTitle/ItemDescription/ItemActions/ItemHeader/ItemFooter parts (mirrors the emitted props). */
export interface ItemPartProps {
  children?: HellaChildren;
  class?: string;
}

/** Prop bag for the compiled Item root (mirrors the emitted ItemProps). */
export interface ItemVariantProps extends ItemPartProps {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  selected?: boolean | (() => boolean);
}

/** Prop bag for the compiled ItemSeparator part (mirrors the emitted props). */
export interface ItemSeparatorVariantProps {
  class?: string;
}

/** Prop bag for the compiled ItemMedia part (mirrors the emitted props). */
export interface ItemMediaVariantProps extends ItemPartProps {
  variant?: "default" | "icon" | "image";
}

/** Superset prop bag across Item parts (variant unions conflict between Item root and ItemMedia, so the root's is omitted). */
export type ItemPartVariantProps = Omit<ItemVariantProps, "variant"> & ItemSeparatorVariantProps & ItemMediaVariantProps;

/** The named Item parts (every export; Item has no default export). */
export const ITEM_PARTS = ["Group", "Separator", "Media", "Content", "Title", "Description", "Actions", "Header", "Footer"] as const;

/**
 * Every compiled Item part (ItemGroup…ItemFooter) at every flavor.
 */
export const itemPartVariants: PartVariant<ItemPartVariantProps>[] = ITEM_PARTS.flatMap((part) =>
  partVariants(part, "Item", [
    [ItemCssJsx as unknown as AnyModule, "css", "jsx"],
    [ItemCssHtml as unknown as AnyModule, "css", "html"],
    [ItemTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ItemTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled Marker variant (mirrors the emitted MarkerProps). */
export interface MarkerVariantProps {
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
  class?: string;
}

/** Prop bag for the compiled MarkerIcon/MarkerContent parts (mirrors the emitted props). */
export interface MarkerPartProps {
  children?: HellaChildren;
  class?: string;
}

/** The named Marker parts (every export except the default Marker). */
export const MARKER_PARTS = ["Icon", "Content"] as const;

/**
 * Every compiled Marker variant (the default export) from dist/registry.
 */
export const markerVariants: ChildrenVariant<MarkerVariantProps>[] = [
  { style: "css", format: "jsx", render: MarkerCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: MarkerCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: MarkerTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: MarkerTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Marker part (MarkerIcon, MarkerContent) at every flavor.
 */
export const markerPartVariants: PartVariant<MarkerPartProps>[] = MARKER_PARTS.flatMap((part) =>
  partVariants(part, "Marker", [
    [MarkerCssJsx as unknown as AnyModule, "css", "jsx"],
    [MarkerCssHtml as unknown as AnyModule, "css", "html"],
    [MarkerTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [MarkerTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled DirectionProvider variant (mirrors the emitted DirectionProviderProps). */
export interface DirectionVariantProps {
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
  class?: string;
}

/**
 * Every compiled DirectionProvider variant (the default export) from dist/registry.
 */
export const directionVariants: ChildrenVariant<DirectionVariantProps>[] = [
  { style: "css", format: "jsx", render: DirectionCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: DirectionCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: DirectionTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: DirectionTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled Field root (the named Field export — the module has no default) at every flavor.
 */
export const fieldVariants: PartVariant<FieldVariantProps>[] = [
  { part: "Field", style: "css", format: "jsx", render: (FieldCssJsx as unknown as AnyModule).Field as unknown as (props: FieldVariantProps) => HellaNode },
  { part: "Field", style: "css", format: "html", render: (FieldCssHtml as unknown as AnyModule).Field as unknown as (props: FieldVariantProps) => HellaNode },
  { part: "Field", style: "tailwind", format: "jsx", render: (FieldTailwindJsx as unknown as AnyModule).Field as unknown as (props: FieldVariantProps) => HellaNode },
  { part: "Field", style: "tailwind", format: "html", render: (FieldTailwindHtml as unknown as AnyModule).Field as unknown as (props: FieldVariantProps) => HellaNode },
];

/**
 * Every compiled Item root (the named Item export — the module has no default) at every flavor.
 */
export const itemVariants: PartVariant<ItemVariantProps>[] = [
  { part: "Item", style: "css", format: "jsx", render: (ItemCssJsx as unknown as AnyModule).Item as unknown as (props: ItemVariantProps) => HellaNode },
  { part: "Item", style: "css", format: "html", render: (ItemCssHtml as unknown as AnyModule).Item as unknown as (props: ItemVariantProps) => HellaNode },
  { part: "Item", style: "tailwind", format: "jsx", render: (ItemTailwindJsx as unknown as AnyModule).Item as unknown as (props: ItemVariantProps) => HellaNode },
  { part: "Item", style: "tailwind", format: "html", render: (ItemTailwindHtml as unknown as AnyModule).Item as unknown as (props: ItemVariantProps) => HellaNode },
];

import * as BubbleCssJsx from "../../dist/registry/bubble/css/bubble";
import * as BubbleCssHtml from "../../dist/registry/bubble/css/bubble-html";
import * as BubbleTailwindJsx from "../../dist/registry/bubble/tailwind/bubble";
import * as BubbleTailwindHtml from "../../dist/registry/bubble/tailwind/bubble-html";
import * as MessageCssJsx from "../../dist/registry/message/css/message";
import * as MessageCssHtml from "../../dist/registry/message/css/message-html";
import * as MessageTailwindJsx from "../../dist/registry/message/tailwind/message";
import * as MessageTailwindHtml from "../../dist/registry/message/tailwind/message-html";
import * as MessageScrollerCssJsx from "../../dist/registry/message-scroller/css/message-scroller";
import * as MessageScrollerCssHtml from "../../dist/registry/message-scroller/css/message-scroller-html";
import * as MessageScrollerTailwindJsx from "../../dist/registry/message-scroller/tailwind/message-scroller";
import * as MessageScrollerTailwindHtml from "../../dist/registry/message-scroller/tailwind/message-scroller-html";
import * as AttachmentCssJsx from "../../dist/registry/attachment/css/attachment";
import * as AttachmentCssHtml from "../../dist/registry/attachment/css/attachment-html";
import * as AttachmentTailwindJsx from "../../dist/registry/attachment/tailwind/attachment";
import * as AttachmentTailwindHtml from "../../dist/registry/attachment/tailwind/attachment-html";

/** Prop bag for the compiled Bubble part (mirrors the emitted props). */
export interface BubbleVariantProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
  class?: string;
}

/** Prop bag shared by every compiled Bubble part except Bubble itself (mirrors the emitted props). */
export type BubblePartProps = CardPartProps;

/** Prop bag for the compiled BubbleReactions part (mirrors the emitted props). */
export interface BubbleReactionsVariantProps extends BubblePartProps {
  side?: "top" | "bottom";
  align?: "start" | "end";
}

/** The named Bubble exports (the module has no default). */
export const BUBBLE_PARTS = ["Group", "Content", "Reactions"] as const;

/**
 * Every compiled Bubble variant (the named Bubble export) at every flavor.
 */
export const bubbleVariants: PartVariant<BubbleVariantProps>[] = [
  { part: "Bubble", style: "css", format: "jsx", render: (BubbleCssJsx as unknown as AnyModule).Bubble as unknown as (props: BubbleVariantProps) => HellaNode },
  { part: "Bubble", style: "css", format: "html", render: (BubbleCssHtml as unknown as AnyModule).Bubble as unknown as (props: BubbleVariantProps) => HellaNode },
  { part: "Bubble", style: "tailwind", format: "jsx", render: (BubbleTailwindJsx as unknown as AnyModule).Bubble as unknown as (props: BubbleVariantProps) => HellaNode },
  { part: "Bubble", style: "tailwind", format: "html", render: (BubbleTailwindHtml as unknown as AnyModule).Bubble as unknown as (props: BubbleVariantProps) => HellaNode },
];

/**
 * Every compiled Bubble part (BubbleGroup, BubbleContent, BubbleReactions) at every flavor.
 */
export const bubblePartVariants: PartVariant<BubblePartProps & BubbleReactionsVariantProps>[] = BUBBLE_PARTS.flatMap((part) =>
  partVariants(part, "Bubble", [
    [BubbleCssJsx as unknown as AnyModule, "css", "jsx"],
    [BubbleCssHtml as unknown as AnyModule, "css", "html"],
    [BubbleTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [BubbleTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag for the compiled Message root (mirrors the emitted props). */
export interface MessageVariantProps extends CardPartProps {
  align?: "start" | "end";
}

/** The named Message parts except the Message root (mirrors the emitted props). */
export const MESSAGE_PARTS = ["Group", "Avatar", "Content", "Header", "Footer"] as const;

/**
 * Every compiled Message variant (the named Message export) at every flavor.
 */
export const messageVariants: PartVariant<MessageVariantProps>[] = [
  { part: "Message", style: "css", format: "jsx", render: (MessageCssJsx as unknown as AnyModule).Message as unknown as (props: MessageVariantProps) => HellaNode },
  { part: "Message", style: "css", format: "html", render: (MessageCssHtml as unknown as AnyModule).Message as unknown as (props: MessageVariantProps) => HellaNode },
  { part: "Message", style: "tailwind", format: "jsx", render: (MessageTailwindJsx as unknown as AnyModule).Message as unknown as (props: MessageVariantProps) => HellaNode },
  { part: "Message", style: "tailwind", format: "html", render: (MessageTailwindHtml as unknown as AnyModule).Message as unknown as (props: MessageVariantProps) => HellaNode },
];

/**
 * Every compiled Message part (MessageGroup, MessageAvatar, MessageContent, MessageHeader, MessageFooter) at every flavor.
 */
export const messagePartVariants: PartVariant<CardPartProps>[] = MESSAGE_PARTS.flatMap((part) =>
  partVariants(part, "Message", [
    [MessageCssJsx as unknown as AnyModule, "css", "jsx"],
    [MessageCssHtml as unknown as AnyModule, "css", "html"],
    [MessageTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [MessageTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Injectable content watcher seam shared by the scroller viewport and composed root (mirrors the emitted prop). */
export type ScrollerObserve = (target: Element, onGrow: () => void) => () => void;

/** Prop bag for the compiled MessageScroller root (mirrors the emitted props). */
export interface MessageScrollerVariantProps extends CardPartProps {
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  threshold?: number;
  observe?: ScrollerObserve;
  showScrollButton?: boolean;
}

/** Prop bag for the compiled MessageScrollerViewport part (mirrors the emitted props). */
export interface MessageScrollerViewportVariantProps extends MessageScrollerVariantProps {}

/** Prop bag for the compiled MessageScrollerButton part (mirrors the emitted props). */
export interface MessageScrollerButtonVariantProps extends CardPartProps {
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  direction?: "start" | "end";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onclick?: () => void;
}

/** Superset prop bag across MessageScroller parts. */
export type MessageScrollerPartVariantProps = MessageScrollerVariantProps & MessageScrollerButtonVariantProps;

/** The named MessageScroller parts except the MessageScroller root. */
export const MESSAGE_SCROLLER_PARTS = ["Provider", "Viewport", "Content", "Item", "Button"] as const;

/**
 * Every compiled MessageScroller variant (the named MessageScroller export) at every flavor.
 */
export const messageScrollerVariants: PartVariant<MessageScrollerVariantProps>[] = [
  { part: "MessageScroller", style: "css", format: "jsx", render: (MessageScrollerCssJsx as unknown as AnyModule).MessageScroller as unknown as (props: MessageScrollerVariantProps) => HellaNode },
  { part: "MessageScroller", style: "css", format: "html", render: (MessageScrollerCssHtml as unknown as AnyModule).MessageScroller as unknown as (props: MessageScrollerVariantProps) => HellaNode },
  { part: "MessageScroller", style: "tailwind", format: "jsx", render: (MessageScrollerTailwindJsx as unknown as AnyModule).MessageScroller as unknown as (props: MessageScrollerVariantProps) => HellaNode },
  { part: "MessageScroller", style: "tailwind", format: "html", render: (MessageScrollerTailwindHtml as unknown as AnyModule).MessageScroller as unknown as (props: MessageScrollerVariantProps) => HellaNode },
];

/**
 * Every compiled MessageScroller part (Provider, Viewport, Content, Item, Button) at every flavor.
 */
export const messageScrollerPartVariants: PartVariant<MessageScrollerPartVariantProps>[] = MESSAGE_SCROLLER_PARTS.flatMap((part) =>
  partVariants(part, "MessageScroller", [
    [MessageScrollerCssJsx as unknown as AnyModule, "css", "jsx"],
    [MessageScrollerCssHtml as unknown as AnyModule, "css", "html"],
    [MessageScrollerTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [MessageScrollerTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag for the compiled Attachment root (mirrors the emitted props). */
export interface AttachmentVariantProps extends CardPartProps {
  state?: "idle" | "uploading" | "processing" | "error" | "done";
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}

/** Prop bag for the compiled AttachmentMedia part (mirrors the emitted props). */
export interface AttachmentMediaVariantProps extends CardPartProps {
  variant?: "icon" | "image";
  state?: "idle" | "uploading" | "processing" | "error" | "done";
}

/** Prop bag for the compiled AttachmentAction part (mirrors the emitted props). */
export interface AttachmentActionVariantProps extends CardPartProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onclick?: () => void;
}

/** Superset prop bag across Attachment parts. */
export type AttachmentPartVariantProps = AttachmentMediaVariantProps & Omit<AttachmentActionVariantProps, "variant">;

/** The named Attachment parts except the Attachment root. */
export const ATTACHMENT_PARTS = ["Media", "Content", "Title", "Description", "Actions", "Action", "Trigger", "Group"] as const;

/**
 * Every compiled Attachment variant (the named Attachment export) at every flavor.
 */
export const attachmentVariants: PartVariant<AttachmentVariantProps>[] = [
  { part: "Attachment", style: "css", format: "jsx", render: (AttachmentCssJsx as unknown as AnyModule).Attachment as unknown as (props: AttachmentVariantProps) => HellaNode },
  { part: "Attachment", style: "css", format: "html", render: (AttachmentCssHtml as unknown as AnyModule).Attachment as unknown as (props: AttachmentVariantProps) => HellaNode },
  { part: "Attachment", style: "tailwind", format: "jsx", render: (AttachmentTailwindJsx as unknown as AnyModule).Attachment as unknown as (props: AttachmentVariantProps) => HellaNode },
  { part: "Attachment", style: "tailwind", format: "html", render: (AttachmentTailwindHtml as unknown as AnyModule).Attachment as unknown as (props: AttachmentVariantProps) => HellaNode },
];

/**
 * Every compiled Attachment part (AttachmentMedia…AttachmentGroup) at every flavor.
 */
export const attachmentPartVariants: PartVariant<AttachmentPartVariantProps>[] = ATTACHMENT_PARTS.flatMap((part) =>
  partVariants(part, "Attachment", [
    [AttachmentCssJsx as unknown as AnyModule, "css", "jsx"],
    [AttachmentCssHtml as unknown as AnyModule, "css", "html"],
    [AttachmentTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [AttachmentTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import CollapsibleCssDefault from "../../dist/registry/collapsible/css/collapsible";
import CollapsibleCssHtmlDefault from "../../dist/registry/collapsible/css/collapsible-html";
import CollapsibleTailwindDefault from "../../dist/registry/collapsible/tailwind/collapsible";
import CollapsibleTailwindHtmlDefault from "../../dist/registry/collapsible/tailwind/collapsible-html";
import * as CollapsibleCssJsx from "../../dist/registry/collapsible/css/collapsible";
import * as CollapsibleCssHtml from "../../dist/registry/collapsible/css/collapsible-html";
import * as CollapsibleTailwindJsx from "../../dist/registry/collapsible/tailwind/collapsible";
import * as CollapsibleTailwindHtml from "../../dist/registry/collapsible/tailwind/collapsible-html";
import AccordionCssDefault from "../../dist/registry/accordion/css/accordion";
import AccordionCssHtmlDefault from "../../dist/registry/accordion/css/accordion-html";
import AccordionTailwindDefault from "../../dist/registry/accordion/tailwind/accordion";
import AccordionTailwindHtmlDefault from "../../dist/registry/accordion/tailwind/accordion-html";
import * as AccordionCssJsx from "../../dist/registry/accordion/css/accordion";
import * as AccordionCssHtml from "../../dist/registry/accordion/css/accordion-html";
import * as AccordionTailwindJsx from "../../dist/registry/accordion/tailwind/accordion";
import * as AccordionTailwindHtml from "../../dist/registry/accordion/tailwind/accordion-html";
import CheckboxCssJsx from "../../dist/registry/checkbox/css/checkbox";
import CheckboxCssHtml from "../../dist/registry/checkbox/css/checkbox-html";
import CheckboxTailwindJsx from "../../dist/registry/checkbox/tailwind/checkbox";
import CheckboxTailwindHtml from "../../dist/registry/checkbox/tailwind/checkbox-html";
import RadioGroupCssDefault from "../../dist/registry/radio-group/css/radio-group";
import RadioGroupCssHtmlDefault from "../../dist/registry/radio-group/css/radio-group-html";
import RadioGroupTailwindDefault from "../../dist/registry/radio-group/tailwind/radio-group";
import RadioGroupTailwindHtmlDefault from "../../dist/registry/radio-group/tailwind/radio-group-html";
import * as RadioGroupCssJsx from "../../dist/registry/radio-group/css/radio-group";
import * as RadioGroupCssHtml from "../../dist/registry/radio-group/css/radio-group-html";
import * as RadioGroupTailwindJsx from "../../dist/registry/radio-group/tailwind/radio-group";
import * as RadioGroupTailwindHtml from "../../dist/registry/radio-group/tailwind/radio-group-html";
import SwitchCssJsx from "../../dist/registry/switch/css/switch";
import SwitchCssHtml from "../../dist/registry/switch/css/switch-html";
import SwitchTailwindJsx from "../../dist/registry/switch/tailwind/switch";
import SwitchTailwindHtml from "../../dist/registry/switch/tailwind/switch-html";
import ToggleCssJsx from "../../dist/registry/toggle/css/toggle";
import ToggleCssHtml from "../../dist/registry/toggle/css/toggle-html";
import ToggleTailwindJsx from "../../dist/registry/toggle/tailwind/toggle";
import ToggleTailwindHtml from "../../dist/registry/toggle/tailwind/toggle-html";
import ToggleGroupCssDefault from "../../dist/registry/toggle-group/css/toggle-group";
import ToggleGroupCssHtmlDefault from "../../dist/registry/toggle-group/css/toggle-group-html";
import ToggleGroupTailwindDefault from "../../dist/registry/toggle-group/tailwind/toggle-group";
import ToggleGroupTailwindHtmlDefault from "../../dist/registry/toggle-group/tailwind/toggle-group-html";
import * as ToggleGroupCssJsx from "../../dist/registry/toggle-group/css/toggle-group";
import * as ToggleGroupCssHtml from "../../dist/registry/toggle-group/css/toggle-group-html";
import * as ToggleGroupTailwindJsx from "../../dist/registry/toggle-group/tailwind/toggle-group";
import * as ToggleGroupTailwindHtml from "../../dist/registry/toggle-group/tailwind/toggle-group-html";

/** Prop bag shared by every compiled Collapsible variant (mirrors the emitted CollapsibleProps). */
export interface CollapsibleVariantProps {
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
  class?: string;
}

/** Superset prop bag across Collapsible parts (mirrors the emitted part props). */
export interface CollapsiblePartVariantProps {
  active?: () => boolean;
  onToggle?: () => void;
  controls?: string;
  id?: string;
  children?: HellaChildren;
  class?: string;
}

/** Item shape of every compiled Accordion variant (mirrors the emitted AccordionEntry). */
export interface AccordionEntryVariant {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Accordion variant (mirrors the emitted AccordionProps). */
export interface AccordionVariantProps {
  items: AccordionEntryVariant[];
  type?: "single" | "multiple";
  collapsible?: boolean;
  open?: string | string[];
  class?: string;
}

/** Superset prop bag across Accordion parts (mirrors the emitted part props). */
export interface AccordionPartVariantProps {
  value?: string;
  id?: string;
  labelledBy?: string;
  active?: () => boolean;
  onToggle?: () => void;
  controls?: string;
  disabled?: boolean;
  children?: HellaChildren;
  class?: string;
}

/**
 * Every compiled Collapsible variant (the default export) from dist/registry.
 * Collapsible takes trigger/content props, so the suites carry no `child` wrapper.
 */
export const collapsibleVariants: ComponentVariant<CollapsibleVariantProps>[] = [
  { style: "css", format: "jsx", render: CollapsibleCssDefault },
  { style: "css", format: "html", render: CollapsibleCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: CollapsibleTailwindDefault },
  { style: "tailwind", format: "html", render: CollapsibleTailwindHtmlDefault },
];

/** The named Collapsible parts (every export except the default Collapsible). */
export const COLLAPSIBLE_PARTS = ["Trigger", "Content"] as const;

/**
 * Every compiled Collapsible part (CollapsibleTrigger, CollapsibleContent) at every flavor.
 */
export const collapsiblePartVariants: PartVariant<CollapsiblePartVariantProps>[] = COLLAPSIBLE_PARTS.flatMap((part) =>
  partVariants(part, "Collapsible", [
    [CollapsibleCssJsx as unknown as AnyModule, "css", "jsx"],
    [CollapsibleCssHtml as unknown as AnyModule, "css", "html"],
    [CollapsibleTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [CollapsibleTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Accordion variant (the default export) from dist/registry.
 * Accordion takes an items array, so the suites carry no `child` wrapper.
 */
export const accordionVariants: ComponentVariant<AccordionVariantProps>[] = [
  { style: "css", format: "jsx", render: AccordionCssDefault },
  { style: "css", format: "html", render: AccordionCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: AccordionTailwindDefault },
  { style: "tailwind", format: "html", render: AccordionTailwindHtmlDefault },
];

/** The named Accordion parts (every export except the default Accordion). */
export const ACCORDION_PARTS = ["Item", "Trigger", "Content"] as const;

/**
 * Every compiled Accordion part (AccordionItem, AccordionTrigger, AccordionContent) at every flavor.
 */
export const accordionPartVariants: PartVariant<AccordionPartVariantProps>[] = ACCORDION_PARTS.flatMap((part) =>
  partVariants(part, "Accordion", [
    [AccordionCssJsx as unknown as AnyModule, "css", "jsx"],
    [AccordionCssHtml as unknown as AnyModule, "css", "html"],
    [AccordionTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [AccordionTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Item shape of every compiled RadioGroup variant (mirrors the emitted RadioGroupItem). */
export interface RadioGroupEntryVariant {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Prop bag shared by every compiled RadioGroup variant (mirrors the emitted RadioGroupProps). */
export interface RadioGroupVariantProps {
  items: RadioGroupEntryVariant[];
  value?: () => string;
  onValueChange?: (value: string) => void;
  name?: string;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

/** Prop bag shared by every compiled Checkbox variant (mirrors the emitted CheckboxProps). */
export interface CheckboxVariantProps {
  checked?: boolean | (() => boolean);
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
  id?: string;
  class?: string;
}

/** Prop bag shared by every compiled Switch variant (mirrors the emitted SwitchProps). */
export interface SwitchVariantProps {
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
}

/** Prop bag shared by every compiled Toggle variant (mirrors the emitted ToggleProps). */
export interface ToggleVariantProps {
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

/** Item shape of every compiled ToggleGroup variant (mirrors the emitted ToggleGroupEntry). */
export interface ToggleGroupEntryVariant {
  value: string;
  label?: HellaChildren;
  pressed?: boolean;
  disabled?: boolean;
}

/** Prop bag shared by every compiled ToggleGroup variant (mirrors the emitted ToggleGroupProps). */
export interface ToggleGroupVariantProps {
  items: ToggleGroupEntryVariant[];
  type: "single" | "multiple";
  value?: () => string;
  values?: () => string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  class?: string;
}

/**
 * Every compiled Checkbox variant from dist/registry: {css,tailwind} × {jsx,html}.
 */
export const checkboxVariants: ComponentVariant<CheckboxVariantProps>[] = [
  { style: "css", format: "jsx", render: CheckboxCssJsx },
  { style: "css", format: "html", render: CheckboxCssHtml },
  { style: "tailwind", format: "jsx", render: CheckboxTailwindJsx },
  { style: "tailwind", format: "html", render: CheckboxTailwindHtml },
];

/**
 * Every compiled RadioGroup variant (the default export) from dist/registry.
 * RadioGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const radioGroupVariants: ComponentVariant<RadioGroupVariantProps>[] = [
  { style: "css", format: "jsx", render: RadioGroupCssDefault },
  { style: "css", format: "html", render: RadioGroupCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: RadioGroupTailwindDefault },
  { style: "tailwind", format: "html", render: RadioGroupTailwindHtmlDefault },
];

/** The named RadioGroup parts (every export except the default RadioGroup). */
export const RADIO_GROUP_PARTS = ["Item"] as const;

/** Prop bag shared by every compiled RadioGroup part (mirrors the emitted RadioGroupItemProps). */
export interface RadioGroupPartVariantProps {
  value: string;
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  disabled?: boolean;
  name?: string;
  class?: string;
}

/**
 * Every compiled RadioGroup part (RadioGroupItem) at every flavor.
 */
export const radioGroupPartVariants: PartVariant<RadioGroupPartVariantProps>[] = RADIO_GROUP_PARTS.flatMap((part) =>
  partVariants(part, "RadioGroup", [
    [RadioGroupCssJsx as unknown as AnyModule, "css", "jsx"],
    [RadioGroupCssHtml as unknown as AnyModule, "css", "html"],
    [RadioGroupTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [RadioGroupTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Switch variant from dist/registry: {css,tailwind} × {jsx,html}.
 */
export const switchVariants: ComponentVariant<SwitchVariantProps>[] = [
  { style: "css", format: "jsx", render: SwitchCssJsx },
  { style: "css", format: "html", render: SwitchCssHtml },
  { style: "tailwind", format: "jsx", render: SwitchTailwindJsx },
  { style: "tailwind", format: "html", render: SwitchTailwindHtml },
];

/**
 * Every compiled Toggle variant from dist/registry: {css,tailwind} × {jsx,html}.
 */
export const toggleVariants: ChildrenVariant<ToggleVariantProps>[] = [
  { style: "css", format: "jsx", render: ToggleCssJsx, child: (value) => [value] },
  { style: "css", format: "html", render: ToggleCssHtml, child: (value) => value },
  { style: "tailwind", format: "jsx", render: ToggleTailwindJsx, child: (value) => [value] },
  { style: "tailwind", format: "html", render: ToggleTailwindHtml, child: (value) => value },
];

/**
 * Every compiled ToggleGroup variant (the default export) from dist/registry.
 * ToggleGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const toggleGroupVariants: ComponentVariant<ToggleGroupVariantProps>[] = [
  { style: "css", format: "jsx", render: ToggleGroupCssDefault },
  { style: "css", format: "html", render: ToggleGroupCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: ToggleGroupTailwindDefault },
  { style: "tailwind", format: "html", render: ToggleGroupTailwindHtmlDefault },
];

/** The named ToggleGroup parts (every export except the default ToggleGroup). */
export const TOGGLE_GROUP_PARTS = ["Item"] as const;

/** Prop bag shared by every compiled ToggleGroup part (mirrors the emitted ToggleGroupItemProps). */
export interface ToggleGroupPartVariantProps {
  value?: string;
  pressed?: boolean | (() => boolean);
  onSelect?: () => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

/**
 * Every compiled ToggleGroup part (ToggleGroupItem) at every flavor.
 */
export const toggleGroupPartVariants: PartVariant<ToggleGroupPartVariantProps>[] = TOGGLE_GROUP_PARTS.flatMap((part) =>
  partVariants(part, "ToggleGroup", [
    [ToggleGroupCssJsx as unknown as AnyModule, "css", "jsx"],
    [ToggleGroupCssHtml as unknown as AnyModule, "css", "html"],
    [ToggleGroupTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ToggleGroupTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import SliderCssDefault from "../../dist/registry/slider/css/slider";
import SliderCssHtmlDefault from "../../dist/registry/slider/css/slider-html";
import SliderTailwindDefault from "../../dist/registry/slider/tailwind/slider";
import SliderTailwindHtmlDefault from "../../dist/registry/slider/tailwind/slider-html";
import ResizableCssDefault from "../../dist/registry/resizable/css/resizable";
import ResizableCssHtmlDefault from "../../dist/registry/resizable/css/resizable-html";
import ResizableTailwindDefault from "../../dist/registry/resizable/tailwind/resizable";
import ResizableTailwindHtmlDefault from "../../dist/registry/resizable/tailwind/resizable-html";
import * as ResizableCssJsx from "../../dist/registry/resizable/css/resizable";
import * as ResizableCssHtml from "../../dist/registry/resizable/css/resizable-html";
import * as ResizableTailwindJsx from "../../dist/registry/resizable/tailwind/resizable";
import * as ResizableTailwindHtml from "../../dist/registry/resizable/tailwind/resizable-html";

/** Prop bag shared by every compiled Slider variant (mirrors the emitted SliderProps). */
export interface SliderVariantProps {
  value?: number[] | (() => number[]);
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  minStepsBetweenThumbs?: number;
  class?: string;
}

/**
 * Every compiled Slider variant from dist/registry: {css,tailwind} × {jsx,html}.
 */
export const sliderVariants: ComponentVariant<SliderVariantProps>[] = [
  { style: "css", format: "jsx", render: SliderCssDefault },
  { style: "css", format: "html", render: SliderCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: SliderTailwindDefault },
  { style: "tailwind", format: "html", render: SliderTailwindHtmlDefault },
];

/** Prop bag shared by every compiled ResizablePanelGroup variant (mirrors the emitted ResizablePanelGroupProps). */
export interface ResizableVariantProps {
  direction?: "horizontal" | "vertical";
  onLayout?: (sizes: number[]) => void;
  children?: HellaChildren;
  class?: string;
}

/**
 * Every compiled ResizablePanelGroup variant (the default export) from dist/registry.
 * The group takes composed children, so the suites carry a child wrapper rendering a panel/handle/panel stack.
 */
export const resizableVariants: ChildrenVariant<ResizableVariantProps>[] = [
  {
    style: "css",
    format: "jsx",
    render: ResizableCssDefault,
    child: (value) => [
      ResizableCssJsx.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableCssJsx.ResizableHandle({}),
      ResizableCssJsx.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
  {
    style: "css",
    format: "html",
    render: ResizableCssHtmlDefault,
    child: (value) => [
      ResizableCssHtml.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableCssHtml.ResizableHandle({}),
      ResizableCssHtml.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
  {
    style: "tailwind",
    format: "jsx",
    render: ResizableTailwindDefault,
    child: (value) => [
      ResizableTailwindJsx.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableTailwindJsx.ResizableHandle({}),
      ResizableTailwindJsx.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
  {
    style: "tailwind",
    format: "html",
    render: ResizableTailwindHtmlDefault,
    child: (value) => [
      ResizableTailwindHtml.ResizablePanel({ defaultSize: 50, children: value }),
      ResizableTailwindHtml.ResizableHandle({}),
      ResizableTailwindHtml.ResizablePanel({ defaultSize: 50, children: value }),
    ],
  },
];

/** Superset prop bag across Resizable parts (mirrors the emitted part props). */
export interface ResizablePartVariantProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  withHandle?: boolean;
  disabled?: boolean;
  children?: HellaChildren;
  class?: string;
}

/** The named Resizable parts (every export except the default ResizablePanelGroup). */
export const RESIZABLE_PARTS = ["Panel", "Handle"] as const;

/**
 * Every compiled Resizable part (ResizablePanel, ResizableHandle) at every flavor.
 */
export const resizablePartVariants: PartVariant<ResizablePartVariantProps>[] = RESIZABLE_PARTS.flatMap((part) =>
  partVariants(part, "Resizable", [
    [ResizableCssJsx as unknown as AnyModule, "css", "jsx"],
    [ResizableCssHtml as unknown as AnyModule, "css", "html"],
    [ResizableTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ResizableTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as TooltipCssJsx from "../../dist/registry/tooltip/css/tooltip";
import * as TooltipCssHtml from "../../dist/registry/tooltip/css/tooltip-html";
import * as TooltipTailwindJsx from "../../dist/registry/tooltip/tailwind/tooltip";
import * as TooltipTailwindHtml from "../../dist/registry/tooltip/tailwind/tooltip-html";
import * as HoverCardCssJsx from "../../dist/registry/hover-card/css/hover-card";
import * as HoverCardCssHtml from "../../dist/registry/hover-card/css/hover-card-html";
import * as HoverCardTailwindJsx from "../../dist/registry/hover-card/tailwind/hover-card";
import * as HoverCardTailwindHtml from "../../dist/registry/hover-card/tailwind/hover-card-html";
import * as PopoverCssJsx from "../../dist/registry/popover/css/popover";
import * as PopoverCssHtml from "../../dist/registry/popover/css/popover-html";
import * as PopoverTailwindJsx from "../../dist/registry/popover/tailwind/popover";
import * as PopoverTailwindHtml from "../../dist/registry/popover/tailwind/popover-html";

/** Anchored-overlay side/align unions shared by the tooltip/hover-card/popover prop bags (mirrors the emitted unions). */
export type AnchoredSide = "top" | "bottom" | "left" | "right";
export type AnchoredAlign = "start" | "center" | "end";

/** Prop bag shared by every compiled Tooltip variant (mirrors the emitted TooltipProps). */
export interface TooltipVariantProps {
  content: HellaChildren;
  delayDuration?: number;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Tooltip parts (mirrors the emitted part props). */
export interface TooltipPartVariantProps {
  state?: () => "open" | "closed";
  id?: string;
  describedBy?: string;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  class?: string;
}

/** The named Tooltip parts (every export except the default Tooltip). */
export const TOOLTIP_PARTS = ["Provider", "Trigger", "Content"] as const;

/**
 * Every compiled Tooltip variant (the default export) from dist/registry.
 * Tooltip's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const tooltipVariants: ComponentVariant<TooltipVariantProps>[] = [
  { style: "css", format: "jsx", render: (TooltipCssJsx as unknown as AnyModule).default as unknown as (props: TooltipVariantProps) => HellaNode },
  { style: "css", format: "html", render: (TooltipCssHtml as unknown as AnyModule).default as unknown as (props: TooltipVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (TooltipTailwindJsx as unknown as AnyModule).default as unknown as (props: TooltipVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (TooltipTailwindHtml as unknown as AnyModule).default as unknown as (props: TooltipVariantProps) => HellaNode },
];

/**
 * Every compiled Tooltip part (TooltipProvider, TooltipTrigger, TooltipContent) at every flavor.
 */
export const tooltipPartVariants: PartVariant<TooltipPartVariantProps>[] = TOOLTIP_PARTS.flatMap((part) =>
  partVariants(part, "Tooltip", [
    [TooltipCssJsx as unknown as AnyModule, "css", "jsx"],
    [TooltipCssHtml as unknown as AnyModule, "css", "html"],
    [TooltipTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [TooltipTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled HoverCard variant (mirrors the emitted HoverCardProps). */
export interface HoverCardVariantProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

/** Superset prop bag across HoverCard parts (mirrors the emitted part props). */
export interface HoverCardPartVariantProps {
  state?: () => "open" | "closed";
  side?: AnchoredSide;
  align?: AnchoredAlign;
  anchor?: () => Element | undefined;
  onOpen?: () => void;
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named HoverCard parts (every export except the default HoverCard). */
export const HOVER_CARD_PARTS = ["Trigger", "Content"] as const;

/**
 * Every compiled HoverCard variant (the default export) from dist/registry.
 * HoverCard's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const hoverCardVariants: ComponentVariant<HoverCardVariantProps>[] = [
  { style: "css", format: "jsx", render: (HoverCardCssJsx as unknown as AnyModule).default as unknown as (props: HoverCardVariantProps) => HellaNode },
  { style: "css", format: "html", render: (HoverCardCssHtml as unknown as AnyModule).default as unknown as (props: HoverCardVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (HoverCardTailwindJsx as unknown as AnyModule).default as unknown as (props: HoverCardVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (HoverCardTailwindHtml as unknown as AnyModule).default as unknown as (props: HoverCardVariantProps) => HellaNode },
];

/**
 * Every compiled HoverCard part (HoverCardTrigger, HoverCardContent) at every flavor.
 */
export const hoverCardPartVariants: PartVariant<HoverCardPartVariantProps>[] = HOVER_CARD_PARTS.flatMap((part) =>
  partVariants(part, "HoverCard", [
    [HoverCardCssJsx as unknown as AnyModule, "css", "jsx"],
    [HoverCardCssHtml as unknown as AnyModule, "css", "html"],
    [HoverCardTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [HoverCardTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled Popover variant (mirrors the emitted PopoverProps). */
export interface PopoverVariantProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

/** Superset prop bag across Popover parts (mirrors the emitted part props). */
export interface PopoverPartVariantProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  alignOffset?: number;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named Popover parts (every export except the default Popover). */
export const POPOVER_PARTS = ["Anchor", "Trigger", "Content", "Header", "Title", "Description"] as const;

/**
 * Every compiled Popover variant (the default export) from dist/registry.
 * Popover's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const popoverVariants: ComponentVariant<PopoverVariantProps>[] = [
  { style: "css", format: "jsx", render: (PopoverCssJsx as unknown as AnyModule).default as unknown as (props: PopoverVariantProps) => HellaNode },
  { style: "css", format: "html", render: (PopoverCssHtml as unknown as AnyModule).default as unknown as (props: PopoverVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (PopoverTailwindJsx as unknown as AnyModule).default as unknown as (props: PopoverVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (PopoverTailwindHtml as unknown as AnyModule).default as unknown as (props: PopoverVariantProps) => HellaNode },
];

/**
 * Every compiled Popover part (PopoverAnchor…PopoverDescription) at every flavor.
 */
export const popoverPartVariants: PartVariant<PopoverPartVariantProps>[] = POPOVER_PARTS.flatMap((part) =>
  partVariants(part, "Popover", [
    [PopoverCssJsx as unknown as AnyModule, "css", "jsx"],
    [PopoverCssHtml as unknown as AnyModule, "css", "html"],
    [PopoverTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [PopoverTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as DropdownMenuCssJsx from "../../dist/registry/dropdown-menu/css/dropdown-menu";
import * as DropdownMenuCssHtml from "../../dist/registry/dropdown-menu/css/dropdown-menu-html";
import * as DropdownMenuTailwindJsx from "../../dist/registry/dropdown-menu/tailwind/dropdown-menu";
import * as DropdownMenuTailwindHtml from "../../dist/registry/dropdown-menu/tailwind/dropdown-menu-html";
import * as ContextMenuCssJsx from "../../dist/registry/context-menu/css/context-menu";
import * as ContextMenuCssHtml from "../../dist/registry/context-menu/css/context-menu-html";
import * as ContextMenuTailwindJsx from "../../dist/registry/context-menu/tailwind/context-menu";
import * as ContextMenuTailwindHtml from "../../dist/registry/context-menu/tailwind/context-menu-html";

/** Module table backing one menu component: [style][format] resolves the compiled namespace, so tests compose content trees from the same flavor as the root. */
export interface MenuModuleTable {
  css: Record<UiFormat, AnyModule>;
  tailwind: Record<UiFormat, AnyModule>;
}

/** Resolves one named part function (FULL export name, e.g. "DropdownMenuItem") from the module table at a variant's flavor. */
export function menuModulePart<P extends object>(modules: MenuModuleTable, variant: { style: UiStyle; format: UiFormat }, name: string): (props: P) => HellaNode {
  return (modules[variant.style][variant.format][name] as unknown as (props: P) => HellaNode);
}

/** Item shape of every compiled menu RadioGroup variant (mirrors the emitted RadioGroupEntry). */
export interface MenuRadioEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled DropdownMenu variant (mirrors the emitted DropdownMenuProps). */
export interface DropdownMenuVariantProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Superset prop bag across DropdownMenu parts (mirrors the emitted part props). */
export interface DropdownMenuPartVariantProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  alignOffset?: number;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  onExited?: () => void;
  onArrowLeft?: () => void;
  onPointerEnter?: () => void;
  onOpen?: () => void;
  inset?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onclick?: () => void;
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[];
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** The named DropdownMenu parts (every export except the default DropdownMenu). */
export const DROPDOWN_MENU_PARTS = ["Trigger", "Content", "Group", "Item", "CheckboxItem", "RadioGroup", "RadioItem", "Label", "Separator", "Shortcut", "Sub", "SubTrigger", "SubContent"] as const;

/** Compiled DropdownMenu module table, keyed [style][format]. */
export const dropdownMenuModules: MenuModuleTable = {
  css: { jsx: DropdownMenuCssJsx as unknown as AnyModule, html: DropdownMenuCssHtml as unknown as AnyModule },
  tailwind: { jsx: DropdownMenuTailwindJsx as unknown as AnyModule, html: DropdownMenuTailwindHtml as unknown as AnyModule },
};

/**
 * Every compiled DropdownMenu variant (the default export) from dist/registry.
 * DropdownMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const dropdownMenuVariants: ComponentVariant<DropdownMenuVariantProps>[] = [
  { style: "css", format: "jsx", render: (DropdownMenuCssJsx as unknown as AnyModule).default as unknown as (props: DropdownMenuVariantProps) => HellaNode },
  { style: "css", format: "html", render: (DropdownMenuCssHtml as unknown as AnyModule).default as unknown as (props: DropdownMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (DropdownMenuTailwindJsx as unknown as AnyModule).default as unknown as (props: DropdownMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (DropdownMenuTailwindHtml as unknown as AnyModule).default as unknown as (props: DropdownMenuVariantProps) => HellaNode },
];

/**
 * Every compiled DropdownMenu part (DropdownMenuTrigger…DropdownMenuSubContent) at every flavor.
 */
export const dropdownMenuPartVariants: PartVariant<DropdownMenuPartVariantProps>[] = DROPDOWN_MENU_PARTS.flatMap((part) =>
  partVariants(part, "DropdownMenu", [
    [DropdownMenuCssJsx as unknown as AnyModule, "css", "jsx"],
    [DropdownMenuCssHtml as unknown as AnyModule, "css", "html"],
    [DropdownMenuTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [DropdownMenuTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Prop bag shared by every compiled ContextMenu variant (mirrors the emitted ContextMenuProps). */
export interface ContextMenuVariantProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Superset prop bag across ContextMenu parts (mirrors the emitted part props). */
export interface ContextMenuPartVariantProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  onExited?: () => void;
  onArrowLeft?: () => void;
  onPointerEnter?: () => void;
  onOpen?: () => void;
  inset?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onclick?: () => void;
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[];
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** The named ContextMenu parts (every export except the default ContextMenu). */
export const CONTEXT_MENU_PARTS = ["Trigger", "Content", "Group", "Item", "CheckboxItem", "RadioGroup", "RadioItem", "Label", "Separator", "Shortcut", "Sub", "SubTrigger", "SubContent"] as const;

/** Compiled ContextMenu module table, keyed [style][format]. */
export const contextMenuModules: MenuModuleTable = {
  css: { jsx: ContextMenuCssJsx as unknown as AnyModule, html: ContextMenuCssHtml as unknown as AnyModule },
  tailwind: { jsx: ContextMenuTailwindJsx as unknown as AnyModule, html: ContextMenuTailwindHtml as unknown as AnyModule },
};

/**
 * Every compiled ContextMenu variant (the default export) from dist/registry.
 * ContextMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const contextMenuVariants: ComponentVariant<ContextMenuVariantProps>[] = [
  { style: "css", format: "jsx", render: (ContextMenuCssJsx as unknown as AnyModule).default as unknown as (props: ContextMenuVariantProps) => HellaNode },
  { style: "css", format: "html", render: (ContextMenuCssHtml as unknown as AnyModule).default as unknown as (props: ContextMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (ContextMenuTailwindJsx as unknown as AnyModule).default as unknown as (props: ContextMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (ContextMenuTailwindHtml as unknown as AnyModule).default as unknown as (props: ContextMenuVariantProps) => HellaNode },
];

/**
 * Every compiled ContextMenu part (ContextMenuTrigger…ContextMenuSubContent) at every flavor.
 */
export const contextMenuPartVariants: PartVariant<ContextMenuPartVariantProps>[] = CONTEXT_MENU_PARTS.flatMap((part) =>
  partVariants(part, "ContextMenu", [
    [ContextMenuCssJsx as unknown as AnyModule, "css", "jsx"],
    [ContextMenuCssHtml as unknown as AnyModule, "css", "html"],
    [ContextMenuTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ContextMenuTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as MenubarCssJsx from "../../dist/registry/menubar/css/menubar";
import * as MenubarCssHtml from "../../dist/registry/menubar/css/menubar-html";
import * as MenubarTailwindJsx from "../../dist/registry/menubar/tailwind/menubar";
import * as MenubarTailwindHtml from "../../dist/registry/menubar/tailwind/menubar-html";

/** Prop bag shared by every compiled Menubar variant (mirrors the emitted MenubarProps). */
export interface MenubarVariantProps {
  value?: () => string;
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Menubar parts (mirrors the emitted part props). */
export interface MenubarPartVariantProps {
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  alignOffset?: number;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  onExited?: () => void;
  onArrow?: (direction: "left" | "right") => void;
  onArrowLeft?: () => void;
  onPointerEnter?: () => void;
  onOpen?: () => void;
  inset?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onclick?: () => void;
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[];
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** The named Menubar parts (every export except the default Menubar). */
export const MENUBAR_PARTS = ["Menu", "Trigger", "Group", "Content", "Item", "CheckboxItem", "RadioGroup", "RadioItem", "Label", "Separator", "Shortcut", "Sub", "SubTrigger", "SubContent"] as const;

/** Compiled Menubar module table, keyed [style][format]. */
export const menubarModules: MenuModuleTable = {
  css: { jsx: MenubarCssJsx as unknown as AnyModule, html: MenubarCssHtml as unknown as AnyModule },
  tailwind: { jsx: MenubarTailwindJsx as unknown as AnyModule, html: MenubarTailwindHtml as unknown as AnyModule },
};

/**
 * Every compiled Menubar variant (the default export) from dist/registry.
 * Menubar's content portals into document.body on open, so the suites
 * render the bar and resolve content through the helpers/anchored pollers.
 */
export const menubarVariants: ComponentVariant<MenubarVariantProps>[] = [
  { style: "css", format: "jsx", render: (MenubarCssJsx as unknown as AnyModule).default as unknown as (props: MenubarVariantProps) => HellaNode },
  { style: "css", format: "html", render: (MenubarCssHtml as unknown as AnyModule).default as unknown as (props: MenubarVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (MenubarTailwindJsx as unknown as AnyModule).default as unknown as (props: MenubarVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (MenubarTailwindHtml as unknown as AnyModule).default as unknown as (props: MenubarVariantProps) => HellaNode },
];

/**
 * Every compiled Menubar part (MenubarMenu…MenubarSubContent) at every flavor.
 */
export const menubarPartVariants: PartVariant<MenubarPartVariantProps>[] = MENUBAR_PARTS.flatMap((part) =>
  partVariants(part, "Menubar", [
    [MenubarCssJsx as unknown as AnyModule, "css", "jsx"],
    [MenubarCssHtml as unknown as AnyModule, "css", "html"],
    [MenubarTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [MenubarTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as NavigationMenuCssJsx from "../../dist/registry/navigation-menu/css/navigation-menu";
import * as NavigationMenuCssHtml from "../../dist/registry/navigation-menu/css/navigation-menu-html";
import * as NavigationMenuTailwindJsx from "../../dist/registry/navigation-menu/tailwind/navigation-menu";
import * as NavigationMenuTailwindHtml from "../../dist/registry/navigation-menu/tailwind/navigation-menu-html";

/** Prop bag shared by every compiled NavigationMenu variant (mirrors the emitted NavigationMenuProps). */
export interface NavigationMenuVariantProps {
  value?: () => string;
  onValueChange?: (value: string) => void;
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across NavigationMenu parts (mirrors the emitted part props). */
export interface NavigationMenuPartVariantProps {
  value?: string;
  active?: boolean | (() => boolean);
  onActivate?: () => void;
  viewport?: string;
  onExited?: () => void;
  anchor?: () => Element | undefined;
  id?: string;
  href?: string;
  children?: HellaChildren;
  class?: string;
}

/** The named NavigationMenu parts (every export except the default NavigationMenu). */
export const NAVIGATION_MENU_PARTS = ["List", "Item", "Trigger", "Content", "Link", "Viewport", "Indicator"] as const;

/**
 * Every compiled NavigationMenu variant (the default export) from dist/registry.
 * The composed root appends the shared viewport slot its contents portal into.
 */
export const navigationMenuVariants: ComponentVariant<NavigationMenuVariantProps>[] = [
  { style: "css", format: "jsx", render: (NavigationMenuCssJsx as unknown as AnyModule).default as unknown as (props: NavigationMenuVariantProps) => HellaNode },
  { style: "css", format: "html", render: (NavigationMenuCssHtml as unknown as AnyModule).default as unknown as (props: NavigationMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (NavigationMenuTailwindJsx as unknown as AnyModule).default as unknown as (props: NavigationMenuVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (NavigationMenuTailwindHtml as unknown as AnyModule).default as unknown as (props: NavigationMenuVariantProps) => HellaNode },
];

/**
 * Every compiled NavigationMenu part (NavigationMenuList…NavigationMenuIndicator) at every flavor.
 */
export const navigationMenuPartVariants: PartVariant<NavigationMenuPartVariantProps>[] = NAVIGATION_MENU_PARTS.flatMap((part) =>
  partVariants(part, "NavigationMenu", [
    [NavigationMenuCssJsx as unknown as AnyModule, "css", "jsx"],
    [NavigationMenuCssHtml as unknown as AnyModule, "css", "html"],
    [NavigationMenuTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [NavigationMenuTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as BreadcrumbCssJsx from "../../dist/registry/breadcrumb/css/breadcrumb";
import * as BreadcrumbCssHtml from "../../dist/registry/breadcrumb/css/breadcrumb-html";
import * as BreadcrumbTailwindJsx from "../../dist/registry/breadcrumb/tailwind/breadcrumb";
import * as BreadcrumbTailwindHtml from "../../dist/registry/breadcrumb/tailwind/breadcrumb-html";

/** Prop bag shared by every compiled Breadcrumb variant (mirrors the emitted BreadcrumbProps). */
export interface BreadcrumbVariantProps {
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Breadcrumb parts (mirrors the emitted part props). */
export interface BreadcrumbPartVariantProps {
  children?: HellaChildren;
  href?: string;
  class?: string;
}

/** The named Breadcrumb parts (every export except the default Breadcrumb). */
export const BREADCRUMB_PARTS = ["List", "Item", "Link", "Page", "Separator", "Ellipsis"] as const;

/**
 * Every compiled Breadcrumb variant (the default export) from dist/registry.
 */
export const breadcrumbVariants: ComponentVariant<BreadcrumbVariantProps>[] = [
  { style: "css", format: "jsx", render: (BreadcrumbCssJsx as unknown as AnyModule).default as unknown as (props: BreadcrumbVariantProps) => HellaNode },
  { style: "css", format: "html", render: (BreadcrumbCssHtml as unknown as AnyModule).default as unknown as (props: BreadcrumbVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (BreadcrumbTailwindJsx as unknown as AnyModule).default as unknown as (props: BreadcrumbVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (BreadcrumbTailwindHtml as unknown as AnyModule).default as unknown as (props: BreadcrumbVariantProps) => HellaNode },
];

/**
 * Every compiled Breadcrumb part (BreadcrumbList…BreadcrumbEllipsis) at every flavor.
 */
export const breadcrumbPartVariants: PartVariant<BreadcrumbPartVariantProps>[] = BREADCRUMB_PARTS.flatMap((part) =>
  partVariants(part, "Breadcrumb", [
    [BreadcrumbCssJsx as unknown as AnyModule, "css", "jsx"],
    [BreadcrumbCssHtml as unknown as AnyModule, "css", "html"],
    [BreadcrumbTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [BreadcrumbTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as SelectCssJsx from "../../dist/registry/select/css/select";
import * as SelectCssHtml from "../../dist/registry/select/css/select-html";
import * as SelectTailwindJsx from "../../dist/registry/select/tailwind/select";
import * as SelectTailwindHtml from "../../dist/registry/select/tailwind/select-html";
import * as ComboboxCssJsx from "../../dist/registry/combobox/css/combobox";
import * as ComboboxCssHtml from "../../dist/registry/combobox/css/combobox-html";
import * as ComboboxTailwindJsx from "../../dist/registry/combobox/tailwind/combobox";
import * as ComboboxTailwindHtml from "../../dist/registry/combobox/tailwind/combobox-html";

/** Item shape of every compiled Select variant (mirrors the emitted SelectEntry). */
export interface SelectEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Select variant (mirrors the emitted SelectProps). */
export interface SelectVariantProps {
  items?: SelectEntryVariant[];
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  clearable?: boolean;
  class?: string;
}

/** Superset prop bag across Select parts (mirrors the emitted part props). */
export interface SelectPartVariantProps {
  id?: string;
  ariaControls?: string;
  ariaLabel?: string;
  size?: "sm" | "default";
  state?: () => "open" | "closed";
  onOpen?: () => void;
  clearable?: boolean;
  onClear?: () => void;
  hasValue?: () => boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: HellaChildren | (() => HellaChildren | undefined);
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  onExited?: () => void;
  onClose?: () => void;
  selected?: boolean | (() => boolean);
  onselect?: () => void;
  label?: HellaChildren;
  children?: HellaChildren;
  class?: string;
}

/** The named Select parts (every export except the default Select). */
export const SELECT_PARTS = ["Trigger", "Value", "Content", "Group", "Item", "Label", "Separator", "ScrollUpButton", "ScrollDownButton"] as const;

/** Compiled Select module table, keyed [style][format]. */
export const selectModules: MenuModuleTable = {
  css: { jsx: SelectCssJsx as unknown as AnyModule, html: SelectCssHtml as unknown as AnyModule },
  tailwind: { jsx: SelectTailwindJsx as unknown as AnyModule, html: SelectTailwindHtml as unknown as AnyModule },
};

/**
 * Every compiled Select variant (the default export) from dist/registry.
 * Select's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const selectVariants: ComponentVariant<SelectVariantProps>[] = [
  { style: "css", format: "jsx", render: (SelectCssJsx as unknown as AnyModule).default as unknown as (props: SelectVariantProps) => HellaNode },
  { style: "css", format: "html", render: (SelectCssHtml as unknown as AnyModule).default as unknown as (props: SelectVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (SelectTailwindJsx as unknown as AnyModule).default as unknown as (props: SelectVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (SelectTailwindHtml as unknown as AnyModule).default as unknown as (props: SelectVariantProps) => HellaNode },
];

/**
 * Every compiled Select part (SelectTrigger…SelectScrollDownButton) at every flavor.
 */
export const selectPartVariants: PartVariant<SelectPartVariantProps>[] = SELECT_PARTS.flatMap((part) =>
  partVariants(part, "Select", [
    [SelectCssJsx as unknown as AnyModule, "css", "jsx"],
    [SelectCssHtml as unknown as AnyModule, "css", "html"],
    [SelectTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [SelectTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** Item shape of every compiled Combobox variant (mirrors the emitted ComboboxEntry). */
export interface ComboboxEntryVariant {
  value: string;
  label?: string;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Combobox variant (mirrors the emitted ComboboxProps). */
export interface ComboboxVariantProps {
  items?: ComboboxEntryVariant[];
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  filter?: (items: ComboboxEntryVariant[], query: string) => ComboboxEntryVariant[];
  showClear?: boolean;
  class?: string;
}

/** Superset prop bag across Combobox parts (mirrors the emitted part props). */
export interface ComboboxPartVariantProps {
  id?: string;
  value?: string | string[] | (() => string | string[] | undefined);
  placeholder?: string;
  disabled?: boolean;
  onInput?: (value: string) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  onFocus?: () => void;
  state?: () => "open" | "closed";
  ariaControls?: string;
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  hasValue?: () => boolean;
  wire?: (node: HTMLElement) => () => void;
  portal?: () => HellaChildren;
  onclick?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  selected?: boolean | (() => boolean) | ((value: string) => boolean);
  highlighted?: boolean | (() => boolean);
  hidden?: () => boolean;
  onselect?: (value?: string) => void;
  query?: () => string;
  filter?: (items: ComboboxEntryVariant[], query: string) => ComboboxEntryVariant[];
  empty?: () => boolean;
  active?: () => string | undefined;
  items?: ComboboxEntryVariant[];
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  anchor?: () => Element | undefined;
  chips?: boolean;
  onDismiss?: () => void;
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named Combobox parts (every export except the default Combobox). */
export const COMBOBOX_PARTS = ["Value", "Trigger", "Clear", "Group", "Label", "Collection", "Empty", "Separator", "Item", "List", "Input", "Chips", "Chip", "ChipsInput", "Content"] as const;

/** Compiled Combobox module table, keyed [style][format]. */
export const comboboxModules: MenuModuleTable = {
  css: { jsx: ComboboxCssJsx as unknown as AnyModule, html: ComboboxCssHtml as unknown as AnyModule },
  tailwind: { jsx: ComboboxTailwindJsx as unknown as AnyModule, html: ComboboxTailwindHtml as unknown as AnyModule },
};

/**
 * Every compiled Combobox variant (the default export) from dist/registry.
 * Combobox's content portals into document.body on open, so the suites
 * render the wrapper root and resolve content through the helpers/anchored pollers.
 */
export const comboboxVariants: ComponentVariant<ComboboxVariantProps>[] = [
  { style: "css", format: "jsx", render: (ComboboxCssJsx as unknown as AnyModule).default as unknown as (props: ComboboxVariantProps) => HellaNode },
  { style: "css", format: "html", render: (ComboboxCssHtml as unknown as AnyModule).default as unknown as (props: ComboboxVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (ComboboxTailwindJsx as unknown as AnyModule).default as unknown as (props: ComboboxVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (ComboboxTailwindHtml as unknown as AnyModule).default as unknown as (props: ComboboxVariantProps) => HellaNode },
];

/**
 * Every compiled Combobox part (ComboboxValue…ComboboxContent) at every flavor.
 */
export const comboboxPartVariants: PartVariant<ComboboxPartVariantProps>[] = COMBOBOX_PARTS.flatMap((part) =>
  partVariants(part, "Combobox", [
    [ComboboxCssJsx as unknown as AnyModule, "css", "jsx"],
    [ComboboxCssHtml as unknown as AnyModule, "css", "html"],
    [ComboboxTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [ComboboxTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as CommandCssJsx from "../../dist/registry/command/css/command";
import * as CommandCssHtml from "../../dist/registry/command/css/command-html";
import * as CommandTailwindJsx from "../../dist/registry/command/tailwind/command";
import * as CommandTailwindHtml from "../../dist/registry/command/tailwind/command-html";

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
export interface CommandVariantProps {
  items?: CommandItemDataVariant[];
  filter?: (items: CommandItemDataVariant[], query: string) => CommandItemDataVariant[];
  loop?: boolean;
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
  children?: HellaChildren;
}

/** Superset prop bag across Command parts (mirrors the emitted part props). */
export interface CommandPartVariantProps {
  value?: string | (() => string);
  placeholder?: string;
  onInput?: (value: string) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  heading?: string;
  hidden?: boolean | (() => boolean);
  disabled?: boolean;
  active?: () => boolean;
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
  open?: () => boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
}

/** The named Command parts (every export except the default Command). */
export const COMMAND_PARTS = ["Input", "List", "Empty", "Group", "Separator", "Item", "Shortcut", "Dialog"] as const;

/**
 * Every compiled Command variant (the default export) from dist/registry.
 */
export const commandVariants: ComponentVariant<CommandVariantProps>[] = [
  { style: "css", format: "jsx", render: (CommandCssJsx as unknown as AnyModule).default as unknown as (props: CommandVariantProps) => HellaNode },
  { style: "css", format: "html", render: (CommandCssHtml as unknown as AnyModule).default as unknown as (props: CommandVariantProps) => HellaNode },
  { style: "tailwind", format: "jsx", render: (CommandTailwindJsx as unknown as AnyModule).default as unknown as (props: CommandVariantProps) => HellaNode },
  { style: "tailwind", format: "html", render: (CommandTailwindHtml as unknown as AnyModule).default as unknown as (props: CommandVariantProps) => HellaNode },
];

/**
 * Every compiled Command part (CommandInput…CommandDialog) at every flavor.
 */
export const commandPartVariants: PartVariant<CommandPartVariantProps>[] = COMMAND_PARTS.flatMap((part) =>
  partVariants(part, "Command", [
    [CommandCssJsx as unknown as AnyModule, "css", "jsx"],
    [CommandCssHtml as unknown as AnyModule, "css", "html"],
    [CommandTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [CommandTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import AlertDialogCssDefault from "../../dist/registry/alert-dialog/css/alert-dialog";
import AlertDialogCssHtmlDefault from "../../dist/registry/alert-dialog/css/alert-dialog-html";
import AlertDialogTailwindDefault from "../../dist/registry/alert-dialog/tailwind/alert-dialog";
import AlertDialogTailwindHtmlDefault from "../../dist/registry/alert-dialog/tailwind/alert-dialog-html";
import * as AlertDialogCssJsx from "../../dist/registry/alert-dialog/css/alert-dialog";
import * as AlertDialogCssHtml from "../../dist/registry/alert-dialog/css/alert-dialog-html";
import * as AlertDialogTailwindJsx from "../../dist/registry/alert-dialog/tailwind/alert-dialog";
import * as AlertDialogTailwindHtml from "../../dist/registry/alert-dialog/tailwind/alert-dialog-html";
import SheetCssDefault from "../../dist/registry/sheet/css/sheet";
import SheetCssHtmlDefault from "../../dist/registry/sheet/css/sheet-html";
import SheetTailwindDefault from "../../dist/registry/sheet/tailwind/sheet";
import SheetTailwindHtmlDefault from "../../dist/registry/sheet/tailwind/sheet-html";
import * as SheetCssJsx from "../../dist/registry/sheet/css/sheet";
import * as SheetCssHtml from "../../dist/registry/sheet/css/sheet-html";
import * as SheetTailwindJsx from "../../dist/registry/sheet/tailwind/sheet";
import * as SheetTailwindHtml from "../../dist/registry/sheet/tailwind/sheet-html";
import DrawerCssDefault from "../../dist/registry/drawer/css/drawer";
import DrawerCssHtmlDefault from "../../dist/registry/drawer/css/drawer-html";
import DrawerTailwindDefault from "../../dist/registry/drawer/tailwind/drawer";
import DrawerTailwindHtmlDefault from "../../dist/registry/drawer/tailwind/drawer-html";
import * as DrawerCssJsx from "../../dist/registry/drawer/css/drawer";
import * as DrawerCssHtml from "../../dist/registry/drawer/css/drawer-html";
import * as DrawerTailwindJsx from "../../dist/registry/drawer/tailwind/drawer";
import * as DrawerTailwindHtml from "../../dist/registry/drawer/tailwind/drawer-html";

/** Prop bag shared by every compiled AlertDialog variant (mirrors the emitted AlertDialogProps). */
export interface AlertDialogVariantProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "default" | "sm";
  closeOnEscape?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}

/** Prop bag shared by every compiled Sheet variant (mirrors the emitted SheetProps). */
export interface SheetVariantProps {
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

/** Prop bag shared by every compiled Drawer variant (mirrors the emitted DrawerProps). */
export interface DrawerVariantProps {
  open: () => boolean;
  onClose: () => void;
  direction?: "top" | "right" | "bottom" | "left";
  title?: string;
  description?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}

/** Superset prop bag across AlertDialog parts (mirrors the emitted part props). */
export interface AlertDialogPartVariantProps {
  children?: HellaChildren;
  class?: string;
  state?: () => "open" | "closed";
  id?: string;
  labelledBy?: string;
  describedBy?: string;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  closeOnEscape?: boolean;
  onClose?: () => void;
  onExited?: () => void;
}

/** Superset prop bag across Sheet parts (mirrors the emitted part props). */
export interface SheetPartVariantProps extends Omit<AlertDialogPartVariantProps, "size"> {
  side?: "top" | "right" | "bottom" | "left";
  fraction?: () => number;
  showCloseButton?: boolean;
  closeOnOutside?: boolean;
}

/** Superset prop bag across Drawer parts (mirrors the emitted part props). */
export interface DrawerPartVariantProps extends Omit<AlertDialogPartVariantProps, "size"> {
  direction?: "top" | "right" | "bottom" | "left";
  fraction?: () => number;
  showCloseButton?: boolean;
  closeOnOutside?: boolean;
}

/** The named AlertDialog parts (every export except the default AlertDialog). */
export const ALERT_DIALOG_PARTS = ["Trigger", "Portal", "Overlay", "Content", "Header", "Footer", "Title", "Description", "Media", "Action", "Cancel"] as const;

/** The named Sheet parts (every export except the default Sheet). */
export const SHEET_PARTS = ["Trigger", "Close", "Portal", "Overlay", "Content", "Header", "Footer", "Title", "Description"] as const;

/** The named Drawer parts (every export except the default Drawer). */
export const DRAWER_PARTS = ["Trigger", "Close", "Portal", "Overlay", "Content", "Header", "Footer", "Title", "Description"] as const;

/** One compiled AlertDialog flavor (the default export). */
export type AlertDialogVariant = ChildrenVariant<AlertDialogVariantProps>;

/** One compiled Sheet flavor (the default export). */
export type SheetVariant = ChildrenVariant<SheetVariantProps>;

/** One compiled Drawer flavor (the default export). */
export type DrawerVariant = ChildrenVariant<DrawerVariantProps>;

/** The newest alert dialog panel portaled into document.body (role=alertdialog sorts after dialogs). */
function newestAlertDialogPanel(): Element | null {
  const panels = document.querySelectorAll('[role="alertdialog"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}

/** The newest sheet panel portaled into document.body. */
function newestSheetPanel(): Element | null {
  const panels = document.querySelectorAll('[data-slot="sheet-content"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}

/** The newest drawer panel portaled into document.body. */
function newestDrawerPanel(): Element | null {
  const panels = document.querySelectorAll('[data-slot="drawer-content"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}

/**
 * Every compiled AlertDialog variant (the default export) from dist/registry.
 * AlertDialog portals its panel into document.body, so `root` resolves the
 * newest alertdialog there instead of the mount container's first element child.
 */
export const alertDialogVariants: ChildrenVariant<AlertDialogVariantProps>[] = [
  { style: "css", format: "jsx", render: AlertDialogCssDefault, child: (value) => [value], root: newestAlertDialogPanel },
  { style: "css", format: "html", render: AlertDialogCssHtmlDefault, child: (value) => value, root: newestAlertDialogPanel },
  { style: "tailwind", format: "jsx", render: AlertDialogTailwindDefault, child: (value) => [value], root: newestAlertDialogPanel },
  { style: "tailwind", format: "html", render: AlertDialogTailwindHtmlDefault, child: (value) => value, root: newestAlertDialogPanel },
];

/**
 * Every compiled Sheet variant (the default export) from dist/registry.
 */
export const sheetVariants: ChildrenVariant<SheetVariantProps>[] = [
  { style: "css", format: "jsx", render: SheetCssDefault, child: (value) => [value], root: newestSheetPanel },
  { style: "css", format: "html", render: SheetCssHtmlDefault, child: (value) => value, root: newestSheetPanel },
  { style: "tailwind", format: "jsx", render: SheetTailwindDefault, child: (value) => [value], root: newestSheetPanel },
  { style: "tailwind", format: "html", render: SheetTailwindHtmlDefault, child: (value) => value, root: newestSheetPanel },
];

/**
 * Every compiled Drawer variant (the default export) from dist/registry.
 */
export const drawerVariants: ChildrenVariant<DrawerVariantProps>[] = [
  { style: "css", format: "jsx", render: DrawerCssDefault, child: (value) => [value], root: newestDrawerPanel },
  { style: "css", format: "html", render: DrawerCssHtmlDefault, child: (value) => value, root: newestDrawerPanel },
  { style: "tailwind", format: "jsx", render: DrawerTailwindDefault, child: (value) => [value], root: newestDrawerPanel },
  { style: "tailwind", format: "html", render: DrawerTailwindHtmlDefault, child: (value) => value, root: newestDrawerPanel },
];

/**
 * Every compiled AlertDialog part (AlertDialogTrigger…AlertDialogCancel) at every flavor.
 */
export const alertDialogPartVariants: PartVariant<AlertDialogPartVariantProps>[] = ALERT_DIALOG_PARTS.flatMap((part) =>
  partVariants(part, "AlertDialog", [
    [AlertDialogCssJsx as unknown as AnyModule, "css", "jsx"],
    [AlertDialogCssHtml as unknown as AnyModule, "css", "html"],
    [AlertDialogTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [AlertDialogTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Sheet part (SheetTrigger…SheetDescription) at every flavor.
 */
export const sheetPartVariants: PartVariant<SheetPartVariantProps>[] = SHEET_PARTS.flatMap((part) =>
  partVariants(part, "Sheet", [
    [SheetCssJsx as unknown as AnyModule, "css", "jsx"],
    [SheetCssHtml as unknown as AnyModule, "css", "html"],
    [SheetTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [SheetTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/**
 * Every compiled Drawer part (DrawerTrigger…DrawerDescription) at every flavor.
 */
export const drawerPartVariants: PartVariant<DrawerPartVariantProps>[] = DRAWER_PARTS.flatMap((part) =>
  partVariants(part, "Drawer", [
    [DrawerCssJsx as unknown as AnyModule, "css", "jsx"],
    [DrawerCssHtml as unknown as AnyModule, "css", "html"],
    [DrawerTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [DrawerTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

import * as SonnerCss from "../../dist/registry/sonner/css/sonner";
import * as SonnerCssHtml from "../../dist/registry/sonner/css/sonner-html";
import * as SonnerTailwind from "../../dist/registry/sonner/tailwind/sonner";
import * as SonnerTailwindHtml from "../../dist/registry/sonner/tailwind/sonner-html";

/** Prop bag shared by every compiled Sonner variant (mirrors the emitted ToasterProps). */
export interface SonnerVariantProps {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  richColors?: boolean;
  class?: string;
}

/** The compiled module's toast queue API (per-flavor singleton). */
export type SonnerToastApi = typeof SonnerCss.toast;

/** The newest toaster ol portaled into document.body. */
function newestToaster(): Element | null {
  const toasters = document.querySelectorAll("[data-sonner-toaster]");
  return toasters.length === 0 ? null : toasters[toasters.length - 1]!;
}

/**
 * Every compiled Sonner flavor. `render` is the default Toaster export;
 * `toast` is the same compiled module's queue singleton, so each variant
 * drives its own store.
 */
export interface SonnerVariant extends ComponentVariant<SonnerVariantProps> {
  toast: SonnerToastApi;
  root: () => Element | null;
}

/**
 * Every compiled Sonner variant (the default Toaster) from dist/registry.
 */
export const sonnerVariants: SonnerVariant[] = [
  { style: "css", format: "jsx", render: SonnerCss.default, toast: SonnerCss.toast, root: newestToaster },
  { style: "css", format: "html", render: SonnerCssHtml.default, toast: SonnerCssHtml.toast, root: newestToaster },
  { style: "tailwind", format: "jsx", render: SonnerTailwind.default, toast: SonnerTailwind.toast, root: newestToaster },
  { style: "tailwind", format: "html", render: SonnerTailwindHtml.default, toast: SonnerTailwindHtml.toast, root: newestToaster },
];

import ScrollAreaCssDefault from "../../dist/registry/scroll-area/css/scroll-area";
import ScrollAreaCssHtmlDefault from "../../dist/registry/scroll-area/css/scroll-area-html";
import ScrollAreaTailwindDefault from "../../dist/registry/scroll-area/tailwind/scroll-area";
import ScrollAreaTailwindHtmlDefault from "../../dist/registry/scroll-area/tailwind/scroll-area-html";
import * as ScrollAreaCssJsx from "../../dist/registry/scroll-area/css/scroll-area";
import * as ScrollAreaCssHtml from "../../dist/registry/scroll-area/css/scroll-area-html";
import * as ScrollAreaTailwindJsx from "../../dist/registry/scroll-area/tailwind/scroll-area";
import * as ScrollAreaTailwindHtml from "../../dist/registry/scroll-area/tailwind/scroll-area-html";

/** Prop bag shared by every compiled ScrollArea variant (mirrors the emitted ScrollAreaProps). */
export interface ScrollAreaVariantProps {
  children?: HellaChildren;
  observe?: ScrollerObserve;
  class?: string;
}

/** Prop bag shared by every compiled ScrollBar variant (mirrors the emitted ScrollBarProps). */
export interface ScrollBarVariantProps {
  orientation?: "vertical" | "horizontal";
  observe?: ScrollerObserve;
  class?: string;
}

/**
 * Every compiled ScrollArea variant (the default export) from dist/registry.
 */
export const scrollAreaVariants: ChildrenVariant<ScrollAreaVariantProps>[] = [
  { style: "css", format: "jsx", render: ScrollAreaCssDefault, child: (value) => [value] },
  { style: "css", format: "html", render: ScrollAreaCssHtmlDefault, child: (value) => value },
  { style: "tailwind", format: "jsx", render: ScrollAreaTailwindDefault, child: (value) => [value] },
  { style: "tailwind", format: "html", render: ScrollAreaTailwindHtmlDefault, child: (value) => value },
];

/**
 * Every compiled ScrollBar variant (the named part) from dist/registry.
 */
export const scrollBarVariants: ComponentVariant<ScrollBarVariantProps>[] = [
  { style: "css", format: "jsx", render: ScrollAreaCssJsx.ScrollBar },
  { style: "css", format: "html", render: ScrollAreaCssHtml.ScrollBar },
  { style: "tailwind", format: "jsx", render: ScrollAreaTailwindJsx.ScrollBar },
  { style: "tailwind", format: "html", render: ScrollAreaTailwindHtml.ScrollBar },
];

import CalendarCssDefault from "../../dist/registry/calendar/css/calendar";
import CalendarCssHtmlDefault from "../../dist/registry/calendar/css/calendar-html";
import CalendarTailwindDefault from "../../dist/registry/calendar/tailwind/calendar";
import CalendarTailwindHtmlDefault from "../../dist/registry/calendar/tailwind/calendar-html";
import * as CalendarCssJsx from "../../dist/registry/calendar/css/calendar";
import * as CalendarCssHtml from "../../dist/registry/calendar/css/calendar-html";
import * as CalendarTailwindJsx from "../../dist/registry/calendar/tailwind/calendar";
import * as CalendarTailwindHtml from "../../dist/registry/calendar/tailwind/calendar-html";

/** Prop bag shared by every compiled Calendar variant (mirrors the emitted CalendarProps). */
export interface CalendarVariantProps {
  mode?: "single" | "multiple" | "range";
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (selected: Date | Date[] | { from?: Date; to?: Date } | undefined) => void;
  month?: () => Date;
  onMonthChange?: (month: Date) => void;
  defaultMonth?: Date;
  disabled?: (date: Date) => boolean;
  showOutsideDays?: boolean;
  fixedWeeks?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hideNavigation?: boolean;
  classNames?: Partial<Record<string, string>>;
  class?: string;
}

/** Prop bag for the compiled CalendarDayButton part (mirrors the emitted props). */
export interface CalendarDayButtonVariantProps {
  day: Date;
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  disabled?: boolean | (() => boolean);
  focused?: boolean | (() => boolean);
  today?: boolean;
  class?: string;
}

/**
 * Every compiled Calendar variant (the default export) from dist/registry.
 * Calendar renders no children, so the suites carry no `child` wrapper.
 */
export const calendarVariants: ComponentVariant<CalendarVariantProps>[] = [
  { style: "css", format: "jsx", render: CalendarCssDefault },
  { style: "css", format: "html", render: CalendarCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: CalendarTailwindDefault },
  { style: "tailwind", format: "html", render: CalendarTailwindHtmlDefault },
];

/**
 * Every compiled CalendarDayButton part (the named export) from dist/registry.
 */
export const calendarDayButtonVariants: ComponentVariant<CalendarDayButtonVariantProps>[] = [
  { style: "css", format: "jsx", render: CalendarCssJsx.CalendarDayButton },
  { style: "css", format: "html", render: CalendarCssHtml.CalendarDayButton },
  { style: "tailwind", format: "jsx", render: CalendarTailwindJsx.CalendarDayButton },
  { style: "tailwind", format: "html", render: CalendarTailwindHtml.CalendarDayButton },
];

import InputOtpCssDefault from "../../dist/registry/input-otp/css/input-otp";
import InputOtpCssHtmlDefault from "../../dist/registry/input-otp/css/input-otp-html";
import InputOtpTailwindDefault from "../../dist/registry/input-otp/tailwind/input-otp";
import InputOtpTailwindHtmlDefault from "../../dist/registry/input-otp/tailwind/input-otp-html";
import * as InputOtpCssJsx from "../../dist/registry/input-otp/css/input-otp";
import * as InputOtpCssHtml from "../../dist/registry/input-otp/css/input-otp-html";
import * as InputOtpTailwindJsx from "../../dist/registry/input-otp/tailwind/input-otp";
import * as InputOtpTailwindHtml from "../../dist/registry/input-otp/tailwind/input-otp-html";

/** Prop bag shared by every compiled InputOTP variant (mirrors the emitted InputOTPProps). */
export interface InputOtpVariantProps {
  length?: number;
  value?: string | (() => string);
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  pattern?: RegExp;
  autoFocus?: boolean;
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

/**
 * Every compiled InputOTP variant (the default export) from dist/registry.
 * Children are the user-composed groups/slots, so the suites build them from
 * `inputOtpPartModules` per render.
 */
export const inputOtpVariants: ComponentVariant<InputOtpVariantProps>[] = [
  { style: "css", format: "jsx", render: InputOtpCssDefault },
  { style: "css", format: "html", render: InputOtpCssHtmlDefault },
  { style: "tailwind", format: "jsx", render: InputOtpTailwindDefault },
  { style: "tailwind", format: "html", render: InputOtpTailwindHtmlDefault },
];

/**
 * Every compiled InputOTP part module (InputOTPGroup, InputOTPSlot,
 * InputOTPSeparator) at every flavor, for composing children in the suites.
 */
export const inputOtpPartModules: AnyModule[] = [
  InputOtpCssJsx,
  InputOtpCssHtml,
  InputOtpTailwindJsx,
  InputOtpTailwindHtml,
];

import * as FormCssJsx from "../../dist/registry/form/css/form";
import * as FormCssHtml from "../../dist/registry/form/css/form-html";
import * as FormTailwindJsx from "../../dist/registry/form/tailwind/form";
import * as FormTailwindHtml from "../../dist/registry/form/tailwind/form-html";

/** Superset prop bag across Form parts (mirrors the emitted part props). */
export interface FormPartVariantProps {
  error?: boolean | (() => boolean);
  required?: boolean;
  for?: string;
  invalid?: boolean | (() => boolean);
  describedBy?: string;
  id?: string;
  errors?: string[] | (() => string[] | undefined);
  children?: HellaChildren;
  class?: string;
}

/** The named Form parts (every export beside the createForm controller). */
export const FORM_PARTS = ["Item", "Label", "Control", "Description", "Message"] as const;

/**
 * Every compiled Form part (FormItem…FormMessage) at every flavor.
 */
export const formPartVariants: PartVariant<FormPartVariantProps>[] = FORM_PARTS.flatMap((part) =>
  partVariants(part, "Form", [
    [FormCssJsx as unknown as AnyModule, "css", "jsx"],
    [FormCssHtml as unknown as AnyModule, "css", "html"],
    [FormTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [FormTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** One compiled Form flavor's signals controller, so controller tests exercise all four compiled modules. */
export interface FormApiVariant {
  style: UiStyle;
  format: UiFormat;
  createForm: typeof FormCssJsx.createForm;
}

/** Every compiled Form variant's createForm controller from dist/registry. */
export const formApiVariants: FormApiVariant[] = [
  { style: "css", format: "jsx", createForm: FormCssJsx.createForm },
  { style: "css", format: "html", createForm: FormCssHtml.createForm },
  { style: "tailwind", format: "jsx", createForm: FormTailwindJsx.createForm },
  { style: "tailwind", format: "html", createForm: FormTailwindHtml.createForm },
];

import * as SidebarCssJsx from "../../dist/registry/sidebar/css/sidebar";
import * as SidebarCssHtml from "../../dist/registry/sidebar/css/sidebar-html";
import * as SidebarTailwindJsx from "../../dist/registry/sidebar/tailwind/sidebar";
import * as SidebarTailwindHtml from "../../dist/registry/sidebar/tailwind/sidebar-html";

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
export interface SidebarVariantProps {
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
export interface SidebarMenuButtonVariantProps {
  active?: boolean;
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  open?: () => boolean;
  mobile?: () => boolean;
  type?: string;
  disabled?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

/** Superset prop bag across Sidebar parts (variant unions conflict between the Sidebar root and its button parts, so both are omitted). */
export type SidebarPartVariantProps = Omit<SidebarVariantProps, "variant"> & Omit<SidebarMenuButtonVariantProps, "variant"> & {
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
export const SIDEBAR_PARTS = ["Provider", "Trigger", "Rail", "Inset", "Input", "Header", "Footer", "Separator", "Content", "Group", "GroupLabel", "GroupAction", "GroupContent", "Menu", "MenuItem", "MenuButton", "MenuAction", "MenuBadge", "MenuSkeleton", "MenuSub", "MenuSubItem", "MenuSubButton"] as const;

/**
 * Every compiled Sidebar root flavor from dist/registry.
 */
export const sidebarVariants: ComponentVariant<SidebarVariantProps>[] = [
  { style: "css", format: "jsx", render: SidebarCssJsx.Sidebar, root: newestSidebarRoot },
  { style: "css", format: "html", render: SidebarCssHtml.Sidebar, root: newestSidebarRoot },
  { style: "tailwind", format: "jsx", render: SidebarTailwindJsx.Sidebar, root: newestSidebarRoot },
  { style: "tailwind", format: "html", render: SidebarTailwindHtml.Sidebar, root: newestSidebarRoot },
];

/**
 * Every compiled Sidebar part (SidebarProvider…SidebarMenuSubButton) at every flavor.
 */
export const sidebarPartVariants: PartVariant<SidebarPartVariantProps>[] = SIDEBAR_PARTS.flatMap((part) =>
  partVariants(part, "Sidebar", [
    [SidebarCssJsx as unknown as AnyModule, "css", "jsx"],
    [SidebarCssHtml as unknown as AnyModule, "css", "html"],
    [SidebarTailwindJsx as unknown as AnyModule, "tailwind", "jsx"],
    [SidebarTailwindHtml as unknown as AnyModule, "tailwind", "html"],
  ]),
);

/** The newest desktop sidebar root - sequential renders append fresh containers, so the last match is newest. */
function newestSidebarRoot(): Element | null {
  const roots = document.querySelectorAll('[data-slot="sidebar"]:not([data-mobile="true"])');
  return roots.length === 0 ? null : roots[roots.length - 1]!;
}

/** One compiled Sidebar module namespace - composition tests build same-flavor trees from these parts. */
export interface SidebarModuleVariant {
  style: UiStyle;
  format: UiFormat;
  mod: AnyModule;
}

/** Every compiled Sidebar module namespace from dist/registry. */
export const sidebarModuleVariants: SidebarModuleVariant[] = [
  { style: "css", format: "jsx", mod: SidebarCssJsx as unknown as AnyModule },
  { style: "css", format: "html", mod: SidebarCssHtml as unknown as AnyModule },
  { style: "tailwind", format: "jsx", mod: SidebarTailwindJsx as unknown as AnyModule },
  { style: "tailwind", format: "html", mod: SidebarTailwindHtml as unknown as AnyModule },
];

/** Resolves one same-flavor Sidebar part render fn with its prop bag typed. */
export function sidebarModulePart<P extends object>(variant: SidebarModuleVariant, name: string): (props: P) => HellaNode {
  return variant.mod[name] as unknown as (props: P) => HellaNode;
}
