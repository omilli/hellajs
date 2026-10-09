import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { html, mount } from "@hellajs/dom";
import {
  accordionPartVariants,
  accordionVariants,
  assertAttrForwarded,
  assertStructuralParity,
  classTokens,
} from "./helpers/variants";
import type { AccordionEntryVariant, AccordionVariantProps, ComponentVariant } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

const items: AccordionEntryVariant[] = [
  { value: "alpha", trigger: "Alpha", content: "Alpha body" },
  { value: "beta", trigger: "Beta", content: "Beta body" },
  { value: "gamma", trigger: "Gamma", content: "Gamma body" },
];

/** Mounts an accordion variant into a fresh container and resolves root plus one query per slot. */
function mountAccordion(variant: ComponentVariant<AccordionVariantProps>, props: AccordionVariantProps) {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const itemEls = Array.from(root.querySelectorAll('[data-slot="accordion-item"]')) as HTMLElement[];
  const triggers = Array.from(root.querySelectorAll('[data-slot="accordion-trigger"]')) as HTMLElement[];
  const contents = Array.from(root.querySelectorAll('[data-slot="accordion-content"]')) as HTMLElement[];
  return { root, itemEls, triggers, contents };
}

/** Resolves the indexes of open items from their data-state attributes. */
function openIndexes(states: (HTMLElement | Element)[]): number[] {
  const open: number[] = [];
  states.forEach((el, i) => {
    if (el.getAttribute("data-state") === "open") open.push(i);
  });
  return open;
}

describe("accordion", () => {
  test.each(accordionVariants)("$format/$style opens only the open-seeded items with the id cycle intact", (variant) => {
    const { itemEls, triggers, contents } = mountAccordion(variant, { items, open: "beta" });
    expect(openIndexes(itemEls)).toEqual([1]);
    expect(openIndexes(triggers)).toEqual([1]);
    expect(openIndexes(contents)).toEqual([1]);
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("true");
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(triggers[1]!.id).toBe("hella-accordion-trigger-beta");
    expect(triggers[1]!.getAttribute("aria-controls")).toBe("hella-accordion-content-beta");
    expect(contents[1]!.id).toBe("hella-accordion-content-beta");
    expect(contents[1]!.getAttribute("aria-labelledby")).toBe("hella-accordion-trigger-beta");
    expect(contents[1]!.getAttribute("role")).toBe("region");
    expect(contents[1]!.textContent).toContain("Beta body");
  });

  test.each(accordionVariants)("$format/$style clamps a multi-value open seed to the first item in single type", (variant) => {
    const { itemEls } = mountAccordion(variant, { items, open: ["beta", "gamma"] });
    expect(openIndexes(itemEls)).toEqual([1]);
  });

  test.each(accordionVariants)("$format/$style swaps the open item in single type and refuses the last close without collapsible", (variant) => {
    const { itemEls, triggers } = mountAccordion(variant, { items, open: "beta" });
    triggers[2]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([2]);
    expect(triggers[2]!.getAttribute("aria-expanded")).toBe("true");
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
    triggers[2]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([2]);
  });

  test.each(accordionVariants)("$format/$style closes the open item in single type when collapsible", (variant) => {
    const { itemEls, triggers } = mountAccordion(variant, { items, open: "beta", collapsible: true });
    expect(openIndexes(itemEls)).toEqual([1]);
    triggers[1]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([]);
    expect(triggers[1]!.getAttribute("data-state")).toBe("closed");
  });

  test.each(accordionVariants)("$format/$style keeps N items open and closable independently in multiple type", (variant) => {
    const { itemEls, triggers, contents } = mountAccordion(variant, { items, type: "multiple", open: ["beta"] });
    triggers[0]!.dispatchEvent(new Event("click"));
    triggers[2]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([0, 1, 2]);
    triggers[1]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([0, 2]);
    expect(openIndexes(contents)).toEqual([0, 2]);
  });

  test.each(accordionVariants)("$format/$style ignores activation of a disabled item and marks it aria-disabled", (variant) => {
    const disabledItems: AccordionEntryVariant[] = [...items, { value: "delta", trigger: "Delta", content: "Delta body", disabled: true }];
    const { itemEls, triggers } = mountAccordion(variant, { items: disabledItems });
    expect(triggers[3]!.getAttribute("aria-disabled")).toBe("true");
    expect(triggers[3]!.hasAttribute("disabled")).toBe(true);
    if (variant.style === "tailwind") {
      const tokens = classTokens(triggers[3]!);
      expect(tokens).toContain("disabled:pointer-events-none");
      expect(tokens).toContain("disabled:opacity-50");
    } else {
      expect(classTokens(triggers[3]!).some((token) => token.startsWith("accordion-trigger"))).toBe(true);
    }
    triggers[3]!.dispatchEvent(new Event("click"));
    expect(openIndexes(itemEls)).toEqual([]);
  });

  test.each(accordionVariants)("$format/$style keeps closed content mounted under data-state=closed for the grid collapse", (variant) => {
    const { triggers, contents } = mountAccordion(variant, { items, open: "beta" });
    expect(contents[1]!.getAttribute("data-state")).toBe("open");
    triggers[2]!.dispatchEvent(new Event("click"));
    // The closed pair stays mounted under data-state=closed (grid collapse, no unmount);
    // the clicked gamma item is the one open panel.
    expect(contents[0]!.isConnected).toBe(true);
    expect(contents[1]!.isConnected).toBe(true);
    expect(contents[0]!.getAttribute("data-state")).toBe("closed");
    expect(contents[1]!.getAttribute("data-state")).toBe("closed");
    expect(contents[2]!.getAttribute("data-state")).toBe("open");
  });

  test.each(accordionVariants)("$format/$style mirrors data-state onto the content inner so closed padding floors at zero", (variant) => {
    const { contents } = mountAccordion(variant, { items, open: "beta" });
    // A static padding-bottom on the collapsing grid item floors the 0fr row at its own
    // height, reserving dead space under closed items; the inner mirrors data-state so
    // its padding transitions to 0 instead.
    const inners = contents.map((content) => content.firstElementChild!);
    expect(inners[1]!.getAttribute("data-state")).toBe("open");
    expect(inners[0]!.getAttribute("data-state")).toBe("closed");
    expect(inners[2]!.getAttribute("data-state")).toBe("closed");
    const tokens = classTokens(inners[0]!);
    if (variant.style === "tailwind") {
      expect(tokens).toContain("pb-0");
      expect(tokens).toContain("data-[state=open]:pb-4");
    } else {
      expect(tokens.some((token) => token.startsWith("accordion-content-inner"))).toBe(true);
    }
  });

  test.each(accordionVariants)("$format/$style carries per-item data-state and the chevron rotate wiring", (variant) => {
    const { itemEls, triggers } = mountAccordion(variant, { items, open: "alpha" });
    expect(itemEls.map((item) => item.getAttribute("data-value"))).toEqual(["alpha", "beta", "gamma"]);
    expect(itemEls[0]!.getAttribute("data-state")).toBe("open");
    expect(itemEls[1]!.getAttribute("data-state")).toBe("closed");
    expect(triggers[0]!.querySelector("[data-slot='accordion-icon']")).not.toBeNull();
    const tokens = classTokens(triggers[0]!);
    if (variant.style === "tailwind") {
      expect(tokens).toContain("[&[data-state=open]>svg]:rotate-180");
    } else {
      expect(tokens.some((token) => token.startsWith("accordion-trigger"))).toBe(true);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(accordionVariants, { items });
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(accordionVariants, { items, title: "Hella" }, "title", "Hella");
  });

  test("merges a user class into the root class across all four variants", () => {
    for (const variant of accordionVariants) {
      const { root } = mountAccordion(variant, { items, class: "acc-root" });
      expect(classTokens(root)).toContain("acc-root");
    }
  });

  test("chains a user on:click with the owned toggle on a trigger across all four variants", () => {
    for (const variant of accordionPartVariants.filter((candidate) => candidate.part === "Trigger")) {
      const userClick = mock(() => {});
      const open = signal(false);
      const container = setupContainer();
      const props: Record<string, unknown> = {
        id: "t1",
        active: () => open(),
        onToggle: () => open(!open()),
        "on:click": userClick,
        children: "Toggle",
      };
      const rendered = variant.render(props as never);
      mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
      const trigger = container.querySelector('[data-slot="accordion-trigger"]')!;
      trigger.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
      expect(open()).toBe(true);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    }
  });

  test("renders every named part with its data-slot and state across all four variants", () => {
    for (const variant of accordionPartVariants) {
      const container = setupContainer();
      const props: Record<string, unknown> = { children: ["Body"] };
      if (variant.part === "Item") {
        props.value = "alpha";
        props.active = () => true;
      } else if (variant.part === "Trigger") {
        props.id = "trigger-id";
        props.active = () => true;
        props.onToggle = () => {};
        props["aria-controls"] = "content-id";
      } else {
        props.id = "content-id";
        props["aria-labelledby"] = "trigger-id";
        props.active = () => false;
      }
      const rendered = variant.render(props as never);
      mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
      // AccordionTrigger mounts as its header wrapper; resolve the trigger button inside it.
      const el = variant.part === "Trigger"
        ? container.querySelector('[data-slot="accordion-trigger"]')!
        : container.firstElementChild!;;
      if (variant.part === "Item") {
        expect(el.getAttribute("data-slot")).toBe("accordion-item");
        expect(el.getAttribute("data-value")).toBe("alpha");
        expect(el.getAttribute("data-state")).toBe("open");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("accordion-trigger");
        expect(el.getAttribute("aria-expanded")).toBe("true");
        expect(el.getAttribute("aria-controls")).toBe("content-id");
        expect(el.getAttribute("data-state")).toBe("open");
      } else {
        expect(el.getAttribute("data-slot")).toBe("accordion-content");
        expect(el.getAttribute("role")).toBe("region");
        expect(el.getAttribute("aria-labelledby")).toBe("trigger-id");
        expect(el.getAttribute("data-state")).toBe("closed");
      }
    }
  });
});
