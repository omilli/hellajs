import { expect } from "vite-plus/test";
import type { Mock } from "vite-plus/test";
import { delay, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import type { UiStyle } from "@hellajs/ui";

/** Prop bag shared by every compiled Card part (mirrors the emitted CardPartProps). */
export interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
/** One compiled component flavor — a style's canonical. */
export interface ComponentVariant<P extends object> {
  style: UiStyle;
  render: (props: P) => JSX.Element;
  /** Resolves the compared root for portal variants; defaults to the mount container's first element child. */
  root?: () => Element | null;
}
/** ComponentVariant for a component that renders children. */
export interface ChildrenVariant<P extends object> extends ComponentVariant<P> {
  child: (value: HellaChild) => HellaChildren;
}
/** One named part of a multi-part component, at one flavor. */
export interface PartVariant<P extends object> extends ComponentVariant<P> {
  part: string;
}
export type AnyModule = Record<string, (props: never) => JSX.Element>;
/** Builds one PartVariant per flavor for a named component part. */
export function partVariants<P extends object>(
  part: string,
  prop: string,
  modules: [mod: AnyModule, style: UiStyle][],
): PartVariant<P>[] {
  return modules.map(([mod, style]) => ({
    part,
    style,
    render: mod[`${prop}${part}`] as unknown as (props: P) => JSX.Element,
  }));
}
/**
 * Mounts a compiled variant into a fresh container and returns the rendered root element.
 * @param variant Compiled variant to render.
 * @param props Props handed to the variant's component.
 */
export function renderVariant<P extends object>(variant: ComponentVariant<P>, props: P): Element {
  const container = setupContainer();
  const rendered = variant.render(props);
  // An isDynamic meta-component result (Portal/ForEach roots) has no flagged build for mount to
  // root — the template wrapper dispatches it as a child (child() hands it the parent);
  // flagged builds mount directly and are the container's root.
  mount("isTemplate" in rendered ? rendered : <div>{rendered}</div>, container);
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
/** Injectable content watcher seam shared by the scroller viewport and composed root (mirrors the emitted prop). */
export type ScrollerObserve = (target: Element, onGrow: () => void) => () => void;
/** Anchored-overlay side/align unions shared by the tooltip/hover-card/popover prop bags (mirrors the emitted unions). */
export type AnchoredSide = "top" | "bottom" | "left" | "right";
export type AnchoredAlign = "start" | "center" | "end";
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
): (props: P) => JSX.Element {
  return modules[variant.style][name] as unknown as (props: P) => JSX.Element;
}
/** Item shape of every compiled menu RadioGroup variant (mirrors the emitted RadioGroupEntry). */
export interface MenuRadioEntryVariant {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}
/** Superset prop bag across AlertDialog parts (mirrors the emitted part props). */
export interface AlertDialogPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  class?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onClose?: () => void;
}
