import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { renderVariant } from "../../helpers/variants-core";
import { navigationMenuVariants } from "./variants";
import { awaitPortaled, pinRect } from "../../helpers/anchored";
import { part, buildNav } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("navigation-menu", () => {
  test.each(navigationMenuVariants)(
    "$style publishes the opened content's measured size onto the explicit viewport slot",
    async (variant) => {
      const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;
      const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!;
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get: () => 200,
      });
      try {
        const { bar, learnTrigger, clickTrigger } = buildNav(variant);
        const content = await clickTrigger(learnTrigger);
        const viewport = bar.querySelector("[data-slot='navigation-menu-viewport']")!;
        expect(viewport.contains(content)).toBe(true);
        expect(
          (viewport as HTMLElement).style.getPropertyValue(
            "--radix-navigation-menu-viewport-width",
          ),
        ).toBe(`${content.offsetWidth}px`);
        flush();
        expect(
          (viewport as HTMLElement).style.getPropertyValue(
            "--radix-navigation-menu-viewport-height",
          ),
        ).toBe(`${content.offsetHeight}px`);
      } finally {
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
      }
    },
  );

  test.each(navigationMenuVariants)(
    "$style aligns the viewport wrapper under the hovered trigger, clamped inside the bar",
    async (variant) => {
      const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;
      const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!;
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get: () => 200,
      });
      try {
        const { bar, learnTrigger, clickTrigger } = buildNav(variant);
        const wrapper = bar.querySelector("[data-slot='navigation-menu-viewport']")!
          .parentElement as HTMLElement;
        pinRect(wrapper, 0, 0, 400, 36);
        pinRect(learnTrigger(), 0, 40, 120, 36);
        await clickTrigger(learnTrigger);
        // Trigger center (100) sits 100px left of the wrapper center (200); the
        // panel half-width budget (400 - 320) / 2 = 40 clamps the offset.
        expect(wrapper.style.transform).toBe("translateX(-40px)");
      } finally {
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
      }
    },
  );

  test.each(navigationMenuVariants)(
    "$style renders the indicator and transitions it between trigger positions",
    async (variant) => {
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
    },
  );

  test.each(navigationMenuVariants)(
    "$style supports manual viewport wiring through viewport={false} and explicit selectors",
    async (variant) => {
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
      bar
        .querySelector("[data-value='learn']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      const content = await awaitPortaled("navigation-menu-content");
      expect(slot.contains(content)).toBe(true);
      slot.remove();
    },
  );

  test.each(navigationMenuVariants)(
    "$style indicator follows announcements without an anchor and re-measures on resize",
    async (variant) => {
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
          part(variant, "Viewport", { active: () => value() !== "" }),
          part(variant, "Indicator", {}),
        ],
      }) as HTMLElement;
      const indicator = bar.querySelector("[data-slot='navigation-menu-indicator']") as HTMLElement;
      const trigger = bar.querySelector("[data-value='learn']") as HTMLElement;
      pinRect(bar, 0, 0, 400, 40);
      pinRect(trigger, 0, 40, 90, 40);
      flush();
      expect(indicator.getAttribute("data-state")).toBe("hidden");
      trigger.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(indicator.getAttribute("data-state")).toBe("visible");
      expect(indicator.style.transform).toBe("translateX(40px)");
      expect(indicator.style.width).toBe("90px");
      pinRect(trigger, 0, 60, 90, 40);
      window.dispatchEvent(new Event("resize"));
      flush();
      expect(indicator.style.transform).toBe("translateX(60px)");
      trigger.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(indicator.getAttribute("data-state")).toBe("hidden");
    },
  );

  test.each(navigationMenuVariants)(
    "$style dismisses the exit fallback when a panel reopens mid-exit",
    async (variant) => {
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
          part(variant, "Viewport", { active: () => value() !== "" }),
        ],
      }) as HTMLElement;
      const trigger = bar.querySelector("[data-value='learn']") as HTMLElement;
      trigger.dispatchEvent(new Event("click", { bubbles: true }));
      const first = await awaitPortaled("navigation-menu-content");
      value("");
      flush();
      expect(first.getAttribute("data-state")).toBe("closed");
      value("learn");
      flush();
      expect(first.getAttribute("data-state")).toBe("open");
      expect(first.isConnected).toBe(true);
    },
  );

  test.each(navigationMenuVariants)(
    "$style drops the indicator and resize wiring on unmount",
    (variant) => {
      const value = signal("");
      const container = setupContainer();
      const rendered = variant.render({
        children: [part(variant, "Indicator", { active: () => value() !== "" })],
      });
      const handle = mount(rendered, container);
      const indicator = container.querySelector(
        "[data-slot='navigation-menu-indicator']",
      ) as HTMLElement;
      expect(indicator).not.toBeNull();
      handle.unmount();
      flush();
      expect(container.contains(indicator)).toBe(false);
      expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
    },
  );
});
