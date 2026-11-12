import { vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { renderVariant, type ComponentVariant } from "../../helpers/variants-core";
import {
  navigationMenuPartVariants,
  type NavigationMenuPartVariantProps,
  type NavigationMenuVariantProps,
} from "./variants";
import { awaitPortaled } from "../../helpers/anchored";

/** Resolves one compiled NavigationMenu part (full export name) at the variant's flavor. */
export function part<P extends NavigationMenuPartVariantProps>(
  variant: ComponentVariant<NavigationMenuVariantProps>,
  name: string,
  props: P,
): JSX.Element {
  const found = navigationMenuPartVariants.find(
    (candidate) => candidate.part === name && candidate.style === variant.style,
  )!;
  return (found.render as unknown as (bag: P) => JSX.Element)(props);
}

export interface NavFixture {
  bar: HTMLElement;
  value: ReturnType<typeof signal<string>>;
  onValueChange: ReturnType<typeof vi.fn<(value: string) => void>>;
  learnTrigger: () => HTMLElement;
  referenceTrigger: () => HTMLElement;
  clickTrigger: (get: () => HTMLElement, min?: number) => Promise<HTMLElement>;
}

/** Builds a two-trigger bar whose triggers and contents share one signal; an explicit Viewport part is the sole portal target. */
export function buildNav(variant: ComponentVariant<NavigationMenuVariantProps>): NavFixture {
  const value = signal("");
  const onValueChange = vi.fn<(value: string) => void>((next) => value(next));
  const toggle = (id: string): void => value(value() === id ? "" : id);
  const bar = renderVariant(variant, {
    value: () => value(),
    onValueChange,
    children: [
      part(variant, "List", {
        children: [
          part(variant, "Item", {
            children: [
              part(variant, "Trigger", {
                value: "learn",
                active: () => value() === "learn",
                onActivate: () => toggle("learn"),
                children: "Learn",
              }),
              part(variant, "Content", {
                active: () => value() === "learn",
                children: part(variant, "Link", { href: "#learn", children: "Intro" }),
              }),
            ],
          }),
          part(variant, "Item", {
            children: [
              part(variant, "Trigger", {
                value: "reference",
                active: () => value() === "reference",
                onActivate: () => toggle("reference"),
                children: "Reference",
              }),
              part(variant, "Content", {
                active: () => value() === "reference",
                children: part(variant, "Link", { href: "#reference", children: "API" }),
              }),
            ],
          }),
        ],
      }),
      part(variant, "Viewport", {
        active: () => value() !== "",
      }),
      part(variant, "Indicator", {
        anchor: () =>
          value() === "reference"
            ? (bar.querySelector("[data-value='reference']") ?? undefined)
            : value() === "learn"
              ? (bar.querySelector("[data-value='learn']") ?? undefined)
              : undefined,
      }),
    ],
  }) as HTMLElement;
  const learnTrigger = (): HTMLElement => bar.querySelector("[data-value='learn']") as HTMLElement;
  const referenceTrigger = (): HTMLElement =>
    bar.querySelector("[data-value='reference']") as HTMLElement;
  const clickTrigger = async (get: () => HTMLElement, min = 1): Promise<HTMLElement> => {
    get().dispatchEvent(new Event("click", { bubbles: true }));
    return awaitPortaled("navigation-menu-content", min);
  };
  return { bar, value, onValueChange, learnTrigger, referenceTrigger, clickTrigger };
}
