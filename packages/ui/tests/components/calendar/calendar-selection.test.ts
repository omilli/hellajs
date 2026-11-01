import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { calendarVariants } from "./variants";
import { MAR_2025, calendarRoot, dayCell, dayButton, click } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("calendar", () => {
  test.each(calendarVariants)("$style selects, keeps, and replaces a single date", (variant) => {
    const onSelect = vi.fn<(selected: unknown) => void>(() => undefined);
    const root = calendarRoot(variant, { defaultMonth: MAR_2025, onSelect });
    click(root, "2025-03-14");
    expect(dayCell(root, "2025-03-14")!.getAttribute("data-selected")).toBe("true");
    const button = dayButton(root, "2025-03-14");
    expect(button.getAttribute("aria-selected")).toBe("true");
    expect(button.getAttribute("data-selected-single")).toBe("true");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0]![0] as Date).getTime()).toBe(new Date(2025, 2, 14).getTime());
    click(root, "2025-03-14");
    expect(dayCell(root, "2025-03-14")!.getAttribute("data-selected")).toBe("true");
    click(root, "2025-03-20");
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect((onSelect.mock.calls[1]![0] as Date).getDate()).toBe(14);
    expect((onSelect.mock.calls[2]![0] as Date).getDate()).toBe(20);
    expect(dayCell(root, "2025-03-14")!.hasAttribute("data-selected")).toBe(false);
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-selected")).toBe("true");
  });

  test.each(calendarVariants)("$style toggles multiple membership in stable order", (variant) => {
    let latest: Date[] = [];
    const root = calendarRoot(variant, {
      defaultMonth: MAR_2025,
      mode: "multiple",
      onSelect: (selected) => {
        latest = selected as Date[];
      },
    });
    click(root, "2025-03-10");
    click(root, "2025-03-20");
    expect(latest.map((day) => day.getDate())).toEqual([10, 20]);
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-selected")).toBe("true");
    click(root, "2025-03-10");
    expect(latest.map((day) => day.getDate())).toEqual([20]);
    expect(dayCell(root, "2025-03-10")!.hasAttribute("data-selected")).toBe(false);
    expect(dayButton(root, "2025-03-20").getAttribute("data-selected-single")).toBe("true");
  });

  test.each(calendarVariants)(
    "$style builds a range with ordering, reorders a backwards second click, and resets on the third",
    (variant) => {
      let latest: { from?: Date; to?: Date } = {};
      const root = calendarRoot(variant, {
        defaultMonth: MAR_2025,
        mode: "range",
        onSelect: (selected) => {
          latest = selected as { from?: Date; to?: Date };
        },
      });
      click(root, "2025-03-10");
      expect(latest.from!.getDate()).toBe(10);
      expect(latest.to).toBeUndefined();
      expect(dayCell(root, "2025-03-10")!.getAttribute("data-range-start")).toBe("true");
      click(root, "2025-03-20");
      expect(latest.from!.getDate()).toBe(10);
      expect(latest.to!.getDate()).toBe(20);
      expect(dayCell(root, "2025-03-15")!.getAttribute("data-range-middle")).toBe("true");
      expect(dayCell(root, "2025-03-20")!.getAttribute("data-range-end")).toBe("true");
      expect(dayButton(root, "2025-03-15").getAttribute("data-range-middle")).toBe("true");
      expect(dayCell(root, "2025-03-05")!.hasAttribute("data-range-middle")).toBe(false);

      const backwards = calendarRoot(variant, {
        defaultMonth: MAR_2025,
        mode: "range",
        onSelect: (selected) => {
          latest = selected as { from?: Date; to?: Date };
        },
      });
      click(backwards, "2025-03-20");
      click(backwards, "2025-03-10");
      expect(latest.from!.getDate()).toBe(10);
      expect(latest.to!.getDate()).toBe(20);

      click(backwards, "2025-03-25");
      expect(latest.from!.getDate()).toBe(25);
      expect(latest.to).toBeUndefined();
      expect(dayCell(backwards, "2025-03-25")!.getAttribute("data-range-start")).toBe("true");
      expect(dayCell(backwards, "2025-03-10")!.hasAttribute("data-range-start")).toBe(false);
    },
  );

  test.each(calendarVariants)(
    "$style previews the dangling range end on hover and clears it on leave",
    (variant) => {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, mode: "range" });
      click(root, "2025-03-10");
      const hoverButton = dayButton(root, "2025-03-20");
      hoverButton.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
      expect(dayCell(root, "2025-03-20")!.getAttribute("data-range-end")).toBe("true");
      expect(dayCell(root, "2025-03-15")!.getAttribute("data-range-middle")).toBe("true");
      hoverButton.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      expect(dayCell(root, "2025-03-20")!.hasAttribute("data-range-end")).toBe(false);
      expect(dayCell(root, "2025-03-15")!.hasAttribute("data-range-middle")).toBe(false);
    },
  );

  test.each(calendarVariants)(
    "$style blocks selection on disabled days and reports nothing",
    (variant) => {
      const onSelect = vi.fn<(selected: unknown) => void>(() => undefined);
      const root = calendarRoot(variant, {
        defaultMonth: MAR_2025,
        disabled: (date: Date) => date.getDate() === 14,
        onSelect,
      });
      const cell = dayCell(root, "2025-03-14")!;
      expect(cell.getAttribute("data-disabled")).toBe("true");
      expect(cell.querySelector("button")!.getAttribute("aria-disabled")).toBe("true");
      click(root, "2025-03-14");
      expect(cell.hasAttribute("data-selected")).toBe(false);
      expect(onSelect).not.toHaveBeenCalled();
      click(root, "2025-03-15");
      expect(onSelect).toHaveBeenCalledTimes(1);
    },
  );
});
