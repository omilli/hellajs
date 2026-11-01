import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { renderVariant } from "../../helpers/variants-core";
import { selectVariants } from "./variants";
import { awaitPortaled, pressKey } from "../../helpers/anchored";
import { FRUITS, openSelect } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("select", () => {
  test.each(selectVariants)(
    "$style selects on Enter, updates the trigger label, closes, and restores focus",
    async (variant) => {
      const { onValueChange, trigger, content } = await openSelect(variant);
      const first = content.querySelector("[role='option']") as HTMLElement;
      expect(document.activeElement).toBe(first);
      pressKey(content, "Enter");
      expect(onValueChange).toHaveBeenCalledWith("apple");
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
      expect(trigger.textContent).toContain("Apple");
      const value = trigger.querySelector("[data-slot='select-value']")!;
      expect(value.hasAttribute("data-placeholder")).toBe(false);
    },
  );

  test.each(selectVariants)("$style opens with ArrowDown on the trigger", async (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS });
    pressKey(trigger, "ArrowDown");
    const content = await awaitPortaled("select-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(selectVariants)(
    "$style roves arrows over data-highlighted with wrap and Home/End",
    async (variant) => {
      const { content } = await openSelect(variant);
      const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
      expect(options[0]!.hasAttribute("data-highlighted")).toBe(true);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(options[1]!);
      expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
      expect(options[0]!.hasAttribute("data-highlighted")).toBe(false);
      pressKey(content, "ArrowDown");
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(options[0]!);
      pressKey(content, "ArrowUp");
      expect(document.activeElement).toBe(options[2]!);
      pressKey(content, "Home");
      expect(document.activeElement).toBe(options[0]!);
      pressKey(content, "End");
      expect(document.activeElement).toBe(options[2]!);
    },
  );

  test.each(selectVariants)("$style focuses the first match on typeahead", async (variant) => {
    const { content } = await openSelect(variant);
    pressKey(content, "b");
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(document.activeElement).toBe(options[1]!);
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
  });

  test.each(selectVariants)(
    "$style closes under Tab via the listbox keyboard model",
    async (variant) => {
      const { content } = await openSelect(variant);
      pressKey(content, "Tab");
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );
});
