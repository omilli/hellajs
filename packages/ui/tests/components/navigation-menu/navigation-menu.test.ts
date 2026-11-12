import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { assertStructuralParity, classTokens, renderVariant } from "../../helpers/variants-core";
import { navigationMenuPartVariants, navigationMenuVariants } from "./variants";
import { awaitDetached, awaitPortaled } from "../../helpers/anchored";
import { part, buildNav } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("navigation-menu", () => {
  test.each(navigationMenuVariants)(
    "$style renders the trigger into the list with data-viewport on the bar",
    (variant) => {
      const { bar, learnTrigger } = buildNav(variant);
      expect(bar.getAttribute("data-slot")).toBe("navigation-menu");
      expect(bar.getAttribute("data-viewport")).toBe("false");
      expect(bar.querySelector("[data-slot='navigation-menu-list']")).not.toBeNull();
      const trigger = learnTrigger();
      expect(trigger.getAttribute("data-slot")).toBe("navigation-menu-trigger");
      expect(trigger.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.querySelector("svg")).not.toBeNull();
      // The root auto-appends no slot: the fixture's explicit Viewport part is the only one.
      expect(bar.querySelectorAll("[data-slot='navigation-menu-viewport']")).toHaveLength(1);
    },
  );

  test.each(navigationMenuVariants)(
    "$style activates a trigger and renders its content into the viewport slot",
    async (variant) => {
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
    },
  );

  test.each(navigationMenuVariants)(
    "$style opens the panel on trigger hover without a click",
    async (variant) => {
      const { bar, learnTrigger } = buildNav(variant);
      learnTrigger().dispatchEvent(new Event("pointerenter"));
      const content = await awaitPortaled("navigation-menu-content");
      const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
      expect(viewport.contains(content)).toBe(true);
      expect(learnTrigger().getAttribute("data-state")).toBe("open");
    },
  );

  test.each(navigationMenuVariants)(
    "$style a pointerdown outside the bar closes the open panel",
    async (variant) => {
      const { bar, learnTrigger, clickTrigger } = buildNav(variant);
      const content = await clickTrigger(learnTrigger);
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      flush();
      expect(
        bar.querySelector("[data-slot='navigation-menu-viewport']")!.getAttribute("data-state"),
      ).toBe("closed");
      content.dispatchEvent(new Event("animationend"));
      await awaitDetached(content);
    },
  );

  test.each(navigationMenuVariants)(
    "$style a trigger's announcements do not leak into a second bar",
    async (variant) => {
      const valueA = signal("");
      const valueB = signal("");
      const onValueChangeB = vi.fn<(value: string) => void>(() => {});
      const barChildren = (value: ReturnType<typeof signal<string>>) => [
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
      ];
      renderVariant(variant, {
        children: [
          ...barChildren(valueA),
          part(variant, "Viewport", { active: () => valueA() !== "" }),
        ],
      }) as HTMLElement;
      const barB = renderVariant(variant, {
        onValueChange: onValueChangeB,
        children: [
          ...barChildren(valueB),
          part(variant, "Viewport", { active: () => valueB() !== "" }),
        ],
      }) as HTMLElement;
      document
        .querySelector("[data-value='learn']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(valueA()).toBe("learn");
      expect(valueB()).toBe("");
      expect(onValueChangeB).not.toHaveBeenCalled();
      expect(
        barB.querySelector("[data-slot='navigation-menu-viewport']")!.getAttribute("data-state"),
      ).toBe("closed");
    },
  );

  test.each(navigationMenuVariants)(
    "$style swaps the viewport content when the second trigger activates",
    async (variant) => {
      const { bar, value, learnTrigger, referenceTrigger, clickTrigger } = buildNav(variant);
      const first = await clickTrigger(learnTrigger);
      const second = await clickTrigger(referenceTrigger, 2);
      const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
      expect(value()).toBe("reference");
      expect(viewport.contains(second)).toBe(true);
      flush();
      expect(second.textContent).toContain("API");
      expect(first.getAttribute("data-state")).toBe("closed");
      expect(second.getAttribute("data-state")).toBe("open");
      first.dispatchEvent(new Event("animationend"));
      await awaitDetached(first);
      expect(viewport.contains(first)).toBe(false);
    },
  );

  test.each(navigationMenuVariants)(
    "$style closes on a second activation of the open trigger",
    async (variant) => {
      const { value, learnTrigger, clickTrigger } = buildNav(variant);
      await clickTrigger(learnTrigger);
      learnTrigger().dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(value()).toBe("");
      expect(learnTrigger().getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(navigationMenuVariants)(
    "$style toggles the viewport data-state with the bar store",
    (variant) => {
      const { bar, value, learnTrigger } = buildNav(variant);
      const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
      expect(viewport.getAttribute("data-state")).toBe("closed");
      value("learn");
      flush();
      expect(viewport.getAttribute("data-state")).toBe("open");
      expect(learnTrigger().getAttribute("data-state")).toBe("open");
    },
  );

  test.each(navigationMenuVariants)("$style marks the active link with data-active", (variant) => {
    const container = setupContainer();
    const rendered = part(variant, "Link", { href: "#docs", active: true, children: "Docs" });
    mount(rendered, container);
    const link = container.querySelector("[data-slot='navigation-menu-link']")!;
    expect(link.getAttribute("data-active")).toBe("true");
    expect(link.getAttribute("href")).toBe("#docs");
  });

  test.each(navigationMenuVariants)(
    "$style forwards user attrs onto the bar root across both styles",
    (variant) => {
      const bar = renderVariant(variant, { "aria-label": "site" });
      expect(bar.getAttribute("aria-label")).toBe("site");
    },
  );

  test.each(navigationMenuVariants)(
    "$style fires a user on:click handler on the bar root across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const bar = renderVariant(variant, { "on:click": userClick });
      bar.dispatchEvent(new Event("click"));
      flush();
      expect(userClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(navigationMenuVariants)(
    "$style merges a user class into the bar root's class across both styles",
    (variant) => {
      const bar = renderVariant(variant, { class: "user-class" });
      expect(classTokens(bar).at(-1)).toBe("user-class");
    },
  );

  test.each(navigationMenuPartVariants.filter((variant) => variant.part === "Viewport"))(
    "$style viewport part re-emits a user-supplied id onto the slot",
    (variant) => {
      const container = setupContainer();
      mount(variant.render({ id: "custom-viewport", active: () => false }), container);
      flush();
      expect(
        container.querySelector("[data-slot='navigation-menu-viewport']")!.getAttribute("id"),
      ).toBe("custom-viewport");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(navigationMenuVariants, { children: [] });
  });

  test("renders every named part with its data-slot across both styles", () => {
    const slot = document.createElement("div");
    slot.setAttribute("data-slot", "navigation-menu-viewport");
    document.body.appendChild(slot);
    for (const variant of navigationMenuPartVariants) {
      const container = setupContainer();
      // Content only renders while active; give it an accessor so it portals into the slot.
      const rendered = variant.render({
        children: [],
        ...(variant.part === "Content" ? { active: () => true } : {}),
      });
      mount(rendered, container);
      // Content resolves through the portal; Viewport carries its slot on the inner div.
      const el =
        variant.part === "Content"
          ? portaledContent()
          : variant.part === "Viewport"
            ? container.querySelector("[data-slot='navigation-menu-viewport']")!
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
