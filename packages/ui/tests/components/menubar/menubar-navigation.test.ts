import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { menubarVariants } from "./variants";
import { awaitPortaled, pressKey } from "../../helpers/anchored";
import { Item, Sub, Menu, renderBar, triggers, openMenu } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("menubar", () => {
  test.each(menubarVariants)(
    "$style moves focus between triggers with left/right arrows",
    (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
        Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
        Menu(variant, { value: "view", content: Item(variant, { children: "Zoom" }) }),
      ]);
      const [file, edit, view] = triggers(bar);
      file!.focus();
      pressKey(bar, "ArrowRight");
      expect(document.activeElement).toBe(edit!);
      pressKey(bar, "ArrowRight");
      expect(document.activeElement).toBe(view!);
      pressKey(bar, "ArrowRight");
      expect(document.activeElement).toBe(file!);
      pressKey(bar, "ArrowLeft");
      expect(document.activeElement).toBe(view!);
    },
  );

  test.each(menubarVariants)(
    "$style switches menus with left/right arrows while one is open",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
        Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
      ]);
      const [file, edit] = triggers(bar);
      const first = await openMenu(file!);
      expect(document.activeElement).toBe(first.querySelector("[role='menuitem']"));
      pressKey(first, "ArrowRight");
      const second = await awaitPortaled("menubar-content");
      const contents = [...document.querySelectorAll("[data-slot='menubar-content']")];
      expect(contents).toHaveLength(2);
      expect(second.getAttribute("data-state")).toBe("open");
      expect(first.getAttribute("data-state")).toBe("closed");
      expect(file!.getAttribute("aria-expanded")).toBe("false");
      expect(edit!.getAttribute("aria-expanded")).toBe("true");
      pressKey(second, "ArrowLeft");
      const reopened = await new Promise<HTMLElement>((resolve) => {
        const poll = (): void => {
          const node = [...document.querySelectorAll("[data-slot='menubar-content']")].find(
            (el) => el.getAttribute("data-state") === "open" && el.textContent?.includes("Open"),
          );
          if (node) resolve(node as HTMLElement);
          else setTimeout(poll);
        };
        poll();
      });
      expect(reopened.textContent).toContain("Open");
      expect(file!.getAttribute("aria-expanded")).toBe("true");
    },
  );

  test.each(menubarVariants)("$style opens with ArrowDown on the trigger", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    pressKey(file!, "ArrowDown");
    const content = await awaitPortaled("menubar-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(content.querySelector("[role='menuitem']"));
  });

  test.each(menubarVariants)(
    "$style focuses the first matching item on typeahead",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: [Item(variant, { children: "Cut" }), Item(variant, { children: "Open" })],
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      pressKey(content, "o");
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[1]!);
    },
  );

  test.each(menubarVariants)("$style closes under Tab", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pressKey(content, "Tab");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)(
    "$style roves the content items with wrap and jumps with Home/End",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: [
            Item(variant, { children: "Alpha" }),
            Item(variant, { children: "Beta" }),
            Item(variant, { children: "Gamma" }),
          ],
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[1]!);
      pressKey(content, "ArrowUp");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowUp");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, "Home");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "End");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, " ");
    },
  );

  test.each(menubarVariants)(
    "$style sub content roves, activates, and closes under Tab",
    async (variant) => {
      const onclick = vi.fn(() => {});
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: Sub(variant, {
            children: "Export",
            content: [
              Item(variant, { children: "PDF", "on:click": onclick }),
              Item(variant, { children: "HTML" }),
            ],
          }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("menubar-sub-content");
      const items = [...subContent.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[0]!);
      pressKey(subContent, "ArrowDown");
      expect(document.activeElement).toBe(items[1]!);
      pressKey(subContent, "ArrowUp");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(subContent, "Enter");
      expect(onclick).toHaveBeenCalledTimes(1);
      // Close-on-select: activating a sub item closes every open layer.
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("closed");
      const [fileAgain] = triggers(bar);
      fileAgain!.dispatchEvent(new Event("click", { bubbles: true }));
      const reopenedContent = await awaitPortaled("menubar-content");
      const subTriggerAgain = reopenedContent.querySelector(
        "[data-slot='menubar-sub-trigger']",
      ) as HTMLElement;
      subTriggerAgain.dispatchEvent(new Event("click", { bubbles: true }));
      const reopened = await awaitPortaled("menubar-sub-content");
      pressKey(reopened, "Tab");
      expect(reopened.getAttribute("data-state")).toBe("closed");
      expect(reopenedContent.getAttribute("data-state")).toBe("closed");
    },
  );
});
