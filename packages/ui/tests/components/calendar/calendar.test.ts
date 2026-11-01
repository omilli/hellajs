import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import {
  assertAttrForwarded,
  assertStructuralParity,
  classTokens,
  renderVariant,
} from "../../helpers/variants-core";
import { calendarDayButtonVariants, calendarVariants } from "./variants";
import { MAR_2025, calendarRoot, dayCell, dayButton, click, caption } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("calendar", () => {
  test.each(calendarVariants)(
    "$style renders caption, nav aria-labels, weekday header, and the grid",
    (variant) => {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025 });
      expect(root.getAttribute("data-slot")).toBe("calendar");
      expect(caption(root)).toBe("March 2025");
      expect(root.querySelector("[data-slot='calendar-grid']")!.getAttribute("role")).toBe("grid");
      expect(
        root.querySelector("[data-slot='calendar-previous']")!.getAttribute("aria-label"),
      ).toBe("Go to the previous month");
      expect(root.querySelector("[data-slot='calendar-next']")!.getAttribute("aria-label")).toBe(
        "Go to the next month",
      );
      const weekdays = Array.from(root.querySelectorAll("[data-slot='calendar-weekday']"));
      expect(weekdays.map((th) => th.textContent)).toEqual([
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
      ]);
    },
  );

  test.each(calendarVariants)(
    "$style marks today with data-today, aria-current, and the locale data-day",
    (variant) => {
      const now = new Date();
      const root = calendarRoot(variant, {
        defaultMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      });
      const month = `${now.getMonth() + 1}`.padStart(2, "0");
      const day = `${now.getDate()}`.padStart(2, "0");
      const cell = dayCell(root, `${now.getFullYear()}-${month}-${day}`)!;
      expect(cell).not.toBeNull();
      expect(cell.getAttribute("data-today")).toBe("true");
      expect(cell.querySelector("button")!.getAttribute("aria-current")).toBe("date");
      expect(cell.querySelector("button")!.getAttribute("data-day")).toBe(
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString(),
      );
    },
  );

  test.each(calendarVariants)(
    "$style omits the navigation when hideNavigation is set",
    (variant) => {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, hideNavigation: true });
      expect(root.querySelector("[data-slot='calendar-nav']")).toBeNull();
      expect(root.querySelector("[data-slot='calendar-previous']")).toBeNull();
    },
  );

  test.each(calendarVariants)(
    "$style merges the class hooks and root class into the composed parts",
    (variant) => {
      const root = calendarRoot(variant, {
        defaultMonth: MAR_2025,
        class: "outer",
        classNames: { day: "hooked-day", day_button: "hooked-button", nav: "hooked-nav" },
      });
      expect(root.getAttribute("class")).toContain("outer");
      expect(dayCell(root, "2025-03-14")!.getAttribute("class")).toContain("hooked-day");
      expect(dayButton(root, "2025-03-14").getAttribute("class")).toContain("hooked-button");
      expect(root.querySelector("[data-slot='calendar-nav']")!.getAttribute("class")).toContain(
        "hooked-nav",
      );
      if (variant.style === "css") {
        expect(
          classTokens(dayCell(root, "2025-03-14")!).some((token) =>
            token.startsWith("calendar-day"),
          ),
        ).toBe(true);
      } else {
        expect(classTokens(dayCell(root, "2025-03-14")!)).toContain("group/day");
        expect(classTokens(dayButton(root, "2025-03-14"))).toContain("min-w-(--cell-size)");
      }
    },
  );

  test.each(calendarDayButtonVariants)(
    "$style renders the manual day part with static flags, data-day, and aria semantics",
    (variant) => {
      const el = renderVariant(variant, {
        day: new Date(2025, 2, 14),
        selectedSingle: true,
        focused: true,
        today: true,
      }) as HTMLElement;
      expect(el.tagName).toBe("BUTTON");
      expect(el.getAttribute("data-slot")).toBe("calendar-day-button");
      expect(el.getAttribute("data-day")).toBe(new Date(2025, 2, 14).toLocaleDateString());
      expect(el.getAttribute("data-selected-single")).toBe("true");
      expect(el.getAttribute("aria-selected")).toBe("true");
      expect(el.getAttribute("aria-current")).toBe("date");
      expect(el.tabIndex).toBe(0);
      expect(el.textContent).toBe("14");
      const idle = renderVariant(variant, { day: new Date(2025, 2, 14) }) as HTMLElement;
      expect(idle.hasAttribute("data-selected-single")).toBe(false);
      expect(idle.getAttribute("aria-selected")).toBe("false");
      expect(idle.tabIndex).toBe(-1);
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025 });
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025, mode: "range" });
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025, hideNavigation: true });
    assertStructuralParity(
      calendarDayButtonVariants,
      { day: new Date(2025, 2, 14), selectedSingle: true },
      ["data-day"],
    );
  });

  test("day-cell user on:click fires alongside the owned date-select across both styles", () => {
    for (const variant of calendarVariants) {
      const userClick = vi.fn(() => {});
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, "on:click": userClick });
      click(root, "2025-03-14");
      expect(userClick).toHaveBeenCalledTimes(1);
      const cell = dayCell(root, "2025-03-14")!;
      expect(cell.getAttribute("data-selected")).toBe("true");
    }
  });

  test("forwards user attrs onto the calendar root across both styles", () => {
    assertAttrForwarded(
      calendarVariants,
      { defaultMonth: MAR_2025, title: "Hella" } as never,
      "title",
      "Hella",
    );
  });

  test("merges a user class into the calendar root class across both styles", () => {
    for (const variant of calendarVariants) {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, class: "my-calendar" });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-calendar");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });

  test("manual day button spreads a user on:click handler across both styles", () => {
    for (const variant of calendarDayButtonVariants) {
      const userClick = vi.fn(() => {});
      const root = renderVariant(variant, { day: new Date(2025, 2, 14), "on:click": userClick });
      root.dispatchEvent(new Event("click", { bubbles: true }));
      expect(userClick).toHaveBeenCalledTimes(1);
    }
  });
});
