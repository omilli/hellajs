import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { contextMenuVariants } from "./variants";
import { pressKey } from "../../helpers/anchored";
import { Item, openContextMenu } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("context-menu", () => {
  test.each(contextMenuVariants)(
    "$style roves arrows with wrap and jumps with Home/End",
    async (variant) => {
      const { content } = await openContextMenu(variant, [
        Item(variant, { children: "Alpha" }),
        Item(variant, { children: "Beta" }),
        Item(variant, { children: "Gamma" }),
      ]);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[1]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowUp");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, "Home");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "End");
      expect(document.activeElement).toBe(items[2]!);
    },
  );

  test.each(contextMenuVariants)(
    "$style activates items with Enter and closes the menu",
    async (variant) => {
      const onclick = vi.fn(() => {});
      const { content } = await openContextMenu(variant, [
        Item(variant, { children: "Rename", "on:click": onclick, shortcut: "⌘R" }),
        Item(variant, { children: "Delete", destructive: true }),
      ]);
      const destructive = content.querySelector("[data-variant='destructive']")!;
      expect(destructive.textContent).toContain("Delete");
      expect(content.querySelector("[data-slot='menu-shortcut']")!.textContent).toBe("⌘R");
      pressKey(content, "Enter");
      expect(onclick).toHaveBeenCalledTimes(1);
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(contextMenuVariants)("$style blocks activation on disabled items", async (variant) => {
    const onclick = vi.fn(() => {});
    const { content } = await openContextMenu(variant, [
      Item(variant, { children: "Locked", disabled: true, "on:click": onclick }),
      Item(variant, { children: "Free" }),
    ]);
    const locked = content.querySelector("[data-disabled]")!;
    locked.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onclick).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(contextMenuVariants)(
    "$style focuses the first matching item on typeahead",
    async (variant) => {
      const { content } = await openContextMenu(variant, [
        Item(variant, { children: "Cut" }),
        Item(variant, { children: "Copy" }),
        Item(variant, { children: "Paste" }),
      ]);
      pressKey(content, "c");
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[0]!);
    },
  );

  test.each(contextMenuVariants)("$style closes under Tab", async (variant) => {
    const { content } = await openContextMenu(variant);
    pressKey(content, "Tab");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });
});
