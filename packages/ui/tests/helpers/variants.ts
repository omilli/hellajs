import { expect } from "bun:test";
import { setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and a component's Portal must share one dom instance.
import { html, mount } from "@hellajs/dom";
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

type AnyModule = Record<string, (props: never) => HellaNode>;

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
