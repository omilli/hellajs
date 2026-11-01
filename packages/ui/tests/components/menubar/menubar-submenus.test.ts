import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { menubarVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pressEscape,
  pointerEnter,
  pointerLeave,
  pressKey,
} from "../../helpers/anchored";
import { Item, Sub, Menu, Part, renderBar, triggers, openMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("menubar", () => {
  test.each(menubarVariants)(
    "$style opens submenus on click and pops them with Escape",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: Sub(variant, {
            children: "Export",
            content: Item(variant, { children: "PDF" }),
          }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("menubar-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
      expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("open");
      pressEscape();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(document.activeElement).toBe(file!);
    },
  );

  test.each(menubarVariants)(
    "$style enters submenus with ArrowRight and returns with ArrowLeft",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: [
            Sub(variant, { children: "Export", content: Item(variant, { children: "PDF" }) }),
            Item(variant, { children: "Close" }),
          ],
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
      expect(document.activeElement).toBe(subTrigger);
      pressKey(content, "ArrowRight");
      const subContent = await awaitPortaled("menubar-sub-content");
      expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
      pressKey(subContent, "ArrowLeft");
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(document.activeElement).toBe(subTrigger);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(menubarVariants)(
    "$style opens submenus on hover after the intent delay and keeps them open on re-enter",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: Sub(variant, {
            children: "Export",
            content: Item(variant, { children: "PDF" }),
          }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
      // Leaving before the intent delay fires cancels the pending open.
      pointerEnter(subTrigger);
      pointerLeave(subTrigger);
      await delay(150);
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
      pointerEnter(subTrigger);
      await delay(150);
      const subContent = await awaitPortaled("menubar-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
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

  test.each(menubarVariants)(
    "$style closes the submenu after leaving the trigger for the close delay",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: Sub(variant, {
            children: "Export",
            content: Item(variant, { children: "PDF" }),
          }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("menubar-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
      pointerLeave(subTrigger);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("closed");
      subContent.dispatchEvent(new Event("animationend"));
      await awaitDetached(subContent);
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    },
  );
});
