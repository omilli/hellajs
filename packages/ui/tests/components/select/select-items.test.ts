import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { classTokens, renderVariant } from "../../helpers/variants-core";
import { selectVariants, type SelectEntryVariant } from "./variants";
import { awaitPortaled, pressKey } from "../../helpers/anchored";
import { FRUITS, openSelect } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("select", () => {
  test.each(selectVariants)(
    "$style carries the content class on the open content and the item class on its items",
    async (variant) => {
      const { content } = await openSelect(variant);
      const firstItem = content.querySelector("[data-slot='select-item']")!;
      if (variant.style === "css") {
        expect(classTokens(content).some((token) => token.startsWith("select-content"))).toBe(true);
        expect(classTokens(firstItem).some((token) => token.startsWith("select-item"))).toBe(true);
      } else {
        expect(classTokens(content)).toContain("bg-popover");
        expect(classTokens(firstItem)).toContain("rounded-sm");
      }
    },
  );

  test.each(selectVariants)(
    "$style renders options with role, aria-selected, and the check indicator",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const trigger = renderVariant(variant, {
        items: FRUITS,
        value: () => "blueberry",
        onValueChange,
      });
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("select-content");
      const options = [...content.querySelectorAll("[role='option']")];
      expect(options).toHaveLength(3);
      const checked = content.querySelector("[aria-selected='true']")!;
      expect(checked.getAttribute("data-value")).toBe("blueberry");
      expect(checked.getAttribute("data-state")).toBe("checked");
      expect(checked.querySelector("[data-slot='select-item-indicator'] svg")).not.toBeNull();
      const unchecked = content.querySelector("[aria-selected='false']")!;
      expect(unchecked.getAttribute("data-state")).toBe("unchecked");
      expect(unchecked.querySelector("[data-slot='select-item-indicator'] svg")).toBeNull();
    },
  );

  test.each(selectVariants)("$style skips and styles disabled options", async (variant) => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, {
      items: [
        { value: "apple", label: "Apple" },
        { value: "blueberry", label: "Blueberry", disabled: true },
        { value: "canteloupe", label: "Canteloupe" },
      ],
      onValueChange,
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    const disabled = content.querySelector("[data-disabled]")!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    // Roving skips the disabled option; activation is blocked.
    pressKey(content, "ArrowDown");
    flush();
    expect(document.activeElement).toBe(options[2]!);
    options[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(selectVariants)(
    "$style re-renders a signal items list across append, remove, and reorder",
    async (variant) => {
      const liveItems = signal<SelectEntryVariant[]>([...FRUITS]);
      const { content } = await openSelect(variant, { items: liveItems });
      const values = () =>
        [...content.querySelectorAll("[role='option']")].map((el) => el.getAttribute("data-value"));
      flush();
      expect(values()).toEqual(["apple", "blueberry", "canteloupe"]);
      liveItems([...liveItems(), { value: "date", label: "Date" }]);
      flush();
      expect(values()).toEqual(["apple", "blueberry", "canteloupe", "date"]);
      liveItems(liveItems().filter((entry) => entry.value !== "blueberry"));
      flush();
      expect(values()).toEqual(["apple", "canteloupe", "date"]);
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(values()).toEqual(["date", "apple", "canteloupe"]);
    },
  );

  test.each(selectVariants)(
    "$style reuses the selected item's node through a reorder when keyBy is value",
    async (variant) => {
      const liveItems = signal<SelectEntryVariant[]>([...FRUITS]);
      const { content } = await openSelect(variant, {
        items: liveItems,
        value: () => "blueberry",
        keyBy: "value",
      });
      const itemEls = () => [...content.querySelectorAll("[role='option']")] as HTMLElement[];
      const blueberryBefore = itemEls().find(
        (el) => el.getAttribute("data-value") === "blueberry",
      )!;
      expect(blueberryBefore.getAttribute("data-state")).toBe("checked");
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(itemEls().map((el) => el.getAttribute("data-value"))).toEqual([
        "canteloupe",
        "apple",
        "blueberry",
      ]);
      const blueberryAfter = itemEls().find((el) => el.getAttribute("data-value") === "blueberry")!;
      expect(blueberryAfter).toBe(blueberryBefore);
      expect(blueberryAfter.getAttribute("data-state")).toBe("checked");
    },
  );

  test.each(selectVariants)(
    "$style keeps the reconciliation key out of the markup when keyBy is value",
    async (variant) => {
      const { content } = await openSelect(variant, { items: FRUITS, keyBy: "value" });
      expect(content.outerHTML).not.toContain("key=");
    },
  );
});
