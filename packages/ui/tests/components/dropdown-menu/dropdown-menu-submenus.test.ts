import { describe, test, expect, beforeEach } from "vite-plus/test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { dropdownMenuVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pressEscape,
  pointerEnter,
  pointerLeave,
  pressKey,
} from "../../helpers/anchored";
import { Item, Sub, openMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dropdown-menu", () => {
  test.each(dropdownMenuVariants)(
    "$style opens submenus on hover after the intent delay",
    async (variant) => {
      const { content } = await openMenu(
        variant,
        Sub(variant, {
          children: "More",
          content: Item(variant, { children: "Deep" }),
        }),
      );
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pointerEnter(subTrigger);
      await delay(150);
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
      expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style cancels the hover intent when the pointer leaves early",
    async (variant) => {
      const { content } = await openMenu(
        variant,
        Sub(variant, {
          children: "More",
          content: Item(variant, { children: "Deep" }),
        }),
      );
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pointerEnter(subTrigger);
      pointerLeave(subTrigger);
      await delay(150);
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style enters submenus with ArrowRight and returns with ArrowLeft",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
        Item(variant, { children: "Plain" }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      expect(document.activeElement).toBe(subTrigger);
      pressKey(content, "ArrowRight");
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
      pressKey(subContent, "ArrowLeft");
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(document.activeElement).toBe(subTrigger);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style pops one level per Escape while submenus are open",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("open");
      pressEscape();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style closes every layer when a submenu item selects",
    async (variant) => {
      const { content, onOpenChange } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      const deep = subContent.querySelector("[role='menuitem']") as HTMLElement;
      deep.dispatchEvent(new Event("click", { bubbles: true }));
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style keeps the submenu open when the pointer re-enters the trigger or the content",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      // Leaving arms the close; re-entering the trigger cancels it.
      pointerLeave(subTrigger);
      pointerEnter(subTrigger);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
      // Leaving arms the close again; entering the sub-content cancels it.
      pointerLeave(subTrigger);
      pointerEnter(subContent);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style unmounts the sub-content through its exit animationend",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      subContent.dispatchEvent(new Event("animationend"));
      await awaitDetached(subContent);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style anchors submenu content against the sub-trigger",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pinRect(subTrigger, 100, 200, 120, 28);
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(subContent.style.left).toBe("320px");
      expect(subContent.style.top).toBe("100px");
      expect(subContent.getAttribute("data-side")).toBe("right");
      expect(subContent.getAttribute("data-align")).toBe("start");
    },
  );
});
