import { expect } from "vite-plus/test";
import type { Mock } from "vite-plus/test";
import type { Signal } from "@hellajs/core";
import { delay, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components — and this
// harness's own babel-transformed JSX mounts — import the bare specifier, so the harness mount
// and a component's Portal must share one dom instance.
import { mount, peekState } from "@hellajs/dom";
import { Button as ButtonCssJsx } from "../../dist/registry/button/css/button";
import { Button as ButtonTailwindJsx } from "../../dist/registry/button/tailwind/button";
import { Input as InputCssJsx } from "../../dist/registry/input/css/input";
import { Input as InputTailwindJsx } from "../../dist/registry/input/tailwind/input";
import { Card as CardCssDefault } from "../../dist/registry/card/css/card";
import { Card as CardTailwindDefault } from "../../dist/registry/card/tailwind/card";
import * as CardCssJsx from "../../dist/registry/card/css/card";
import * as CardTailwindJsx from "../../dist/registry/card/tailwind/card";
import { Dialog as DialogCssDefault } from "../../dist/registry/dialog/css/dialog";
import { Dialog as DialogTailwindDefault } from "../../dist/registry/dialog/tailwind/dialog";
import * as DialogCssJsx from "../../dist/registry/dialog/css/dialog";
import * as DialogTailwindJsx from "../../dist/registry/dialog/tailwind/dialog";
import { Tabs as TabsCssDefault } from "../../dist/registry/tabs/css/tabs";
import { Tabs as TabsTailwindDefault } from "../../dist/registry/tabs/tailwind/tabs";
import * as TabsCssJsx from "../../dist/registry/tabs/css/tabs";
import * as TabsTailwindJsx from "../../dist/registry/tabs/tailwind/tabs";
import { Badge as BadgeCssJsx } from "../../dist/registry/badge/css/badge";
import { Badge as BadgeTailwindJsx } from "../../dist/registry/badge/tailwind/badge";
import { Alert as AlertCssDefault } from "../../dist/registry/alert/css/alert";
import { Alert as AlertTailwindDefault } from "../../dist/registry/alert/tailwind/alert";
import * as AlertCssJsx from "../../dist/registry/alert/css/alert";
import * as AlertTailwindJsx from "../../dist/registry/alert/tailwind/alert";
import { Kbd as KbdCssDefault } from "../../dist/registry/kbd/css/kbd";
import { Kbd as KbdTailwindDefault } from "../../dist/registry/kbd/tailwind/kbd";
import * as KbdCssJsx from "../../dist/registry/kbd/css/kbd";
import * as KbdTailwindJsx from "../../dist/registry/kbd/tailwind/kbd";
import { Separator as SeparatorCssJsx } from "../../dist/registry/separator/css/separator";
import { Separator as SeparatorTailwindJsx } from "../../dist/registry/separator/tailwind/separator";
import { Skeleton as SkeletonCssJsx } from "../../dist/registry/skeleton/css/skeleton";
import { Skeleton as SkeletonTailwindJsx } from "../../dist/registry/skeleton/tailwind/skeleton";
import { Spinner as SpinnerCssJsx } from "../../dist/registry/spinner/css/spinner";
import { Spinner as SpinnerTailwindJsx } from "../../dist/registry/spinner/tailwind/spinner";
import { Empty as EmptyCssDefault } from "../../dist/registry/empty/css/empty";
import { Empty as EmptyTailwindDefault } from "../../dist/registry/empty/tailwind/empty";
import * as EmptyCssJsx from "../../dist/registry/empty/css/empty";
import * as EmptyTailwindJsx from "../../dist/registry/empty/tailwind/empty";
import { Label as LabelCssJsx } from "../../dist/registry/label/css/label";
import { Label as LabelTailwindJsx } from "../../dist/registry/label/tailwind/label";
import { Textarea as TextareaCssJsx } from "../../dist/registry/textarea/css/textarea";
import { Textarea as TextareaTailwindJsx } from "../../dist/registry/textarea/tailwind/textarea";
import { NativeSelect as NativeSelectCssDefault } from "../../dist/registry/native-select/css/native-select";
import { NativeSelect as NativeSelectTailwindDefault } from "../../dist/registry/native-select/tailwind/native-select";
import * as NativeSelectCssJsx from "../../dist/registry/native-select/css/native-select";
import * as NativeSelectTailwindJsx from "../../dist/registry/native-select/tailwind/native-select";
import { AspectRatio as AspectRatioCssJsx } from "../../dist/registry/aspect-ratio/css/aspect-ratio";
import { AspectRatio as AspectRatioTailwindJsx } from "../../dist/registry/aspect-ratio/tailwind/aspect-ratio";
import { Avatar as AvatarCssDefault } from "../../dist/registry/avatar/css/avatar";
import { Avatar as AvatarTailwindDefault } from "../../dist/registry/avatar/tailwind/avatar";
import * as AvatarCssJsx from "../../dist/registry/avatar/css/avatar";
import * as AvatarTailwindJsx from "../../dist/registry/avatar/tailwind/avatar";
import { Progress as ProgressCssJsx } from "../../dist/registry/progress/css/progress";
import { Progress as ProgressTailwindJsx } from "../../dist/registry/progress/tailwind/progress";
import { Table as TableCssDefault } from "../../dist/registry/table/css/table";
import { Table as TableTailwindDefault } from "../../dist/registry/table/tailwind/table";
import * as TableCssJsx from "../../dist/registry/table/css/table";
import * as TableTailwindJsx from "../../dist/registry/table/tailwind/table";
import type {
  GlobalHTMLAttributes,
  HTMLAttributes,
  HellaChild,
  HellaChildren,
  HellaNode,
} from "@hellajs/dom";
import type { UiStyle } from "@hellajs/ui";

/** Prop bag shared by every compiled Button variant (mirrors the emitted ButtonProps). */
export interface ButtonVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

/** Prop bag shared by every compiled Input variant (mirrors the emitted InputProps). */
export interface InputVariantProps extends HTMLAttributes<"input"> {
  class?: string;
}

/** Prop bag shared by every compiled Card part (mirrors the emitted CardPartProps). */
export interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

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
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
}

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
  state?: () => "open" | "closed";
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** One compiled component flavor — a style's canonical. */
export interface ComponentVariant<P extends object> {
  style: UiStyle;
  render: (props: P) => HellaNode;
  /** Resolves the compared root for portal variants; defaults to the mount container's first element child. */
  root?: () => Element | null;
}

/** ComponentVariant for a component that renders children. */
export interface ChildrenVariant<P extends object> extends ComponentVariant<P> {
  child: (value: HellaChild) => HellaChildren;
}

/** Prop bag shared by every compiled Badge variant (mirrors the emitted BadgeProps). */
export interface BadgeVariantProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}

/** Prop bag shared by every compiled Alert variant (mirrors the emitted AlertProps). */
export interface AlertVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive";
}

/** Prop bag shared by every compiled Kbd variant (mirrors the emitted KbdProps). */
export interface KbdVariantProps extends HTMLAttributes<"kbd"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag shared by every compiled Separator variant (mirrors the emitted SeparatorProps). */
export interface SeparatorVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

/** Prop bag shared by every compiled Skeleton variant (mirrors the emitted SkeletonProps). */
export interface SkeletonVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag shared by every compiled Spinner variant (mirrors the emitted SpinnerProps). */
export interface SpinnerVariantProps extends HTMLAttributes<"svg"> {
  class?: string;
}

/** Prop bag shared by every compiled Empty part (mirrors the emitted EmptyPartProps). */
export interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag for the compiled EmptyMedia part (mirrors the emitted EmptyMediaProps). */
export interface EmptyMediaVariantProps extends EmptyPartProps {
  variant?: "default" | "icon";
}

/** Prop bag shared by every compiled Label variant (mirrors the emitted LabelProps). */
export interface LabelVariantProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag shared by every compiled Textarea variant (mirrors the emitted TextareaProps). */
export interface TextareaVariantProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

/** Prop bag shared by every compiled NativeSelect variant (mirrors the emitted NativeSelectProps). */
export interface NativeSelectVariantProps extends HTMLAttributes<"select"> {
  class?: string;
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
}

/** Prop bag shared by every compiled AspectRatio variant (mirrors the emitted AspectRatioProps). */
export interface AspectRatioVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}

/** Prop bag shared by every compiled Avatar part (the open contract across the span/div/img roots). */
export interface AvatarPartProps extends GlobalHTMLAttributes {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag for the compiled Avatar root (mirrors the emitted AvatarProps). */
export interface AvatarVariantProps extends AvatarPartProps {
  size?: "default" | "sm" | "lg";
}

/** Prop bag for the compiled AvatarImage part (mirrors the emitted AvatarImageProps). */
export interface AvatarImageVariantProps extends HTMLAttributes<"img"> {
  class?: string;
  loaded?: (value?: boolean) => boolean;
}

/** Prop bag for the compiled AvatarFallback part (mirrors the emitted AvatarFallbackProps). */
export interface AvatarFallbackVariantProps extends AvatarPartProps {
  loaded?: () => boolean;
}

/** Prop bag shared by every compiled Progress variant (mirrors the emitted ProgressProps). */
export interface ProgressVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
}

/** Prop bag for compiled TableHead/TableCell parts (mirrors the emitted props). */
export interface TableCellVariantProps extends CardPartProps {}

/** One compiled Button flavor. */
export type ButtonVariant = ChildrenVariant<ButtonVariantProps>;

/** One compiled Input flavor. */
export type InputVariant = ComponentVariant<InputVariantProps>;

/** One compiled Card flavor (the Card export). */
export type CardVariant = ChildrenVariant<CardPartProps>;

/** One compiled Dialog flavor (the Dialog export). */
export type DialogVariant = ChildrenVariant<DialogVariantProps>;

/** One compiled Tabs flavor (the Tabs export). */
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
 * Every compiled Button variant from dist/registry: {css,tailwind}.
 */
export const buttonVariants: ButtonVariant[] = [
  { style: "css", render: ButtonCssJsx, child: (value) => [value] },
  { style: "tailwind", render: ButtonTailwindJsx, child: (value) => [value] },
];

/**
 * Every compiled Input variant from dist/registry: {css,tailwind}.
 * Input renders no children, so the suites carry no `child` wrapper.
 */
export const inputVariants: InputVariant[] = [
  { style: "css", render: InputCssJsx },
  { style: "tailwind", render: InputTailwindJsx },
];

/**
 * Every compiled Card variant (the Card export) from dist/registry.
 */
export const cardVariants: CardVariant[] = [
  { style: "css", render: CardCssDefault, child: (value) => [value] },
  { style: "tailwind", render: CardTailwindDefault, child: (value) => [value] },
];

/** The named Card parts (the other Card exports). */
export const CARD_PARTS = [
  "Header",
  "Title",
  "Description",
  "Action",
  "Content",
  "Footer",
] as const;

/** The named Dialog parts (the other Dialog exports). */
export const DIALOG_PARTS = [
  "Overlay",
  "Content",
  "Header",
  "Footer",
  "Title",
  "Description",
  "Close",
] as const;

/** The named Tabs parts (the other Tabs exports). */
export const TABS_PARTS = ["List", "Trigger", "Content"] as const;

export type AnyModule = Record<string, (props: never) => HellaNode>;

/** Builds one PartVariant per flavor for a named component part. */
function partVariants<P extends object>(
  part: string,
  prop: string,
  modules: [mod: AnyModule, style: UiStyle][],
): PartVariant<P>[] {
  return modules.map(([mod, style]) => ({
    part,
    style,
    render: mod[`${prop}${part}`] as unknown as (props: P) => HellaNode,
  }));
}

/**
 * Every compiled Card part (CardHeader…CardFooter) at both styles.
 */
export const cardPartVariants: PartVariant<CardPartProps & { children?: HellaChildren }>[] =
  CARD_PARTS.flatMap((part) =>
    partVariants(part, "Card", [
      [CardCssJsx as unknown as AnyModule, "css"],
      [CardTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

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
 * Every compiled Tabs part at both styles.
 */
export const tabsPartVariants: PartVariant<Record<string, never> & { children?: HellaChildren }>[] =
  TABS_PARTS.flatMap((part) =>
    partVariants(part, "Tabs", [
      [TabsCssJsx as unknown as AnyModule, "css"],
      [TabsTailwindJsx as unknown as AnyModule, "tailwind"],
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

/**
 * Every compiled Tabs variant (the Tabs export) from dist/registry.
 * Tabs renders no children prop, so the suites carry no `child` wrapper.
 */
export const tabsVariants: TabsVariant[] = [
  { style: "css", render: TabsCssDefault },
  { style: "tailwind", render: TabsTailwindDefault },
];

/**
 * Every compiled Badge variant (the Badge export) from dist/registry.
 */
export const badgeVariants: ChildrenVariant<BadgeVariantProps>[] = [
  { style: "css", render: BadgeCssJsx, child: (value) => [value] },
  { style: "tailwind", render: BadgeTailwindJsx, child: (value) => [value] },
];

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

/** The named Kbd parts (the other Kbd exports). */
export const KBD_PARTS = ["Group"] as const;

/**
 * Every compiled Kbd variant (the Kbd export) from dist/registry.
 */
export const kbdVariants: ChildrenVariant<KbdVariantProps>[] = [
  { style: "css", render: KbdCssDefault, child: (value) => [value] },
  { style: "tailwind", render: KbdTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Kbd part (KbdGroup) at both styles.
 */
export const kbdPartVariants: PartVariant<CardPartProps>[] = KBD_PARTS.flatMap((part) =>
  partVariants(part, "Kbd", [
    [KbdCssJsx as unknown as AnyModule, "css"],
    [KbdTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/**
 * Every compiled Separator variant from dist/registry. Separator carries an
 * optional children passthrough, so the suites wrap children like Badge.
 */
export const separatorVariants: ChildrenVariant<SeparatorVariantProps>[] = [
  { style: "css", render: SeparatorCssJsx, child: (value) => [value] },
  { style: "tailwind", render: SeparatorTailwindJsx, child: (value) => [value] },
];

/**
 * Every compiled Skeleton variant from dist/registry.
 */
export const skeletonVariants: ChildrenVariant<SkeletonVariantProps>[] = [
  { style: "css", render: SkeletonCssJsx, child: (value) => [value] },
  { style: "tailwind", render: SkeletonTailwindJsx, child: (value) => [value] },
];

/**
 * Every compiled Spinner variant from dist/registry. Spinner renders fixed svg
 * innards, so the suites carry no `child` wrapper.
 */
export const spinnerVariants: ComponentVariant<SpinnerVariantProps>[] = [
  { style: "css", render: SpinnerCssJsx },
  { style: "tailwind", render: SpinnerTailwindJsx },
];

/** The named Empty parts (the other Empty exports). */
export const EMPTY_PARTS = ["Header", "Media", "Title", "Description", "Content"] as const;

/**
 * Every compiled Empty variant (the Empty export) from dist/registry.
 */
export const emptyVariants: ChildrenVariant<EmptyPartProps>[] = [
  { style: "css", render: EmptyCssDefault, child: (value) => [value] },
  { style: "tailwind", render: EmptyTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Empty part (EmptyHeader…EmptyContent) at both styles.
 */
export const emptyPartVariants: PartVariant<EmptyMediaVariantProps>[] = EMPTY_PARTS.flatMap(
  (part) =>
    partVariants(part, "Empty", [
      [EmptyCssJsx as unknown as AnyModule, "css"],
      [EmptyTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

/**
 * Every compiled Label variant from dist/registry.
 */
export const labelVariants: ChildrenVariant<LabelVariantProps>[] = [
  { style: "css", render: LabelCssJsx, child: (value) => [value] },
  { style: "tailwind", render: LabelTailwindJsx, child: (value) => [value] },
];

/**
 * Every compiled Textarea variant from dist/registry. Textarea renders no
 * children (its value is the property), so the suites carry no `child` wrapper.
 */
export const textareaVariants: ComponentVariant<TextareaVariantProps>[] = [
  { style: "css", render: TextareaCssJsx },
  { style: "tailwind", render: TextareaTailwindJsx },
];

/** The named NativeSelect parts (the other NativeSelect exports). */
export const NATIVE_SELECT_PARTS = ["Option", "OptGroup"] as const;

/**
 * Every compiled NativeSelect variant (the NativeSelect export) from dist/registry.
 * Options are authored by the caller as children.
 */
export const nativeSelectVariants: ChildrenVariant<NativeSelectVariantProps>[] = [
  { style: "css", render: NativeSelectCssDefault, child: (value) => [value] },
  { style: "tailwind", render: NativeSelectTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled NativeSelect part (NativeSelectOption, NativeSelectOptGroup) at both styles.
 */
export const nativeSelectPartVariants: PartVariant<CardPartProps>[] = NATIVE_SELECT_PARTS.flatMap(
  (part) =>
    partVariants(part, "NativeSelect", [
      [NativeSelectCssJsx as unknown as AnyModule, "css"],
      [NativeSelectTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

/**
 * Every compiled AspectRatio variant from dist/registry.
 */
export const aspectRatioVariants: ChildrenVariant<AspectRatioVariantProps>[] = [
  { style: "css", render: AspectRatioCssJsx, child: (value) => [value] },
  { style: "tailwind", render: AspectRatioTailwindJsx, child: (value) => [value] },
];

/** The named Avatar parts (the other Avatar exports). */
export const AVATAR_PARTS = ["Image", "Fallback", "Badge", "Group", "GroupCount"] as const;

/** Superset prop bag across Avatar parts (Image carries src/alt/loaded; Fallback carries loaded). */
export type AvatarPartVariantProps = AvatarImageVariantProps & AvatarFallbackVariantProps;

/**
 * Every compiled Avatar variant (the Avatar export) from dist/registry.
 */
export const avatarVariants: ChildrenVariant<AvatarVariantProps>[] = [
  { style: "css", render: AvatarCssDefault, child: (value) => [value] },
  { style: "tailwind", render: AvatarTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Avatar part (AvatarImage…AvatarGroupCount) at both styles.
 */
export const avatarPartVariants: PartVariant<AvatarPartVariantProps>[] = AVATAR_PARTS.flatMap(
  (part) =>
    partVariants(part, "Avatar", [
      [AvatarCssJsx as unknown as AnyModule, "css"],
      [AvatarTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

/**
 * Every compiled Progress variant from dist/registry. Progress renders no
 * children, so the suites carry no `child` wrapper.
 */
export const progressVariants: ComponentVariant<ProgressVariantProps>[] = [
  { style: "css", render: ProgressCssJsx },
  { style: "tailwind", render: ProgressTailwindJsx },
];

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

/**
 * Mounts a compiled variant into a fresh container and returns the rendered root element.
 * @param variant Compiled variant to render.
 * @param props Props handed to the variant's component.
 */
export function renderVariant<P extends object>(variant: ComponentVariant<P>, props: P): Element {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it so it mounts
  // as a reactive child like any template slot.
  mount(typeof rendered === "function" ? <div>{rendered}</div> : rendered, container);
  return variant.root ? variant.root()! : container.firstElementChild!;
}

/** Splits a rendered element's class attribute into its exact tokens (no filtering). */
export function classTokens(el: Element): string[] {
  return (el.getAttribute("class") ?? "").split(" ");
}

/** The element's inline styles as collapsed text. */
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
  for (const shape of rest) expect(shape).toEqual(head as { tag: string; attributes: string[] });
}

/**
 * Renders every suite with `props` and asserts `attr` landed on each rendered root with `value`.
 * Suites carrying a `child` bag get the bag's content injected ("Forwarded").
 * @param suites Compiled variants to render.
 * @param props Props handed to every variant (includes the forwarded user attr).
 * @param attr Attribute name expected on the rendered root.
 * @param value Expected attribute value.
 * @param resolve Optional root override for wrapper components (defaults to the rendered root).
 */
export function assertAttrForwarded<P extends object>(
  suites: (ComponentVariant<P> & { child?: (value: HellaChild) => HellaChildren })[],
  props: P,
  attr: string,
  value: string,
  resolve: (el: Element) => Element = (el) => el,
): void {
  for (const suite of suites) {
    const el = suite.child
      ? renderVariant(suite, { ...props, children: suite.child("Forwarded") } as P)
      : renderVariant(suite, props);
    expect(resolve(el).getAttribute(attr)).toBe(value);
  }
}

/**
 * Renders every suite with `props` (carrying `handler` under `attr`), dispatches `event`
 * on each rendered root, and asserts the handler ran exactly once per suite.
 * @param suites Compiled variants to render.
 * @param props Props handed to every variant (includes the handler under `attr`).
 * @param attr Attribute name carrying the handler (e.g. "on:click").
 * @param event DOM event name to dispatch on the rendered root.
 * @param handler The tracked handler passed inside `props`.
 * @param resolve Optional root override for wrapper components (defaults to the rendered root).
 */
export function assertHandlerForwarded<P extends object>(
  suites: (ComponentVariant<P> & { child?: (value: HellaChild) => HellaChildren })[],
  props: P,
  attr: string,
  event: string,
  handler: Mock,
  resolve: (el: Element) => Element = (el) => el,
): void {
  for (const suite of suites) {
    const el = suite.child
      ? renderVariant(suite, { ...props, children: suite.child("Forwarded") } as P)
      : renderVariant(suite, props);
    handler.mockClear();
    resolve(el).dispatchEvent(new Event(event));
    expect(handler).toHaveBeenCalledTimes(1);
  }
}

import { ButtonGroup as ButtonGroupCssDefault } from "../../dist/registry/button-group/css/button-group";
import { ButtonGroup as ButtonGroupTailwindDefault } from "../../dist/registry/button-group/tailwind/button-group";
import * as ButtonGroupCssJsx from "../../dist/registry/button-group/css/button-group";
import * as ButtonGroupTailwindJsx from "../../dist/registry/button-group/tailwind/button-group";
import { InputGroup as InputGroupCssDefault } from "../../dist/registry/input-group/css/input-group";
import { InputGroup as InputGroupTailwindDefault } from "../../dist/registry/input-group/tailwind/input-group";
import * as InputGroupCssJsx from "../../dist/registry/input-group/css/input-group";
import * as InputGroupTailwindJsx from "../../dist/registry/input-group/tailwind/input-group";
import * as FieldCssJsx from "../../dist/registry/field/css/field";
import * as FieldTailwindJsx from "../../dist/registry/field/tailwind/field";
import { Pagination as PaginationCssDefault } from "../../dist/registry/pagination/css/pagination";
import { Pagination as PaginationTailwindDefault } from "../../dist/registry/pagination/tailwind/pagination";
import * as PaginationCssJsx from "../../dist/registry/pagination/css/pagination";
import * as PaginationTailwindJsx from "../../dist/registry/pagination/tailwind/pagination";
import * as ItemCssJsx from "../../dist/registry/item/css/item";
import * as ItemTailwindJsx from "../../dist/registry/item/tailwind/item";
import { Marker as MarkerCssDefault } from "../../dist/registry/marker/css/marker";
import { Marker as MarkerTailwindDefault } from "../../dist/registry/marker/tailwind/marker";
import * as MarkerCssJsx from "../../dist/registry/marker/css/marker";
import * as MarkerTailwindJsx from "../../dist/registry/marker/tailwind/marker";
import { DirectionProvider as DirectionCssDefault } from "../../dist/registry/direction/css/direction";
import { DirectionProvider as DirectionTailwindDefault } from "../../dist/registry/direction/tailwind/direction";

/** Prop bag shared by every compiled ButtonGroup variant (mirrors the emitted ButtonGroupProps). */
export interface ButtonGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

/** Prop bag for the compiled ButtonGroupText part (mirrors the emitted props). */
export interface ButtonGroupTextVariantProps extends CardPartProps {}

/** Prop bag for the compiled ButtonGroupSeparator part (mirrors the emitted props). */
export interface ButtonGroupSeparatorVariantProps extends HTMLAttributes<"div"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

/** Superset prop bag across ButtonGroup parts. */
export type ButtonGroupPartVariantProps = ButtonGroupTextVariantProps &
  ButtonGroupSeparatorVariantProps;

/** The named ButtonGroup parts (the other ButtonGroup exports). */
export const BUTTON_GROUP_PARTS = ["Text", "Separator"] as const;

/**
 * Every compiled ButtonGroup variant (the ButtonGroup export) from dist/registry.
 */
export const buttonGroupVariants: ChildrenVariant<ButtonGroupVariantProps>[] = [
  { style: "css", render: ButtonGroupCssDefault, child: (value) => [value] },
  { style: "tailwind", render: ButtonGroupTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled ButtonGroup part (ButtonGroupText, ButtonGroupSeparator) at both styles.
 */
export const buttonGroupPartVariants: PartVariant<ButtonGroupPartVariantProps>[] =
  BUTTON_GROUP_PARTS.flatMap((part) =>
    partVariants(part, "ButtonGroup", [
      [ButtonGroupCssJsx as unknown as AnyModule, "css"],
      [ButtonGroupTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

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

/** Prop bag for the compiled FieldSet/FieldGroup/FieldContent parts (mirrors the emitted props). */
export interface FieldPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag for the compiled FieldLegend part (mirrors the emitted props). */
export interface FieldLegendVariantProps extends FieldPartProps {
  variant?: "legend" | "label";
}

/** Prop bag for the compiled Field root (mirrors the emitted FieldProps). */
export interface FieldVariantProps extends FieldPartProps {
  orientation?: "vertical" | "horizontal" | "responsive";
  invalid?: boolean;
}

/** Prop bag for the compiled FieldLabel part (mirrors the emitted props). */
export interface FieldLabelVariantProps extends FieldPartProps {}

/** Prop bag for the compiled FieldError part (mirrors the emitted props). */
export interface FieldErrorVariantProps extends FieldPartProps {
  errors?: Array<{ message?: string } | undefined>;
}

/** Superset prop bag across Field parts. */
export type FieldPartVariantProps = FieldLegendVariantProps &
  FieldVariantProps &
  FieldLabelVariantProps &
  FieldErrorVariantProps;

/** The named Field parts (every export; Field has no default export). */
export const FIELD_PARTS = [
  "Set",
  "Legend",
  "Group",
  "Content",
  "Label",
  "Title",
  "Description",
  "Separator",
  "Error",
] as const;

/** Field part lookup: Field roots are built through the "Field" prop prefix. */
export const FIELD_PROP_PREFIX = "Field";

/**
 * Every compiled Field part (FieldSet…FieldError) at both styles.
 */
export const fieldPartVariants: PartVariant<FieldPartVariantProps>[] = FIELD_PARTS.flatMap((part) =>
  partVariants(part, "Field", [
    [FieldCssJsx as unknown as AnyModule, "css"],
    [FieldTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/** Prop bag shared by every compiled Pagination variant (mirrors the emitted PaginationProps). */
export interface PaginationVariantProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}

/** Prop bag for the compiled PaginationLink part (mirrors the emitted props). */
export interface PaginationLinkVariantProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
  isActive?: boolean;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

/** Prop bag for the compiled PaginationPrevious/Next parts (mirrors the emitted props). */
export interface PaginationNavVariantProps extends HTMLAttributes<"a"> {
  class?: string;
  isActive?: boolean;
}

/** Prop bag for the compiled PaginationContent/PaginationItem parts (mirrors the emitted props). */
export interface PaginationContentVariantProps extends CardPartProps {}

/** Prop bag for the compiled PaginationEllipsis part (mirrors the emitted props). */
export interface PaginationEllipsisVariantProps extends HTMLAttributes<"span"> {
  class?: string;
}

/** Superset prop bag across Pagination parts. */
export type PaginationPartVariantProps = PaginationLinkVariantProps &
  PaginationNavVariantProps &
  PaginationContentVariantProps &
  PaginationEllipsisVariantProps;

/** The named Pagination parts (the other Pagination exports). */
export const PAGINATION_PARTS = [
  "Content",
  "Item",
  "Link",
  "Previous",
  "Next",
  "Ellipsis",
] as const;

/**
 * Every compiled Pagination variant (the Pagination export) from dist/registry.
 */
export const paginationVariants: ChildrenVariant<PaginationVariantProps>[] = [
  { style: "css", render: PaginationCssDefault, child: (value) => [value] },
  { style: "tailwind", render: PaginationTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Pagination part (PaginationContent…PaginationEllipsis) at both styles.
 */
export const paginationPartVariants: PartVariant<PaginationPartVariantProps>[] =
  PAGINATION_PARTS.flatMap((part) =>
    partVariants(part, "Pagination", [
      [PaginationCssJsx as unknown as AnyModule, "css"],
      [PaginationTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/** Prop bag for the compiled ItemGroup/ItemContent/ItemTitle/ItemDescription/ItemActions/ItemHeader/ItemFooter parts (mirrors the emitted props). */
export interface ItemPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
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
export type ItemPartVariantProps = Omit<ItemVariantProps, "variant"> &
  ItemSeparatorVariantProps &
  ItemMediaVariantProps;

/** The named Item parts (every export; Item has no default export). */
export const ITEM_PARTS = [
  "Group",
  "Separator",
  "Media",
  "Content",
  "Title",
  "Description",
  "Actions",
  "Header",
  "Footer",
] as const;

/**
 * Every compiled Item part (ItemGroup…ItemFooter) at both styles.
 */
export const itemPartVariants: PartVariant<ItemPartVariantProps>[] = ITEM_PARTS.flatMap((part) =>
  partVariants(part, "Item", [
    [ItemCssJsx as unknown as AnyModule, "css"],
    [ItemTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/** Prop bag shared by every compiled Marker variant (mirrors the emitted MarkerProps). */
export interface MarkerVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
}

/** Prop bag for the compiled MarkerIcon/MarkerContent parts (mirrors the emitted props). */
export interface MarkerPartProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

/** The named Marker parts (the other Marker exports). */
export const MARKER_PARTS = ["Icon", "Content"] as const;

/**
 * Every compiled Marker variant (the Marker export) from dist/registry.
 */
export const markerVariants: ChildrenVariant<MarkerVariantProps>[] = [
  { style: "css", render: MarkerCssDefault, child: (value) => [value] },
  { style: "tailwind", render: MarkerTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Marker part (MarkerIcon, MarkerContent) at both styles.
 */
export const markerPartVariants: PartVariant<MarkerPartProps>[] = MARKER_PARTS.flatMap((part) =>
  partVariants(part, "Marker", [
    [MarkerCssJsx as unknown as AnyModule, "css"],
    [MarkerTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/** Prop bag shared by every compiled DirectionProvider variant (mirrors the emitted DirectionProviderProps). */
export interface DirectionVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
}

/**
 * Every compiled DirectionProvider variant (the DirectionProvider export) from dist/registry.
 */
export const directionVariants: ChildrenVariant<DirectionVariantProps>[] = [
  { style: "css", render: DirectionCssDefault, child: (value) => [value] },
  { style: "tailwind", render: DirectionTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled Field root (the named Field export — the module has no default) at both styles.
 */
export const fieldVariants: PartVariant<FieldVariantProps>[] = [
  {
    part: "Field",
    style: "css",
    render: (FieldCssJsx as unknown as AnyModule).Field as unknown as (
      props: FieldVariantProps,
    ) => HellaNode,
  },
  {
    part: "Field",
    style: "tailwind",
    render: (FieldTailwindJsx as unknown as AnyModule).Field as unknown as (
      props: FieldVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Item root (the named Item export — the module has no default) at both styles.
 */
export const itemVariants: PartVariant<ItemVariantProps>[] = [
  {
    part: "Item",
    style: "css",
    render: (ItemCssJsx as unknown as AnyModule).Item as unknown as (
      props: ItemVariantProps,
    ) => HellaNode,
  },
  {
    part: "Item",
    style: "tailwind",
    render: (ItemTailwindJsx as unknown as AnyModule).Item as unknown as (
      props: ItemVariantProps,
    ) => HellaNode,
  },
];

import * as BubbleCssJsx from "../../dist/registry/bubble/css/bubble";
import * as BubbleTailwindJsx from "../../dist/registry/bubble/tailwind/bubble";
import * as MessageCssJsx from "../../dist/registry/message/css/message";
import * as MessageTailwindJsx from "../../dist/registry/message/tailwind/message";
import * as MessageScrollerCssJsx from "../../dist/registry/message-scroller/css/message-scroller";
import * as MessageScrollerTailwindJsx from "../../dist/registry/message-scroller/tailwind/message-scroller";
import * as AttachmentCssJsx from "../../dist/registry/attachment/css/attachment";
import * as AttachmentTailwindJsx from "../../dist/registry/attachment/tailwind/attachment";

/** Prop bag for the compiled Bubble part (mirrors the emitted props). */
export interface BubbleVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
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
 * Every compiled Bubble variant (the named Bubble export) at both styles.
 */
export const bubbleVariants: PartVariant<BubbleVariantProps>[] = [
  {
    part: "Bubble",
    style: "css",
    render: (BubbleCssJsx as unknown as AnyModule).Bubble as unknown as (
      props: BubbleVariantProps,
    ) => HellaNode,
  },
  {
    part: "Bubble",
    style: "tailwind",
    render: (BubbleTailwindJsx as unknown as AnyModule).Bubble as unknown as (
      props: BubbleVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Bubble part (BubbleGroup, BubbleContent, BubbleReactions) at both styles.
 */
export const bubblePartVariants: PartVariant<BubblePartProps & BubbleReactionsVariantProps>[] =
  BUBBLE_PARTS.flatMap((part) =>
    partVariants(part, "Bubble", [
      [BubbleCssJsx as unknown as AnyModule, "css"],
      [BubbleTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/** Prop bag for the compiled Message root (mirrors the emitted props). */
export interface MessageVariantProps extends CardPartProps {
  align?: "start" | "end";
}

/** The named Message parts except the Message root (mirrors the emitted props). */
export const MESSAGE_PARTS = ["Group", "Avatar", "Content", "Header", "Footer"] as const;

/**
 * Every compiled Message variant (the named Message export) at both styles.
 */
export const messageVariants: PartVariant<MessageVariantProps>[] = [
  {
    part: "Message",
    style: "css",
    render: (MessageCssJsx as unknown as AnyModule).Message as unknown as (
      props: MessageVariantProps,
    ) => HellaNode,
  },
  {
    part: "Message",
    style: "tailwind",
    render: (MessageTailwindJsx as unknown as AnyModule).Message as unknown as (
      props: MessageVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Message part (MessageGroup, MessageAvatar, MessageContent, MessageHeader, MessageFooter) at both styles.
 */
export const messagePartVariants: PartVariant<CardPartProps>[] = MESSAGE_PARTS.flatMap((part) =>
  partVariants(part, "Message", [
    [MessageCssJsx as unknown as AnyModule, "css"],
    [MessageTailwindJsx as unknown as AnyModule, "tailwind"],
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
export interface MessageScrollerButtonVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  direction?: "start" | "end";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

/** Superset prop bag across MessageScroller parts. */
export type MessageScrollerPartVariantProps = MessageScrollerVariantProps &
  MessageScrollerButtonVariantProps;

/** The named MessageScroller parts except the MessageScroller root. */
export const MESSAGE_SCROLLER_PARTS = [
  "Provider",
  "Viewport",
  "Content",
  "Item",
  "Button",
] as const;

/**
 * Every compiled MessageScroller variant (the named MessageScroller export) at both styles.
 */
export const messageScrollerVariants: PartVariant<MessageScrollerVariantProps>[] = [
  {
    part: "MessageScroller",
    style: "css",
    render: (MessageScrollerCssJsx as unknown as AnyModule).MessageScroller as unknown as (
      props: MessageScrollerVariantProps,
    ) => HellaNode,
  },
  {
    part: "MessageScroller",
    style: "tailwind",
    render: (MessageScrollerTailwindJsx as unknown as AnyModule).MessageScroller as unknown as (
      props: MessageScrollerVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled MessageScroller part (Provider, Viewport, Content, Item, Button) at both styles.
 */
export const messageScrollerPartVariants: PartVariant<MessageScrollerPartVariantProps>[] =
  MESSAGE_SCROLLER_PARTS.flatMap((part) =>
    partVariants(part, "MessageScroller", [
      [MessageScrollerCssJsx as unknown as AnyModule, "css"],
      [MessageScrollerTailwindJsx as unknown as AnyModule, "tailwind"],
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
export interface AttachmentActionVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

/** Superset prop bag across Attachment parts. */
export type AttachmentPartVariantProps = AttachmentMediaVariantProps &
  Omit<AttachmentActionVariantProps, "variant">;

/** The named Attachment parts except the Attachment root. */
export const ATTACHMENT_PARTS = [
  "Media",
  "Content",
  "Title",
  "Description",
  "Actions",
  "Action",
  "Trigger",
  "Group",
] as const;

/**
 * Every compiled Attachment variant (the named Attachment export) at both styles.
 */
export const attachmentVariants: PartVariant<AttachmentVariantProps>[] = [
  {
    part: "Attachment",
    style: "css",
    render: (AttachmentCssJsx as unknown as AnyModule).Attachment as unknown as (
      props: AttachmentVariantProps,
    ) => HellaNode,
  },
  {
    part: "Attachment",
    style: "tailwind",
    render: (AttachmentTailwindJsx as unknown as AnyModule).Attachment as unknown as (
      props: AttachmentVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Attachment part (AttachmentMedia…AttachmentGroup) at both styles.
 */
export const attachmentPartVariants: PartVariant<AttachmentPartVariantProps>[] =
  ATTACHMENT_PARTS.flatMap((part) =>
    partVariants(part, "Attachment", [
      [AttachmentCssJsx as unknown as AnyModule, "css"],
      [AttachmentTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

import { Collapsible as CollapsibleCssDefault } from "../../dist/registry/collapsible/css/collapsible";
import { Collapsible as CollapsibleTailwindDefault } from "../../dist/registry/collapsible/tailwind/collapsible";
import * as CollapsibleCssJsx from "../../dist/registry/collapsible/css/collapsible";
import * as CollapsibleTailwindJsx from "../../dist/registry/collapsible/tailwind/collapsible";
import { Accordion as AccordionCssDefault } from "../../dist/registry/accordion/css/accordion";
import { Accordion as AccordionTailwindDefault } from "../../dist/registry/accordion/tailwind/accordion";
import * as AccordionCssJsx from "../../dist/registry/accordion/css/accordion";
import * as AccordionTailwindJsx from "../../dist/registry/accordion/tailwind/accordion";
import { Checkbox as CheckboxCssJsx } from "../../dist/registry/checkbox/css/checkbox";
import { Checkbox as CheckboxTailwindJsx } from "../../dist/registry/checkbox/tailwind/checkbox";
import { RadioGroup as RadioGroupCssDefault } from "../../dist/registry/radio-group/css/radio-group";
import { RadioGroup as RadioGroupTailwindDefault } from "../../dist/registry/radio-group/tailwind/radio-group";
import * as RadioGroupCssJsx from "../../dist/registry/radio-group/css/radio-group";
import * as RadioGroupTailwindJsx from "../../dist/registry/radio-group/tailwind/radio-group";
import { Switch as SwitchCssJsx } from "../../dist/registry/switch/css/switch";
import { Switch as SwitchTailwindJsx } from "../../dist/registry/switch/tailwind/switch";
import { Toggle as ToggleCssJsx } from "../../dist/registry/toggle/css/toggle";
import { Toggle as ToggleTailwindJsx } from "../../dist/registry/toggle/tailwind/toggle";
import { ToggleGroup as ToggleGroupCssDefault } from "../../dist/registry/toggle-group/css/toggle-group";
import { ToggleGroup as ToggleGroupTailwindDefault } from "../../dist/registry/toggle-group/tailwind/toggle-group";
import * as ToggleGroupCssJsx from "../../dist/registry/toggle-group/css/toggle-group";
import * as ToggleGroupTailwindJsx from "../../dist/registry/toggle-group/tailwind/toggle-group";

/** Prop bag shared by every compiled Collapsible variant (mirrors the emitted CollapsibleProps). */
export interface CollapsibleVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Controlled open state. When given, the root never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: HellaChildren;
  content: HellaChildren;
}

/** Superset prop bag across Collapsible parts (the open contract across the button/div roots). */
export interface CollapsiblePartVariantProps extends GlobalHTMLAttributes {
  class?: string;
  children?: HellaChildren;
  active?: () => boolean;
  onToggle?: () => void;
  id?: string;
}

/** Item shape of every compiled Accordion variant (mirrors the emitted AccordionEntry). */
export interface AccordionEntryVariant {
  value: string;
  trigger: HellaChildren;
  content: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Accordion variant (mirrors the emitted AccordionProps). */
export interface AccordionVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: AccordionEntryVariant[] | (() => AccordionEntryVariant[]);
  keyBy?: "value";
  type?: "single" | "multiple";
  collapsible?: boolean;
  open?: string | string[];
}

/** Superset prop bag across Accordion parts (the open contract across the div/button roots). */
export interface AccordionPartVariantProps extends GlobalHTMLAttributes {
  class?: string;
  children?: HellaChildren;
  value?: string;
  id?: string;
  active?: () => boolean;
  onToggle?: () => void;
  disabled?: boolean;
}

/**
 * Every compiled Collapsible variant (the Collapsible export) from dist/registry.
 * Collapsible takes trigger/content props, so the suites carry no `child` wrapper.
 */
export const collapsibleVariants: ComponentVariant<CollapsibleVariantProps>[] = [
  { style: "css", render: CollapsibleCssDefault },
  { style: "tailwind", render: CollapsibleTailwindDefault },
];

/** The named Collapsible parts (the other Collapsible exports). */
export const COLLAPSIBLE_PARTS = ["Trigger", "Content"] as const;

/**
 * Every compiled Collapsible part (CollapsibleTrigger, CollapsibleContent) at both styles.
 */
export const collapsiblePartVariants: PartVariant<CollapsiblePartVariantProps>[] =
  COLLAPSIBLE_PARTS.flatMap((part) =>
    partVariants(part, "Collapsible", [
      [CollapsibleCssJsx as unknown as AnyModule, "css"],
      [CollapsibleTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/**
 * Every compiled Accordion variant (the Accordion export) from dist/registry.
 * Accordion takes an items array, so the suites carry no `child` wrapper.
 */
export const accordionVariants: ComponentVariant<AccordionVariantProps>[] = [
  { style: "css", render: AccordionCssDefault },
  { style: "tailwind", render: AccordionTailwindDefault },
];

/** The named Accordion parts (the other Accordion exports). */
export const ACCORDION_PARTS = ["Item", "Trigger", "Content"] as const;

/**
 * Every compiled Accordion part (AccordionItem, AccordionTrigger, AccordionContent) at both styles.
 */
export const accordionPartVariants: PartVariant<AccordionPartVariantProps>[] =
  ACCORDION_PARTS.flatMap((part) =>
    partVariants(part, "Accordion", [
      [AccordionCssJsx as unknown as AnyModule, "css"],
      [AccordionTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/** Item shape of every compiled RadioGroup variant (mirrors the emitted RadioGroupItem). */
export interface RadioGroupEntryVariant {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Prop bag shared by every compiled RadioGroup variant (mirrors the emitted RadioGroupProps). */
export interface RadioGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: RadioGroupEntryVariant[] | (() => RadioGroupEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

/** Prop bag shared by every compiled Checkbox variant (mirrors the emitted CheckboxProps). */
export interface CheckboxVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  checked?: boolean | (() => boolean);
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

/** Prop bag shared by every compiled Switch variant (mirrors the emitted SwitchProps). */
export interface SwitchVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}

/** Prop bag shared by every compiled Toggle variant (mirrors the emitted ToggleProps). */
export interface ToggleVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

/** Item shape of every compiled ToggleGroup variant (mirrors the emitted ToggleGroupEntry). */
export interface ToggleGroupEntryVariant {
  value: string;
  label?: HellaChildren;
  pressed?: boolean;
  disabled?: boolean;
}

/** Prop bag shared by every compiled ToggleGroup variant (mirrors the emitted ToggleGroupProps). */
export interface ToggleGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: ToggleGroupEntryVariant[] | (() => ToggleGroupEntryVariant[]);
  keyBy?: "value";
  type: "single" | "multiple";
  value?: () => string;
  values?: () => string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

/**
 * Every compiled Checkbox variant from dist/registry: {css,tailwind}.
 */
export const checkboxVariants: ComponentVariant<CheckboxVariantProps>[] = [
  { style: "css", render: CheckboxCssJsx },
  { style: "tailwind", render: CheckboxTailwindJsx },
];

/**
 * Every compiled RadioGroup variant (the RadioGroup export) from dist/registry.
 * RadioGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const radioGroupVariants: ComponentVariant<RadioGroupVariantProps>[] = [
  { style: "css", render: RadioGroupCssDefault },
  { style: "tailwind", render: RadioGroupTailwindDefault },
];

/** The named RadioGroup parts (the other RadioGroup exports). */
export const RADIO_GROUP_PARTS = ["Item"] as const;

/** Prop bag shared by every compiled RadioGroup part (mirrors the emitted RadioGroupItemProps). */
export interface RadioGroupPartVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  value: string;
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  name?: string;
}

/**
 * Every compiled RadioGroup part (RadioGroupItem) at both styles.
 */
export const radioGroupPartVariants: PartVariant<RadioGroupPartVariantProps>[] =
  RADIO_GROUP_PARTS.flatMap((part) =>
    partVariants(part, "RadioGroup", [
      [RadioGroupCssJsx as unknown as AnyModule, "css"],
      [RadioGroupTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/**
 * Every compiled Switch variant from dist/registry: {css,tailwind}.
 */
export const switchVariants: ComponentVariant<SwitchVariantProps>[] = [
  { style: "css", render: SwitchCssJsx },
  { style: "tailwind", render: SwitchTailwindJsx },
];

/**
 * Every compiled Toggle variant from dist/registry: {css,tailwind}.
 */
export const toggleVariants: ChildrenVariant<ToggleVariantProps>[] = [
  { style: "css", render: ToggleCssJsx, child: (value) => [value] },
  { style: "tailwind", render: ToggleTailwindJsx, child: (value) => [value] },
];

/**
 * Every compiled ToggleGroup variant (the ToggleGroup export) from dist/registry.
 * ToggleGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const toggleGroupVariants: ComponentVariant<ToggleGroupVariantProps>[] = [
  { style: "css", render: ToggleGroupCssDefault },
  { style: "tailwind", render: ToggleGroupTailwindDefault },
];

/** The named ToggleGroup parts (the other ToggleGroup exports). */
export const TOGGLE_GROUP_PARTS = ["Item"] as const;

/** Prop bag shared by every compiled ToggleGroup part (mirrors the emitted ToggleGroupItemProps). */
export interface ToggleGroupPartVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  value?: string;
  pressed?: boolean | (() => boolean);
  onSelect?: () => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

/**
 * Every compiled ToggleGroup part (ToggleGroupItem) at both styles.
 */
export const toggleGroupPartVariants: PartVariant<ToggleGroupPartVariantProps>[] =
  TOGGLE_GROUP_PARTS.flatMap((part) =>
    partVariants(part, "ToggleGroup", [
      [ToggleGroupCssJsx as unknown as AnyModule, "css"],
      [ToggleGroupTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

import { Slider as SliderCssDefault } from "../../dist/registry/slider/css/slider";
import { Slider as SliderTailwindDefault } from "../../dist/registry/slider/tailwind/slider";
import { ResizablePanelGroup as ResizableCssDefault } from "../../dist/registry/resizable/css/resizable";
import { ResizablePanelGroup as ResizableTailwindDefault } from "../../dist/registry/resizable/tailwind/resizable";
import * as ResizableCssJsx from "../../dist/registry/resizable/css/resizable";
import * as ResizableTailwindJsx from "../../dist/registry/resizable/tailwind/resizable";

/** Prop bag shared by every compiled Slider variant (mirrors the emitted SliderProps). */
export interface SliderVariantProps extends HTMLAttributes<"span"> {
  class?: string;
  value?: number[] | (() => number[]);
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  orientation?: "horizontal" | "vertical";
  minStepsBetweenThumbs?: number;
}

/**
 * Every compiled Slider variant from dist/registry: {css,tailwind}.
 */
export const sliderVariants: ComponentVariant<SliderVariantProps>[] = [
  { style: "css", render: SliderCssDefault },
  { style: "tailwind", render: SliderTailwindDefault },
];

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

import * as TooltipCssJsx from "../../dist/registry/tooltip/css/tooltip";
import * as TooltipTailwindJsx from "../../dist/registry/tooltip/tailwind/tooltip";
import * as HoverCardCssJsx from "../../dist/registry/hover-card/css/hover-card";
import * as HoverCardTailwindJsx from "../../dist/registry/hover-card/tailwind/hover-card";
import * as PopoverCssJsx from "../../dist/registry/popover/css/popover";
import * as PopoverTailwindJsx from "../../dist/registry/popover/tailwind/popover";

/** Anchored-overlay side/align unions shared by the tooltip/hover-card/popover prop bags (mirrors the emitted unions). */
export type AnchoredSide = "top" | "bottom" | "left" | "right";
export type AnchoredAlign = "start" | "center" | "end";

/** Prop bag shared by every compiled Tooltip variant (mirrors the emitted TooltipProps). */
export interface TooltipVariantProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  delayDuration?: number;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Tooltip parts (mirrors the emitted part props). */
export interface TooltipPartVariantProps extends GlobalHTMLAttributes {
  state?: () => "open" | "closed";
  side?: AnchoredSide;
  align?: AnchoredAlign;
  anchor?: () => Element | undefined;
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named Tooltip parts (the other Tooltip exports). */
export const TOOLTIP_PARTS = ["Provider", "Trigger", "Content"] as const;

/**
 * Every compiled Tooltip variant (the Tooltip export) from dist/registry.
 * Tooltip's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const tooltipVariants: ComponentVariant<TooltipVariantProps>[] = [
  {
    style: "css",
    render: (TooltipCssJsx as unknown as AnyModule).Tooltip as unknown as (
      props: TooltipVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (TooltipTailwindJsx as unknown as AnyModule).Tooltip as unknown as (
      props: TooltipVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Tooltip part (TooltipProvider, TooltipTrigger, TooltipContent) at both styles.
 */
export const tooltipPartVariants: PartVariant<TooltipPartVariantProps>[] = TOOLTIP_PARTS.flatMap(
  (part) =>
    partVariants(part, "Tooltip", [
      [TooltipCssJsx as unknown as AnyModule, "css"],
      [TooltipTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

/** Prop bag shared by every compiled HoverCard variant (mirrors the emitted HoverCardProps). */
export interface HoverCardVariantProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

/** Superset prop bag across HoverCard parts (mirrors the emitted part props). */
export interface HoverCardPartVariantProps extends GlobalHTMLAttributes {
  state?: () => "open" | "closed";
  side?: AnchoredSide;
  align?: AnchoredAlign;
  anchor?: () => Element | undefined;
  onOpen?: () => void;
  onClose?: () => void;
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named HoverCard parts (the other HoverCard exports). */
export const HOVER_CARD_PARTS = ["Trigger", "Content"] as const;

/**
 * Every compiled HoverCard variant (the HoverCard export) from dist/registry.
 * HoverCard's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const hoverCardVariants: ComponentVariant<HoverCardVariantProps>[] = [
  {
    style: "css",
    render: (HoverCardCssJsx as unknown as AnyModule).HoverCard as unknown as (
      props: HoverCardVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (HoverCardTailwindJsx as unknown as AnyModule).HoverCard as unknown as (
      props: HoverCardVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled HoverCard part (HoverCardTrigger, HoverCardContent) at both styles.
 */
export const hoverCardPartVariants: PartVariant<HoverCardPartVariantProps>[] =
  HOVER_CARD_PARTS.flatMap((part) =>
    partVariants(part, "HoverCard", [
      [HoverCardCssJsx as unknown as AnyModule, "css"],
      [HoverCardTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/** Prop bag shared by every compiled Popover variant (mirrors the emitted PopoverProps). */
export interface PopoverVariantProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}

/** Superset prop bag across Popover parts (mirrors the emitted part props). */
export interface PopoverPartVariantProps extends GlobalHTMLAttributes {
  state?: () => "open" | "closed";
  side?: AnchoredSide;
  align?: AnchoredAlign;
  sideOffset?: number;
  alignOffset?: number;
  anchor?: () => Element | undefined;
  onDismiss?: () => void;
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

/** The named Popover parts (the other Popover exports). */
export const POPOVER_PARTS = [
  "Anchor",
  "Trigger",
  "Content",
  "Header",
  "Title",
  "Description",
] as const;

/**
 * Every compiled Popover variant (the Popover export) from dist/registry.
 * Popover's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const popoverVariants: ComponentVariant<PopoverVariantProps>[] = [
  {
    style: "css",
    render: (PopoverCssJsx as unknown as AnyModule).Popover as unknown as (
      props: PopoverVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (PopoverTailwindJsx as unknown as AnyModule).Popover as unknown as (
      props: PopoverVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Popover part (PopoverAnchor…PopoverDescription) at both styles.
 */
export const popoverPartVariants: PartVariant<PopoverPartVariantProps>[] = POPOVER_PARTS.flatMap(
  (part) =>
    partVariants(part, "Popover", [
      [PopoverCssJsx as unknown as AnyModule, "css"],
      [PopoverTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import * as DropdownMenuCssJsx from "../../dist/registry/dropdown-menu/css/dropdown-menu";
import * as DropdownMenuTailwindJsx from "../../dist/registry/dropdown-menu/tailwind/dropdown-menu";
import * as ContextMenuCssJsx from "../../dist/registry/context-menu/css/context-menu";
import * as ContextMenuTailwindJsx from "../../dist/registry/context-menu/tailwind/context-menu";

/** Module table backing one menu component: [style] resolves the compiled namespace, so tests compose content trees from the same style as the root. */
export interface MenuModuleTable {
  css: AnyModule;
  tailwind: AnyModule;
}

/** Resolves one named part function (FULL export name, e.g. "DropdownMenuItem") from the module table at a variant's flavor. */
export function menuModulePart<P extends object>(
  modules: MenuModuleTable,
  variant: { style: UiStyle },
  name: string,
): (props: P) => HellaNode {
  return modules[variant.style][name] as unknown as (props: P) => HellaNode;
}

/** Item shape of every compiled menu RadioGroup variant (mirrors the emitted RadioGroupEntry). */
export interface MenuRadioEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled DropdownMenu variant (mirrors the emitted DropdownMenuProps). */
export interface DropdownMenuVariantProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Superset prop bag across DropdownMenu parts (mirrors the emitted part props). */
export interface DropdownMenuPartVariantProps extends GlobalHTMLAttributes {
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
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** The named DropdownMenu parts (the other DropdownMenu exports). */
export const DROPDOWN_MENU_PARTS = [
  "Trigger",
  "Content",
  "Group",
  "Item",
  "CheckboxItem",
  "RadioGroup",
  "RadioItem",
  "Label",
  "Separator",
  "Shortcut",
  "Sub",
  "SubTrigger",
  "SubContent",
] as const;

/** Compiled DropdownMenu module table, keyed [style]. */
export const dropdownMenuModules: MenuModuleTable = {
  css: DropdownMenuCssJsx as unknown as AnyModule,
  tailwind: DropdownMenuTailwindJsx as unknown as AnyModule,
};

/**
 * Every compiled DropdownMenu variant (the DropdownMenu export) from dist/registry.
 * DropdownMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const dropdownMenuVariants: ComponentVariant<DropdownMenuVariantProps>[] = [
  {
    style: "css",
    render: (DropdownMenuCssJsx as unknown as AnyModule).DropdownMenu as unknown as (
      props: DropdownMenuVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (DropdownMenuTailwindJsx as unknown as AnyModule).DropdownMenu as unknown as (
      props: DropdownMenuVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled DropdownMenu part (DropdownMenuTrigger…DropdownMenuSubContent) at both styles.
 */
export const dropdownMenuPartVariants: PartVariant<DropdownMenuPartVariantProps>[] =
  DROPDOWN_MENU_PARTS.flatMap((part) =>
    partVariants(part, "DropdownMenu", [
      [DropdownMenuCssJsx as unknown as AnyModule, "css"],
      [DropdownMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/** Prop bag shared by every compiled ContextMenu variant (mirrors the emitted ContextMenuProps). */
export interface ContextMenuVariantProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Superset prop bag across ContextMenu parts (mirrors the emitted part props). */
export interface ContextMenuPartVariantProps extends GlobalHTMLAttributes {
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
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** The named ContextMenu parts (the other ContextMenu exports). */
export const CONTEXT_MENU_PARTS = [
  "Trigger",
  "Content",
  "Group",
  "Item",
  "CheckboxItem",
  "RadioGroup",
  "RadioItem",
  "Label",
  "Separator",
  "Shortcut",
  "Sub",
  "SubTrigger",
  "SubContent",
] as const;

/** Compiled ContextMenu module table, keyed [style]. */
export const contextMenuModules: MenuModuleTable = {
  css: ContextMenuCssJsx as unknown as AnyModule,
  tailwind: ContextMenuTailwindJsx as unknown as AnyModule,
};

/**
 * Every compiled ContextMenu variant (the ContextMenu export) from dist/registry.
 * ContextMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const contextMenuVariants: ComponentVariant<ContextMenuVariantProps>[] = [
  {
    style: "css",
    render: (ContextMenuCssJsx as unknown as AnyModule).ContextMenu as unknown as (
      props: ContextMenuVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (ContextMenuTailwindJsx as unknown as AnyModule).ContextMenu as unknown as (
      props: ContextMenuVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled ContextMenu part (ContextMenuTrigger…ContextMenuSubContent) at both styles.
 */
export const contextMenuPartVariants: PartVariant<ContextMenuPartVariantProps>[] =
  CONTEXT_MENU_PARTS.flatMap((part) =>
    partVariants(part, "ContextMenu", [
      [ContextMenuCssJsx as unknown as AnyModule, "css"],
      [ContextMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

import * as MenubarCssJsx from "../../dist/registry/menubar/css/menubar";
import * as MenubarTailwindJsx from "../../dist/registry/menubar/tailwind/menubar";

/** Prop bag shared by every compiled Menubar variant (mirrors the emitted MenubarProps). */
export interface MenubarVariantProps extends HTMLAttributes<"div"> {
  value?: () => string;
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Menubar parts (mirrors the emitted part props). */
export interface MenubarPartVariantProps extends GlobalHTMLAttributes {
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
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** The named Menubar parts (the other Menubar exports). */
export const MENUBAR_PARTS = [
  "Menu",
  "Trigger",
  "Group",
  "Content",
  "Item",
  "CheckboxItem",
  "RadioGroup",
  "RadioItem",
  "Label",
  "Separator",
  "Shortcut",
  "Sub",
  "SubTrigger",
  "SubContent",
] as const;

/** Compiled Menubar module table, keyed [style]. */
export const menubarModules: MenuModuleTable = {
  css: MenubarCssJsx as unknown as AnyModule,
  tailwind: MenubarTailwindJsx as unknown as AnyModule,
};

/**
 * Every compiled Menubar variant (the Menubar export) from dist/registry.
 * Menubar's content portals into document.body on open, so the suites
 * render the bar and resolve content through the helpers/anchored pollers.
 */
export const menubarVariants: ComponentVariant<MenubarVariantProps>[] = [
  {
    style: "css",
    render: (MenubarCssJsx as unknown as AnyModule).Menubar as unknown as (
      props: MenubarVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (MenubarTailwindJsx as unknown as AnyModule).Menubar as unknown as (
      props: MenubarVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Menubar part (MenubarMenu…MenubarSubContent) at both styles.
 */
export const menubarPartVariants: PartVariant<MenubarPartVariantProps>[] = MENUBAR_PARTS.flatMap(
  (part) =>
    partVariants(part, "Menubar", [
      [MenubarCssJsx as unknown as AnyModule, "css"],
      [MenubarTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import * as NavigationMenuCssJsx from "../../dist/registry/navigation-menu/css/navigation-menu";
import * as NavigationMenuTailwindJsx from "../../dist/registry/navigation-menu/tailwind/navigation-menu";

/** Prop bag shared by every compiled NavigationMenu variant (mirrors the emitted NavigationMenuProps). */
export interface NavigationMenuVariantProps extends HTMLAttributes<"div"> {
  value?: () => string;
  onValueChange?: (value: string) => void;
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across NavigationMenu parts (mirrors the emitted part props). */
export interface NavigationMenuPartVariantProps extends GlobalHTMLAttributes {
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

/** The named NavigationMenu parts (the other NavigationMenu exports). */
export const NAVIGATION_MENU_PARTS = [
  "List",
  "Item",
  "Trigger",
  "Content",
  "Link",
  "Viewport",
  "Indicator",
] as const;

/**
 * Every compiled NavigationMenu variant (the NavigationMenu export) from dist/registry.
 * The composed root appends the shared viewport slot its contents portal into.
 */
export const navigationMenuVariants: ComponentVariant<NavigationMenuVariantProps>[] = [
  {
    style: "css",
    render: (NavigationMenuCssJsx as unknown as AnyModule).NavigationMenu as unknown as (
      props: NavigationMenuVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (NavigationMenuTailwindJsx as unknown as AnyModule).NavigationMenu as unknown as (
      props: NavigationMenuVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled NavigationMenu part (NavigationMenuList…NavigationMenuIndicator) at both styles.
 */
export const navigationMenuPartVariants: PartVariant<NavigationMenuPartVariantProps>[] =
  NAVIGATION_MENU_PARTS.flatMap((part) =>
    partVariants(part, "NavigationMenu", [
      [NavigationMenuCssJsx as unknown as AnyModule, "css"],
      [NavigationMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

import * as BreadcrumbCssJsx from "../../dist/registry/breadcrumb/css/breadcrumb";
import * as BreadcrumbTailwindJsx from "../../dist/registry/breadcrumb/tailwind/breadcrumb";

/** Prop bag shared by every compiled Breadcrumb variant (mirrors the emitted BreadcrumbProps). */
export interface BreadcrumbVariantProps extends HTMLAttributes<"nav"> {
  children?: HellaChildren;
  class?: string;
}

/** Superset prop bag across Breadcrumb parts (mirrors the emitted part props). */
export interface BreadcrumbPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  href?: string;
  class?: string;
}

/** The named Breadcrumb parts (the other Breadcrumb exports). */
export const BREADCRUMB_PARTS = ["List", "Item", "Link", "Page", "Separator", "Ellipsis"] as const;

/**
 * Every compiled Breadcrumb variant (the Breadcrumb export) from dist/registry.
 */
export const breadcrumbVariants: ComponentVariant<BreadcrumbVariantProps>[] = [
  {
    style: "css",
    render: (BreadcrumbCssJsx as unknown as AnyModule).Breadcrumb as unknown as (
      props: BreadcrumbVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (BreadcrumbTailwindJsx as unknown as AnyModule).Breadcrumb as unknown as (
      props: BreadcrumbVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Breadcrumb part (BreadcrumbList…BreadcrumbEllipsis) at both styles.
 */
export const breadcrumbPartVariants: PartVariant<BreadcrumbPartVariantProps>[] =
  BREADCRUMB_PARTS.flatMap((part) =>
    partVariants(part, "Breadcrumb", [
      [BreadcrumbCssJsx as unknown as AnyModule, "css"],
      [BreadcrumbTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

import * as SelectCssJsx from "../../dist/registry/select/css/select";
import * as SelectTailwindJsx from "../../dist/registry/select/tailwind/select";
import * as ComboboxCssJsx from "../../dist/registry/combobox/css/combobox";
import * as ComboboxTailwindJsx from "../../dist/registry/combobox/tailwind/combobox";

/** Item shape of every compiled Select variant (mirrors the emitted SelectEntry). */
export interface SelectEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Select variant (mirrors the emitted SelectProps). */
export interface SelectVariantProps extends HTMLAttributes<"button"> {
  items?: SelectEntryVariant[] | (() => SelectEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  clearable?: boolean;
  class?: string;
}

/** Superset prop bag across Select parts (mirrors the emitted part props). */
export interface SelectPartVariantProps extends GlobalHTMLAttributes {
  id?: string;
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

/** The named Select parts (the other Select exports). */
export const SELECT_PARTS = [
  "Trigger",
  "Value",
  "Content",
  "Group",
  "Item",
  "Label",
  "Separator",
  "ScrollUpButton",
  "ScrollDownButton",
] as const;

/** Compiled Select module table, keyed [style]. */
export const selectModules: MenuModuleTable = {
  css: SelectCssJsx as unknown as AnyModule,
  tailwind: SelectTailwindJsx as unknown as AnyModule,
};

/**
 * Every compiled Select variant (the Select export) from dist/registry.
 * Select's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const selectVariants: ComponentVariant<SelectVariantProps>[] = [
  {
    style: "css",
    render: (SelectCssJsx as unknown as AnyModule).Select as unknown as (
      props: SelectVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (SelectTailwindJsx as unknown as AnyModule).Select as unknown as (
      props: SelectVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Select part (SelectTrigger…SelectScrollDownButton) at both styles.
 */
export const selectPartVariants: PartVariant<SelectPartVariantProps>[] = SELECT_PARTS.flatMap(
  (part) =>
    partVariants(part, "Select", [
      [SelectCssJsx as unknown as AnyModule, "css"],
      [SelectTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

/** Item shape of every compiled Combobox variant (mirrors the emitted ComboboxEntry). */
export interface ComboboxEntryVariant {
  value: string;
  label?: string;
  disabled?: boolean;
}

/** Prop bag shared by every compiled Combobox variant (mirrors the emitted ComboboxProps). */
export interface ComboboxVariantProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntryVariant[] | (() => ComboboxEntryVariant[]);
  keyBy?: "value";
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  filter?: (items: ComboboxEntryVariant[], query: string) => ComboboxEntryVariant[];
  showClear?: boolean;
  class?: string;
}

/** Superset prop bag across Combobox parts (mirrors the emitted part props). */
export interface ComboboxPartVariantProps extends HTMLAttributes<"input"> {
  value?: string | string[] | (() => string | string[] | undefined);
  disabled?: boolean;
  state?: () => "open" | "closed";
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  hasValue?: () => boolean;
  wire?: (node: HTMLElement) => () => void;
  portal?: () => HellaChildren;
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
  items?: ComboboxEntryVariant[] | (() => ComboboxEntryVariant[]);
  keyBy?: "value";
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

/** The named Combobox parts (the other Combobox exports). */
export const COMBOBOX_PARTS = [
  "Value",
  "Trigger",
  "Clear",
  "Group",
  "Label",
  "Collection",
  "Empty",
  "Separator",
  "Item",
  "List",
  "Input",
  "Chips",
  "Chip",
  "ChipsInput",
  "Content",
] as const;

/** Compiled Combobox module table, keyed [style]. */
export const comboboxModules: MenuModuleTable = {
  css: ComboboxCssJsx as unknown as AnyModule,
  tailwind: ComboboxTailwindJsx as unknown as AnyModule,
};

/**
 * Every compiled Combobox variant (the Combobox export) from dist/registry.
 * Combobox's content portals into document.body on open, so the suites
 * render the wrapper root and resolve content through the helpers/anchored pollers.
 */
export const comboboxVariants: ComponentVariant<ComboboxVariantProps>[] = [
  {
    style: "css",
    render: (ComboboxCssJsx as unknown as AnyModule).Combobox as unknown as (
      props: ComboboxVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (ComboboxTailwindJsx as unknown as AnyModule).Combobox as unknown as (
      props: ComboboxVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Combobox part (ComboboxValue…ComboboxContent) at both styles.
 */
export const comboboxPartVariants: PartVariant<ComboboxPartVariantProps>[] = COMBOBOX_PARTS.flatMap(
  (part) =>
    partVariants(part, "Combobox", [
      [ComboboxCssJsx as unknown as AnyModule, "css"],
      [ComboboxTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import * as CommandCssJsx from "../../dist/registry/command/css/command";
import * as CommandTailwindJsx from "../../dist/registry/command/tailwind/command";

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

/** Superset prop bag across Command parts (mirrors the emitted part props). */
export interface CommandPartVariantProps extends HTMLAttributes<"div"> {
  value?: string | (() => string);
  placeholder?: string;
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

/** The named Command parts (the other Command exports). */
export const COMMAND_PARTS = [
  "Input",
  "List",
  "Empty",
  "Group",
  "Separator",
  "Item",
  "Shortcut",
  "Dialog",
] as const;

/**
 * Every compiled Command variant (the Command export) from dist/registry.
 */
export const commandVariants: ComponentVariant<CommandVariantProps>[] = [
  {
    style: "css",
    render: (CommandCssJsx as unknown as AnyModule).Command as unknown as (
      props: CommandVariantProps,
    ) => HellaNode,
  },
  {
    style: "tailwind",
    render: (CommandTailwindJsx as unknown as AnyModule).Command as unknown as (
      props: CommandVariantProps,
    ) => HellaNode,
  },
];

/**
 * Every compiled Command part (CommandInput…CommandDialog) at both styles.
 */
export const commandPartVariants: PartVariant<CommandPartVariantProps>[] = COMMAND_PARTS.flatMap(
  (part) =>
    partVariants(part, "Command", [
      [CommandCssJsx as unknown as AnyModule, "css"],
      [CommandTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import { AlertDialog as AlertDialogCssDefault } from "../../dist/registry/alert-dialog/css/alert-dialog";
import { AlertDialog as AlertDialogTailwindDefault } from "../../dist/registry/alert-dialog/tailwind/alert-dialog";
import * as AlertDialogCssJsx from "../../dist/registry/alert-dialog/css/alert-dialog";
import * as AlertDialogTailwindJsx from "../../dist/registry/alert-dialog/tailwind/alert-dialog";
import { Sheet as SheetCssDefault } from "../../dist/registry/sheet/css/sheet";
import { Sheet as SheetTailwindDefault } from "../../dist/registry/sheet/tailwind/sheet";
import * as SheetCssJsx from "../../dist/registry/sheet/css/sheet";
import * as SheetTailwindJsx from "../../dist/registry/sheet/tailwind/sheet";
import { Drawer as DrawerCssDefault } from "../../dist/registry/drawer/css/drawer";
import { Drawer as DrawerTailwindDefault } from "../../dist/registry/drawer/tailwind/drawer";
import * as DrawerCssJsx from "../../dist/registry/drawer/css/drawer";
import * as DrawerTailwindJsx from "../../dist/registry/drawer/tailwind/drawer";

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

/** Prop bag shared by every compiled Sheet variant (mirrors the emitted SheetProps). */
export interface SheetVariantProps extends HTMLAttributes<"div"> {
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
export interface DrawerVariantProps extends HTMLAttributes<"div"> {
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
export interface AlertDialogPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  class?: string;
  state?: () => "open" | "closed";
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

/** The named AlertDialog parts (the other AlertDialog exports). */
export const ALERT_DIALOG_PARTS = [
  "Trigger",
  "Portal",
  "Overlay",
  "Content",
  "Header",
  "Footer",
  "Title",
  "Description",
  "Media",
  "Action",
  "Cancel",
] as const;

/** The named Sheet parts (the other Sheet exports). */
export const SHEET_PARTS = [
  "Trigger",
  "Close",
  "Portal",
  "Overlay",
  "Content",
  "Header",
  "Footer",
  "Title",
  "Description",
] as const;

/** The named Drawer parts (the other Drawer exports). */
export const DRAWER_PARTS = [
  "Trigger",
  "Close",
  "Portal",
  "Overlay",
  "Content",
  "Header",
  "Footer",
  "Title",
  "Description",
] as const;

/** One compiled AlertDialog flavor (the AlertDialog export). */
export type AlertDialogVariant = ChildrenVariant<AlertDialogVariantProps>;

/** One compiled Sheet flavor (the Sheet export). */
export type SheetVariant = ChildrenVariant<SheetVariantProps>;

/** One compiled Drawer flavor (the Drawer export). */
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
 * Every compiled Sheet variant (the Sheet export) from dist/registry.
 */
export const sheetVariants: ChildrenVariant<SheetVariantProps>[] = [
  { style: "css", render: SheetCssDefault, child: (value) => [value], root: newestSheetPanel },
  {
    style: "tailwind",
    render: SheetTailwindDefault,
    child: (value) => [value],
    root: newestSheetPanel,
  },
];

/**
 * Every compiled Drawer variant (the Drawer export) from dist/registry.
 */
export const drawerVariants: ChildrenVariant<DrawerVariantProps>[] = [
  { style: "css", render: DrawerCssDefault, child: (value) => [value], root: newestDrawerPanel },
  {
    style: "tailwind",
    render: DrawerTailwindDefault,
    child: (value) => [value],
    root: newestDrawerPanel,
  },
];

/**
 * Every compiled AlertDialog part (AlertDialogTrigger…AlertDialogCancel) at both styles.
 */
export const alertDialogPartVariants: PartVariant<AlertDialogPartVariantProps>[] =
  ALERT_DIALOG_PARTS.flatMap((part) =>
    partVariants(part, "AlertDialog", [
      [AlertDialogCssJsx as unknown as AnyModule, "css"],
      [AlertDialogTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

/**
 * Every compiled Sheet part (SheetTrigger…SheetDescription) at both styles.
 */
export const sheetPartVariants: PartVariant<SheetPartVariantProps>[] = SHEET_PARTS.flatMap((part) =>
  partVariants(part, "Sheet", [
    [SheetCssJsx as unknown as AnyModule, "css"],
    [SheetTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/**
 * Every compiled Drawer part (DrawerTrigger…DrawerDescription) at both styles.
 */
export const drawerPartVariants: PartVariant<DrawerPartVariantProps>[] = DRAWER_PARTS.flatMap(
  (part) =>
    partVariants(part, "Drawer", [
      [DrawerCssJsx as unknown as AnyModule, "css"],
      [DrawerTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import * as SonnerCss from "../../dist/registry/sonner/css/sonner";
import * as SonnerTailwind from "../../dist/registry/sonner/tailwind/sonner";

/** Prop bag shared by every compiled Sonner variant (mirrors the emitted ToasterProps). */
export interface SonnerVariantProps extends HTMLAttributes<"ol"> {
  class?: string;
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  richColors?: boolean;
}

/** The compiled module's toast queue API (per-flavor singleton). */
export type SonnerToastApi = typeof SonnerCss.toast;

/** The newest toaster ol portaled into document.body. */
function newestToaster(): Element | null {
  const toasters = document.querySelectorAll("[data-sonner-toaster]");
  return toasters.length === 0 ? null : toasters[toasters.length - 1]!;
}

/**
 * Every compiled Sonner flavor. `render` is the Toaster export;
 * `toast` is the same compiled module's queue singleton, so each variant
 * drives its own store.
 */
export interface SonnerVariant extends ComponentVariant<SonnerVariantProps> {
  toast: SonnerToastApi;
  root: () => Element | null;
}

/**
 * Every compiled Sonner variant (the Toaster export) from dist/registry.
 */
export const sonnerVariants: SonnerVariant[] = [
  { style: "css", render: SonnerCss.Toaster, toast: SonnerCss.toast, root: newestToaster },
  {
    style: "tailwind",
    render: SonnerTailwind.Toaster,
    toast: SonnerTailwind.toast,
    root: newestToaster,
  },
];

import { ScrollArea as ScrollAreaCssDefault } from "../../dist/registry/scroll-area/css/scroll-area";
import { ScrollArea as ScrollAreaTailwindDefault } from "../../dist/registry/scroll-area/tailwind/scroll-area";
import * as ScrollAreaCssJsx from "../../dist/registry/scroll-area/css/scroll-area";
import * as ScrollAreaTailwindJsx from "../../dist/registry/scroll-area/tailwind/scroll-area";

/** Prop bag shared by every compiled ScrollArea variant (mirrors the emitted ScrollAreaProps). */
export interface ScrollAreaVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  observe?: ScrollerObserve;
}

/** Prop bag shared by every compiled ScrollBar variant (mirrors the emitted ScrollBarProps). */
export interface ScrollBarVariantProps extends GlobalHTMLAttributes {
  class?: string;
  orientation?: "vertical" | "horizontal";
  observe?: ScrollerObserve;
}

/**
 * Every compiled ScrollArea variant (the ScrollArea export) from dist/registry.
 */
export const scrollAreaVariants: ChildrenVariant<ScrollAreaVariantProps>[] = [
  { style: "css", render: ScrollAreaCssDefault, child: (value) => [value] },
  { style: "tailwind", render: ScrollAreaTailwindDefault, child: (value) => [value] },
];

/**
 * Every compiled ScrollBar variant (the named part) from dist/registry.
 */
export const scrollBarVariants: ComponentVariant<ScrollBarVariantProps>[] = [
  { style: "css", render: ScrollAreaCssJsx.ScrollBar },
  { style: "tailwind", render: ScrollAreaTailwindJsx.ScrollBar },
];

import { Calendar as CalendarCssDefault } from "../../dist/registry/calendar/css/calendar";
import { Calendar as CalendarTailwindDefault } from "../../dist/registry/calendar/tailwind/calendar";
import * as CalendarCssJsx from "../../dist/registry/calendar/css/calendar";
import * as CalendarTailwindJsx from "../../dist/registry/calendar/tailwind/calendar";

/** Prop bag shared by every compiled Calendar variant (mirrors the emitted CalendarProps). */
export interface CalendarVariantProps extends HTMLAttributes<"div"> {
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
export interface CalendarDayButtonVariantProps extends HTMLAttributes<"button"> {
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
 * Every compiled Calendar variant (the Calendar export) from dist/registry.
 * Calendar renders no children, so the suites carry no `child` wrapper.
 */
export const calendarVariants: ComponentVariant<CalendarVariantProps>[] = [
  { style: "css", render: CalendarCssDefault },
  { style: "tailwind", render: CalendarTailwindDefault },
];

/**
 * Every compiled CalendarDayButton part (the named export) from dist/registry.
 */
export const calendarDayButtonVariants: ComponentVariant<CalendarDayButtonVariantProps>[] = [
  { style: "css", render: CalendarCssJsx.CalendarDayButton },
  { style: "tailwind", render: CalendarTailwindJsx.CalendarDayButton },
];

import { InputOTP as InputOtpCssDefault } from "../../dist/registry/input-otp/css/input-otp";
import { InputOTP as InputOtpTailwindDefault } from "../../dist/registry/input-otp/tailwind/input-otp";
import * as InputOtpCssJsx from "../../dist/registry/input-otp/css/input-otp";
import * as InputOtpTailwindJsx from "../../dist/registry/input-otp/tailwind/input-otp";

/** Prop bag shared by every compiled InputOTP variant (mirrors the emitted InputOTPProps). */
export interface InputOtpVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  length?: number;
  value?: string | (() => string);
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}

/**
 * Every compiled InputOTP variant (the InputOTP export) from dist/registry.
 * Children are the user-composed groups/slots, so the suites build them from
 * `inputOtpPartModules` per render.
 */
export const inputOtpVariants: ComponentVariant<InputOtpVariantProps>[] = [
  { style: "css", render: InputOtpCssDefault },
  { style: "tailwind", render: InputOtpTailwindDefault },
];

/**
 * Every compiled InputOTP part module (InputOTPGroup, InputOTPSlot,
 * InputOTPSeparator) at both styles, for composing children in the suites.
 */
export const inputOtpPartModules: AnyModule[] = [InputOtpCssJsx, InputOtpTailwindJsx];

import * as FormCssJsx from "../../dist/registry/form/css/form";
import * as FormTailwindJsx from "../../dist/registry/form/tailwind/form";

/** Superset prop bag across Form parts (mirrors the emitted part props). */
export interface FormPartVariantProps extends GlobalHTMLAttributes {
  error?: boolean | (() => boolean);
  invalid?: boolean | (() => boolean);
  describedBy?: string;
  errors?: string[] | (() => string[] | undefined);
  children?: HellaChildren;
  class?: string;
}

/** The named Form parts (every export beside the createForm controller). */
export const FORM_PARTS = ["Item", "Label", "Control", "Description", "Message"] as const;

/**
 * Every compiled Form part (FormItem…FormMessage) at both styles.
 */
export const formPartVariants: PartVariant<FormPartVariantProps>[] = FORM_PARTS.flatMap((part) =>
  partVariants(part, "Form", [
    [FormCssJsx as unknown as AnyModule, "css"],
    [FormTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

/** One compiled Form style's signals controller, so controller tests exercise both compiled modules. */
export interface FormApiVariant {
  style: UiStyle;
  createForm: typeof FormCssJsx.createForm;
}

/** Every compiled Form variant's createForm controller from dist/registry. */
export const formApiVariants: FormApiVariant[] = [
  { style: "css", createForm: FormCssJsx.createForm },
  { style: "tailwind", createForm: FormTailwindJsx.createForm },
];

import * as SidebarCssJsx from "../../dist/registry/sidebar/css/sidebar";
import * as SidebarTailwindJsx from "../../dist/registry/sidebar/tailwind/sidebar";

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
): (props: P) => HellaNode {
  return variant.mod[name] as unknown as (props: P) => HellaNode;
}
