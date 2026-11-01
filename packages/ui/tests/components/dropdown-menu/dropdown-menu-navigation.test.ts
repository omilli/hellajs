import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { renderVariant } from "../../helpers/variants-core";
import { dropdownMenuVariants } from "./variants";
import { awaitPortaled, pressKey } from "../../helpers/anchored";
import { Item, openMenu } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("dropdown-menu", () => {
  test.each(dropdownMenuVariants)(
    "$style opens with ArrowDown on the trigger and focuses the first item",
    async (variant) => {
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: Item(variant, { children: "One" }),
        onOpenChange,
      });
      pressKey(trigger, "ArrowDown");
      const content = await awaitPortaled("dropdown-menu-content");
      expect(content.getAttribute("data-state")).toBe("open");
      expect(document.activeElement).toBe(content.querySelector("[role='menuitem']"));
    },
  );

  test.each(dropdownMenuVariants)(
    "$style roves arrows with wrap and jumps with Home/End",
    async (variant) => {
      const { content } = await openMenu(variant, [
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

  test.each(dropdownMenuVariants)("$style activates items on Enter and Space", async (variant) => {
    const onclick = vi.fn(() => {});
    const { content } = await openMenu(variant, [
      Item(variant, { children: "Alpha", "on:click": onclick }),
      Item(variant, { children: "Beta" }),
    ]);
    pressKey(content, "Enter");
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(content.getAttribute("data-state")).toBe("closed");
    const second = await openMenu(variant, [
      Item(variant, { children: "Alpha" }),
      Item(variant, { children: "Beta", "on:click": onclick }),
    ]);
    const items = [...second.content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    items[1]!.focus();
    pressKey(second.content, " ");
    expect(onclick).toHaveBeenCalledTimes(2);
    expect(second.content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$style blocks activation on disabled items", async (variant) => {
    const onclick = vi.fn(() => {});
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, {
      content: [
        Item(variant, { children: "Locked", disabled: true, "on:click": onclick }),
        Item(variant, { children: "Free" }),
      ],
      onOpenChange,
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    const locked = content.querySelector("[data-disabled]")!;
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    locked.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onclick).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test.each(dropdownMenuVariants)(
    "$style roving and typeahead skip disabled items",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Alpha" }),
        Item(variant, { children: "Hidden", disabled: true }),
        Item(variant, { children: "Beta" }),
      ]);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(items).toHaveLength(3);
      expect(menuActiveCount(content)).toBe(2);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[2]!);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style focuses the first matching item on typeahead",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Cut" }),
        Item(variant, { children: "Select All" }),
        Item(variant, { children: "Paste" }),
      ]);
      pressKey(content, "s");
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[1]!);
    },
  );
});

/** Counts activatable (non-disabled) menu items inside a rendered menu. */
function menuActiveCount(menu: Element): number {
  return menu.querySelectorAll("[role^='menuitem']:not([data-disabled])").length;
}
