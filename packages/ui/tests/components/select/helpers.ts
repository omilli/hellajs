import { vi } from "vite-plus/test";
import { renderVariant, type ComponentVariant } from "../../helpers/variants-core";
import { type SelectVariantProps } from "./variants";
import { awaitPortaled } from "../../helpers/anchored";

export const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
];

/** Opens the select by clicking the trigger and resolves the portaled listbox once the mount walk finished. */
export async function openSelect(
  variant: ComponentVariant<SelectVariantProps>,
  props: SelectVariantProps = {},
) {
  const onValueChange = vi.fn<(value: string) => void>(() => {});
  const trigger = renderVariant(variant, { items: FRUITS, onValueChange, ...props });
  trigger.dispatchEvent(new Event("click"));
  const content = await awaitPortaled("select-content");
  return { onValueChange, trigger, content };
}

/** Installs a recording scrollIntoView on HTMLElement.prototype for the open-focus assertion. */
export function spyScrollIntoView(): { scrolled: Element[]; restore: () => void } {
  const scrolled: Element[] = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView = function (
    this: Element,
  ) {
    scrolled.push(this);
  };
  return {
    scrolled,
    restore: () => {
      if (desc?.value) HTMLElement.prototype.scrollIntoView = desc.value;
      else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    },
  };
}
