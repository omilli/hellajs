import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { menuModulePart } from "../../helpers/variants-core";
import { contextMenuModules, contextMenuPartVariants, contextMenuVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pressEscape,
  pointerEnter,
  pointerLeave,
  pressKey,
} from "../../helpers/anchored";
import { Item, openContextMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("context-menu", () => {
  test.each(contextMenuVariants)(
    "$style enters submenus with ArrowRight and returns with ArrowLeft",
    async (variant) => {
      const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(
        contextMenuModules,
        variant,
        "ContextMenuSub",
      );
      const { content } = await openContextMenu(variant, [
        Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
        Item(variant, { children: "Refresh" }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='context-menu-sub-trigger']",
      ) as HTMLElement;
      expect(document.activeElement).toBe(subTrigger);
      pressKey(content, "ArrowRight");
      const subContent = await awaitPortaled("context-menu-sub-content");
      expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
      pressKey(subContent, "ArrowLeft");
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(document.activeElement).toBe(subTrigger);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(contextMenuVariants)(
    "$style pops one level per Escape while submenus are open",
    async (variant) => {
      const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(
        contextMenuModules,
        variant,
        "ContextMenuSub",
      );
      const { content } = await openContextMenu(variant, [
        Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='context-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("context-menu-sub-content");
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("open");
      subContent.dispatchEvent(new Event("animationend"));
      await awaitDetached(subContent);
      pressEscape();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(contextMenuVariants)(
    "$style opens submenus on hover after the intent delay and cancels an early leave",
    async (variant) => {
      const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(
        contextMenuModules,
        variant,
        "ContextMenuSub",
      );
      const { content } = await openContextMenu(variant, [
        Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='context-menu-sub-trigger']",
      ) as HTMLElement;
      pointerEnter(subTrigger);
      pointerLeave(subTrigger);
      await delay(150);
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
      pointerEnter(subTrigger);
      await delay(150);
      const subContent = await awaitPortaled("context-menu-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(contextMenuVariants)(
    "$style keeps the submenu open when the pointer re-enters the trigger or the content",
    async (variant) => {
      const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(
        contextMenuModules,
        variant,
        "ContextMenuSub",
      );
      const { content } = await openContextMenu(variant, [
        Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='context-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("context-menu-sub-content");
      pointerLeave(subTrigger);
      pointerEnter(subTrigger);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
      pointerLeave(subTrigger);
      pointerEnter(subContent);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
      // Leaving with no re-entry fires the grace close.
      pointerLeave(subTrigger);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(contextMenuVariants)(
    "$style anchors submenu content against the sub-trigger",
    async (variant) => {
      const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(
        contextMenuModules,
        variant,
        "ContextMenuSub",
      );
      const { content } = await openContextMenu(variant, [
        Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='context-menu-sub-trigger']",
      ) as HTMLElement;
      pinRect(subTrigger, 100, 200, 120, 28);
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("context-menu-sub-content");
      expect(subContent.style.left).toBe("320px");
      expect(subContent.style.top).toBe("100px");
      expect(subContent.getAttribute("data-side")).toBe("right");
    },
  );
});
