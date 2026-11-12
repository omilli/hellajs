import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { mount, peekState } from "@hellajs/dom";
import { accordionVariants } from "./variants";
import {
  assertAttrForwarded,
  assertStructuralParity,
  classTokens,
} from "../../helpers/variants-core";
import type { AccordionEntryVariant, AccordionVariantProps } from "./variants";
import type { ComponentVariant } from "../../helpers/variants-core";

beforeEach(() => {
  resetTestState();
});

const items: AccordionEntryVariant[] = [
  { value: "alpha", trigger: "Alpha", content: "Alpha body" },
  { value: "beta", trigger: "Beta", content: "Beta body" },
  { value: "gamma", trigger: "Gamma", content: "Gamma body" },
];

/** Mounts an accordion variant into a fresh container and resolves root plus one query per slot. */
function mountAccordion(
  variant: ComponentVariant<AccordionVariantProps>,
  props: AccordionVariantProps,
) {
  const container = setupContainer();
  const rendered = variant.render(props);
  mount(rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const itemEls = Array.from(
    root.querySelectorAll('[data-slot="accordion-item"]'),
  ) as HTMLElement[];
  const triggers = Array.from(
    root.querySelectorAll('[data-slot="accordion-trigger"]'),
  ) as HTMLElement[];
  const contents = Array.from(
    root.querySelectorAll('[data-slot="accordion-content"]'),
  ) as HTMLElement[];
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

/** Polls (microtask hops) until the observer-driven mount walk has wired the root's afterMount hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

/** Dispatches a bubbling keydown at a trigger; rovingTabIndex listens on the root ancestor. */
function press(trigger: HTMLElement, key: string): void {
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("accordion", () => {
  test.each(accordionVariants)(
    "$style opens only the open-seeded items with the id cycle intact",
    (variant) => {
      const { itemEls, triggers, contents } = mountAccordion(variant, {
        items,
        defaultValue: "beta",
      });
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
    },
  );

  test.each(accordionVariants)(
    "$style clamps a multi-value open seed to the first item in single type",
    (variant) => {
      const { itemEls } = mountAccordion(variant, { items, defaultValue: ["beta", "gamma"] });
      expect(openIndexes(itemEls)).toEqual([1]);
    },
  );

  test.each(accordionVariants)(
    "$style swaps the open item in single type and refuses the last close without collapsible",
    (variant) => {
      const { itemEls, triggers } = mountAccordion(variant, { items, defaultValue: "beta" });
      triggers[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([2]);
      expect(triggers[2]!.getAttribute("aria-expanded")).toBe("true");
      expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
      triggers[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([2]);
    },
  );

  test.each(accordionVariants)(
    "$style closes the open item in single type when collapsible",
    (variant) => {
      const { itemEls, triggers } = mountAccordion(variant, {
        items,
        defaultValue: "beta",
        collapsible: true,
      });
      expect(openIndexes(itemEls)).toEqual([1]);
      triggers[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([]);
      expect(triggers[1]!.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(accordionVariants)(
    "$style keeps N items open and closable independently in multiple type",
    (variant) => {
      const { itemEls, triggers, contents } = mountAccordion(variant, {
        items,
        type: "multiple",
        defaultValue: ["beta"],
      });
      triggers[0]!.dispatchEvent(new Event("click"));
      triggers[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([0, 1, 2]);
      triggers[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([0, 2]);
      expect(openIndexes(contents)).toEqual([0, 2]);
    },
  );

  test.each(accordionVariants)(
    "$style ignores activation of a disabled item and marks it aria-disabled",
    (variant) => {
      const disabledItems: AccordionEntryVariant[] = [
        ...items,
        { value: "delta", trigger: "Delta", content: "Delta body", disabled: true },
      ];
      const { itemEls, triggers } = mountAccordion(variant, { items: disabledItems });
      expect(triggers[3]!.getAttribute("aria-disabled")).toBe("true");
      expect(triggers[3]!.hasAttribute("disabled")).toBe(true);
      if (variant.style === "tailwind") {
        const tokens = classTokens(triggers[3]!);
        expect(tokens).toContain("disabled:pointer-events-none");
        expect(tokens).toContain("disabled:opacity-50");
      } else {
        expect(
          classTokens(triggers[3]!).some((token) => token.startsWith("accordion-trigger")),
        ).toBe(true);
      }
      triggers[3]!.dispatchEvent(new Event("click"));
      flush();
      expect(openIndexes(itemEls)).toEqual([]);
    },
  );

  test.each(accordionVariants)(
    "$style keeps closed content mounted under data-state=closed for the grid collapse",
    (variant) => {
      const { triggers, contents } = mountAccordion(variant, { items, defaultValue: "beta" });
      expect(contents[1]!.getAttribute("data-state")).toBe("open");
      triggers[2]!.dispatchEvent(new Event("click"));
      // The closed pair stays mounted under data-state=closed (grid collapse, no unmount);
      // the clicked gamma item is the one open panel.
      expect(contents[0]!.isConnected).toBe(true);
      expect(contents[1]!.isConnected).toBe(true);
      expect(contents[0]!.getAttribute("data-state")).toBe("closed");
      flush();
      expect(contents[1]!.getAttribute("data-state")).toBe("closed");
      expect(contents[2]!.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(accordionVariants)(
    "$style mirrors data-state onto the content inner so closed padding floors at zero",
    (variant) => {
      const { contents } = mountAccordion(variant, { items, defaultValue: "beta" });
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
    },
  );

  test.each(accordionVariants)(
    "$style carries per-item data-state and the chevron rotate wiring",
    (variant) => {
      const { itemEls, triggers } = mountAccordion(variant, { items, defaultValue: "alpha" });
      expect(itemEls.map((item) => item.getAttribute("data-value"))).toEqual([
        "alpha",
        "beta",
        "gamma",
      ]);
      flush();
      expect(itemEls[0]!.getAttribute("data-state")).toBe("open");
      expect(itemEls[1]!.getAttribute("data-state")).toBe("closed");
      expect(triggers[0]!.querySelector("[data-slot='accordion-icon']")).not.toBeNull();
      const tokens = classTokens(triggers[0]!);
      if (variant.style === "tailwind") {
        expect(tokens).toContain("[&[data-state=open]>svg]:rotate-180");
      } else {
        expect(tokens.some((token) => token.startsWith("accordion-trigger"))).toBe(true);
      }
    },
  );

  test.each(accordionVariants)(
    "$style re-renders a signal items list across append, remove, and reorder",
    (variant) => {
      const liveItems = signal<AccordionEntryVariant[]>([...items]);
      const { root } = mountAccordion(variant, { items: liveItems, defaultValue: "beta" });
      const values = () =>
        Array.from(root.querySelectorAll('[data-slot="accordion-item"]')).map((el) =>
          el.getAttribute("data-value"),
        );
      flush();
      expect(values()).toEqual(["alpha", "beta", "gamma"]);
      liveItems([...liveItems(), { value: "delta", trigger: "Delta", content: "Delta body" }]);
      flush();
      expect(values()).toEqual(["alpha", "beta", "gamma", "delta"]);
      liveItems(liveItems().filter((entry) => entry.value !== "beta"));
      flush();
      expect(values()).toEqual(["alpha", "gamma", "delta"]);
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(values()).toEqual(["delta", "alpha", "gamma"]);
    },
  );

  test.each(accordionVariants)(
    "$style reuses the open item's node through a reorder when keyBy is value",
    (variant) => {
      const liveItems = signal<AccordionEntryVariant[]>([...items]);
      const { root } = mountAccordion(variant, {
        items: liveItems,
        defaultValue: "beta",
        keyBy: "value",
      });
      const itemEls = () =>
        Array.from(root.querySelectorAll('[data-slot="accordion-item"]')) as HTMLElement[];
      const betaBefore = itemEls().find((el) => el.getAttribute("data-value") === "beta")!;
      expect(betaBefore.getAttribute("data-state")).toBe("open");
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(itemEls().map((el) => el.getAttribute("data-value"))).toEqual([
        "gamma",
        "alpha",
        "beta",
      ]);
      const betaAfter = itemEls().find((el) => el.getAttribute("data-value") === "beta")!;
      expect(betaAfter).toBe(betaBefore);
      expect(betaAfter.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(accordionVariants)(
    "$style keeps the reconciliation key out of the markup when keyBy is value",
    (variant) => {
      const { root } = mountAccordion(variant, { items, keyBy: "value" });
      expect(root.outerHTML).not.toContain("key=");
    },
  );

  test.each(accordionVariants)(
    "$style moves focus between triggers with the arrow keys and Home/End without toggling",
    async (variant) => {
      const { root, triggers } = mountAccordion(variant, { items, defaultValue: "beta" });
      await awaitWiring(root);
      expect(triggers.map((trigger) => trigger.tabIndex)).toEqual([0, -1, -1]);
      triggers[0]!.focus();
      press(triggers[0]!, "ArrowDown");
      flush();
      expect(document.activeElement).toBe(triggers[1]!);
      expect(triggers[1]!.getAttribute("data-state")).toBe("open");
      expect(triggers.map((trigger) => trigger.tabIndex)).toEqual([-1, 0, -1]);
      press(triggers[1]!, "ArrowDown");
      flush();
      expect(document.activeElement).toBe(triggers[2]!);
      press(triggers[2]!, "ArrowUp");
      flush();
      expect(document.activeElement).toBe(triggers[1]!);
      press(triggers[1]!, "Home");
      flush();
      expect(document.activeElement).toBe(triggers[0]!);
      press(triggers[0]!, "End");
      flush();
      expect(document.activeElement).toBe(triggers[2]!);
      expect(
        openIndexes(Array.from(root.querySelectorAll("[data-slot='accordion-item']"))),
      ).toEqual([1]);
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(accordionVariants, { items });
  });

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(accordionVariants, { items, title: "Hella" }, "title", "Hella");
  });

  test("merges a user class into the root class across both styles", () => {
    for (const variant of accordionVariants) {
      const { root } = mountAccordion(variant, { items, class: "acc-root" });
      expect(classTokens(root)).toContain("acc-root");
    }
  });

  test.each(accordionVariants)(
    "$style renders the controlled value and reports clicks without writing internal state",
    (variant) => {
      const onValueChange = vi.fn();
      const { itemEls, triggers } = mountAccordion(variant, {
        items,
        value: () => "beta",
        onValueChange,
      });
      expect(openIndexes(itemEls)).toEqual([1]);
      triggers[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("gamma");
      // Controlled: the root never writes its internal set, so beta stays open.
      expect(openIndexes(itemEls)).toEqual([1]);
    },
  );

  test.each(accordionVariants)(
    "$style round-trips a controlled signal so the emitted update flips the DOM",
    (variant) => {
      const open = signal<string>("beta");
      const { itemEls, triggers } = mountAccordion(variant, {
        items,
        value: () => open(),
        onValueChange: (v) => open(typeof v === "string" ? v : ""),
      });
      expect(openIndexes(itemEls)).toEqual([1]);
      triggers[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(open()).toBe("gamma");
      expect(openIndexes(itemEls)).toEqual([2]);
    },
  );

  test.each(accordionVariants)(
    "$style reports the membership array in controlled multiple mode",
    (variant) => {
      const onValueChange = vi.fn();
      const { itemEls, triggers } = mountAccordion(variant, {
        items,
        type: "multiple",
        value: () => ["alpha"],
        onValueChange,
      });
      expect(openIndexes(itemEls)).toEqual([0]);
      triggers[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(["alpha", "beta"]);
    },
  );
});
