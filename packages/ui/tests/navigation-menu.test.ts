import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import type { HellaNode } from "@hellajs/dom";
import {
  assertStructuralParity,
  navigationMenuPartVariants,
  navigationMenuVariants,
  renderVariant,
  type ComponentVariant,
  type NavigationMenuPartVariantProps,
  type NavigationMenuVariantProps,
} from "./helpers/variants";
import { awaitDetached, awaitPortaled, pinRect } from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
});

/** Resolves one compiled NavigationMenu part (full export name) at the variant's flavor. */
function part<P extends NavigationMenuPartVariantProps>(variant: ComponentVariant<NavigationMenuVariantProps>, name: string, props: P): HellaNode {
  const found = navigationMenuPartVariants.find(
    (candidate) => candidate.part === name && candidate.style === variant.style && candidate.format === variant.format,
  )!;
  return (found.render as unknown as (bag: P) => HellaNode)(props);
}

interface NavFixture {
  bar: HTMLElement;
  value: ReturnType<typeof signal<string>>;
  onValueChange: ReturnType<typeof mock<(value: string) => void>>;
  learnTrigger: () => HTMLElement;
  referenceTrigger: () => HTMLElement;
  clickTrigger: (get: () => HTMLElement) => Promise<HTMLElement>;
}

/** Builds a two-trigger bar whose triggers and contents share one signal; the root appends the shared viewport. */
function buildNav(variant: ComponentVariant<NavigationMenuVariantProps>): NavFixture {
  const value = signal("");
  const onValueChange = mock<(value: string) => void>(() => {});
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
      part(variant, "Indicator", {
        anchor: () => (value() === "reference"
          ? bar.querySelector("[data-value='reference']") ?? undefined
          : value() === "learn"
            ? bar.querySelector("[data-value='learn']") ?? undefined
            : undefined),
      }),
    ],
  }) as HTMLElement;
  const learnTrigger = (): HTMLElement => bar.querySelector("[data-value='learn']") as HTMLElement;
  const referenceTrigger = (): HTMLElement => bar.querySelector("[data-value='reference']") as HTMLElement;
  const clickTrigger = async (get: () => HTMLElement): Promise<HTMLElement> => {
    get().dispatchEvent(new Event("click", { bubbles: true }));
    return awaitPortaled("navigation-menu-content");
  };
  return { bar, value, onValueChange, learnTrigger, referenceTrigger, clickTrigger };
}

describe("navigation-menu", () => {
  test.each(navigationMenuVariants)("$format/$style renders the trigger into the list with data-viewport on the bar", (variant) => {
    const { bar, learnTrigger } = buildNav(variant);
    expect(bar.getAttribute("data-slot")).toBe("navigation-menu");
    expect(bar.getAttribute("data-viewport")).toBe("true");
    expect(bar.querySelector("[data-slot='navigation-menu-list']")).not.toBeNull();
    const trigger = learnTrigger();
    expect(trigger.getAttribute("data-slot")).toBe("navigation-menu-trigger");
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(bar.querySelector("[data-slot='navigation-menu-viewport']")).not.toBeNull();
  });

  test.each(navigationMenuVariants)("$format/$style activates a trigger and renders its content into the viewport slot", async (variant) => {
    const { bar, value, onValueChange, learnTrigger, clickTrigger } = buildNav(variant);
    const content = await clickTrigger(learnTrigger);
    const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
    expect(value()).toBe("learn");
    expect(onValueChange).toHaveBeenCalledWith("learn");
    expect(viewport.contains(content)).toBe(true);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toContain("Intro");
    expect(viewport.getAttribute("data-state")).toBe("open");
    expect(learnTrigger().getAttribute("data-state")).toBe("open");
    expect(learnTrigger().getAttribute("aria-expanded")).toBe("true");
  });

  test.each(navigationMenuVariants)("$format/$style swaps the viewport content when the second trigger activates", async (variant) => {
    const { bar, value, learnTrigger, referenceTrigger, clickTrigger } = buildNav(variant);
    const first = await clickTrigger(learnTrigger);
    const second = await clickTrigger(referenceTrigger);
    const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
    expect(value()).toBe("reference");
    expect(viewport.contains(second)).toBe(true);
    expect(second.textContent).toContain("API");
    expect(first.getAttribute("data-state")).toBe("closed");
    expect(second.getAttribute("data-state")).toBe("open");
    first.dispatchEvent(new Event("animationend"));
    await awaitDetached(first);
    expect(viewport.contains(first)).toBe(false);
  });

  test.each(navigationMenuVariants)("$format/$style closes on a second activation of the open trigger", async (variant) => {
    const { value, learnTrigger, clickTrigger } = buildNav(variant);
    await clickTrigger(learnTrigger);
    learnTrigger().dispatchEvent(new Event("click", { bubbles: true }));
    expect(value()).toBe("");
    expect(learnTrigger().getAttribute("data-state")).toBe("closed");
  });

  test.each(navigationMenuVariants)("$format/$style toggles the viewport data-state with the bar store", (variant) => {
    const { bar, value, learnTrigger } = buildNav(variant);
    const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
    expect(viewport.getAttribute("data-state")).toBe("closed");
    value("learn");
    expect(viewport.getAttribute("data-state")).toBe("open");
    expect(learnTrigger().getAttribute("data-state")).toBe("open");
  });

  test.each(navigationMenuVariants)("$format/$style renders the indicator and transitions it between trigger positions", async (variant) => {
    const { bar, learnTrigger, referenceTrigger, clickTrigger } = buildNav(variant);
    const indicator = bar.querySelector("[data-slot='navigation-menu-indicator']") as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator.getAttribute("data-state")).toBe("hidden");
    pinRect(bar, 0, 0, 400, 40);
    pinRect(learnTrigger(), 0, 0, 120, 40);
    pinRect(referenceTrigger(), 0, 150, 80, 40);
    await clickTrigger(learnTrigger);
    expect(indicator.getAttribute("data-state")).toBe("visible");
    expect(indicator.style.width).toBe("120px");
    expect(indicator.style.transform).toBe("translateX(0px)");
    await clickTrigger(referenceTrigger);
    expect(indicator.style.width).toBe("80px");
    expect(indicator.style.transform).toBe("translateX(150px)");
  });

  test.each(navigationMenuVariants)("$format/$style marks the active link with data-active", (variant) => {
    const container = setupContainer();
    const rendered = part(variant, "Link", { href: "#docs", active: true, children: "Docs" });
    mount(typeof rendered === "function" ? rendered : rendered, container);
    const link = container.querySelector("[data-slot='navigation-menu-link']")!;
    expect(link.getAttribute("data-active")).toBe("true");
    expect(link.getAttribute("href")).toBe("#docs");
  });

  test.each(navigationMenuVariants)("$format/$style supports manual viewport wiring through viewport={false} and explicit selectors", async (variant) => {
    const value = signal("");
    const slot = document.createElement("div");
    slot.setAttribute("data-slot", "navigation-menu-viewport");
    slot.id = "manual-viewport";
    document.body.appendChild(slot);
    const bar = renderVariant(variant, {
      viewport: false,
      children: [
        part(variant, "Item", {
          children: [
            part(variant, "Trigger", {
              value: "learn",
              active: () => value() === "learn",
              onActivate: () => value(value() === "learn" ? "" : "learn"),
              children: "Learn",
            }),
            part(variant, "Content", {
              active: () => value() === "learn",
              viewport: "#manual-viewport",
              children: ["Manual"],
            }),
          ],
        }),
      ],
    }) as HTMLElement;
    expect(bar.getAttribute("data-viewport")).toBe("false");
    expect(bar.querySelector("[data-slot='navigation-menu-viewport']")).toBeNull();
    bar.querySelector("[data-value='learn']")!.dispatchEvent(new Event("click", { bubbles: true }));
    const content = await awaitPortaled("navigation-menu-content");
    expect(slot.contains(content)).toBe(true);
    slot.remove();
  });

  test.each(navigationMenuVariants)("$format/$style indicator follows announcements without an anchor and re-measures on resize", async (variant) => {
    const value = signal("");
    const toggle = (id: string): void => value(value() === id ? "" : id);
    const bar = renderVariant(variant, {
      children: [
        part(variant, "Item", {
          children: [
            part(variant, "Trigger", {
              value: "learn",
              active: () => value() === "learn",
              onActivate: () => toggle("learn"),
              children: "Learn",
            }),
            part(variant, "Content", { active: () => value() === "learn", children: ["Panel"] }),
          ],
        }),
        part(variant, "Indicator", {}),
      ],
    }) as HTMLElement;
    const indicator = bar.querySelector("[data-slot='navigation-menu-indicator']") as HTMLElement;
    const trigger = bar.querySelector("[data-value='learn']") as HTMLElement;
    pinRect(bar, 0, 0, 400, 40);
    pinRect(trigger, 0, 40, 90, 40);
    expect(indicator.getAttribute("data-state")).toBe("hidden");
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(indicator.getAttribute("data-state")).toBe("visible");
    expect(indicator.style.transform).toBe("translateX(40px)");
    expect(indicator.style.width).toBe("90px");
    pinRect(trigger, 0, 60, 90, 40);
    window.dispatchEvent(new Event("resize"));
    expect(indicator.style.transform).toBe("translateX(60px)");
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(indicator.getAttribute("data-state")).toBe("hidden");
  });

  test.each(navigationMenuVariants)("$format/$style dismisses the exit fallback when a panel reopens mid-exit", async (variant) => {
    const value = signal("");
    const bar = renderVariant(variant, {
      children: [
        part(variant, "Item", {
          children: [
            part(variant, "Trigger", {
              value: "learn",
              active: () => value() === "learn",
              onActivate: () => value(value() === "learn" ? "" : "learn"),
              children: "Learn",
            }),
            part(variant, "Content", { active: () => value() === "learn", children: ["Panel"] }),
          ],
        }),
      ],
    }) as HTMLElement;
    const trigger = bar.querySelector("[data-value='learn']") as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    const first = await awaitPortaled("navigation-menu-content");
    value("");
    expect(first.getAttribute("data-state")).toBe("closed");
    value("learn");
    expect(first.getAttribute("data-state")).toBe("open");
    expect(first.isConnected).toBe(true);
  });

  test.each(navigationMenuVariants)("$format/$style drops the indicator and resize wiring on unmount", (variant) => {
    const value = signal("");
    const container = setupContainer();
    const rendered = variant.render({
      children: [
        part(variant, "Indicator", { active: () => value() !== "" }),
      ],
    });
    const handle = mount(typeof rendered === "function" ? rendered : rendered, container);
    const indicator = container.querySelector("[data-slot='navigation-menu-indicator']") as HTMLElement;
    expect(indicator).not.toBeNull();
    handle.unmount();
    expect(container.contains(indicator)).toBe(false);
    expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(navigationMenuVariants, { children: [] });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    const slot = document.createElement("div");
    slot.setAttribute("data-slot", "navigation-menu-viewport");
    document.body.appendChild(slot);
    for (const variant of navigationMenuPartVariants) {
      const container = setupContainer();
      // Content only renders while active; give it an accessor so it portals into the slot.
      const rendered = variant.render({ children: [], ...(variant.part === "Content" ? { active: () => true } : {}) });
      mount(typeof rendered === "function" ? rendered : rendered, container);
      // Content resolves through the portal; Viewport carries its slot on the inner div.
      const el = variant.part === "Content" ? portaledContent()
        : variant.part === "Viewport" ? container.querySelector("[data-slot='navigation-menu-viewport']")!
        : container.firstElementChild!;
      expect(el.getAttribute("data-slot")).toBe(`navigation-menu-${variant.part.toLowerCase()}`);
    }
    slot.remove();
  });
});

/** The freshest portaled content node (the sweep runs before observers flush, so no polling here). */
function portaledContent(): Element {
  const nodes = document.querySelectorAll("[data-slot='navigation-menu-content']");
  return nodes[nodes.length - 1]!;
}
