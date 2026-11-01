import { describe, test, expect, beforeEach } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { calendarVariants, type CalendarVariantProps } from "./variants";
import { resetTestState } from "@utils/test-helpers.js";
import {
  JAN_2024,
  FEB_2024,
  FEB_2100,
  MAR_2025,
  DEC_2025,
  calendarRoot,
  dayCell,
  awaitCell,
  press,
  awaitFocus,
  caption,
} from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("calendar", () => {
  test.each(calendarVariants)(
    "$style builds month grids: 31/30/28/29-day months, offsets, fixedWeeks, leap and century years",
    (variant) => {
      const cases: [
        props: CalendarVariantProps,
        cells: number,
        first: string,
        last: string,
        outside: number,
      ][] = [
        [{ defaultMonth: JAN_2024 }, 35, "2023-12-31", "2024-02-03", 4],
        [{ defaultMonth: FEB_2024 }, 35, "2024-01-28", "2024-03-02", 6],
        [{ defaultMonth: FEB_2100 }, 35, "2100-01-31", "2100-03-06", 7],
        [{ defaultMonth: MAR_2025 }, 42, "2025-02-23", "2025-04-05", 11],
        [{ defaultMonth: JAN_2024, weekStartsOn: 1 }, 35, "2024-01-01", "2024-02-04", 4],
        [{ defaultMonth: FEB_2100, fixedWeeks: true }, 42, "2100-01-31", "2100-03-13", 14],
      ];
      for (const [props, cells, first, last, outside] of cases) {
        const root = calendarRoot(variant, props);
        const all = Array.from(root.querySelectorAll("[data-slot='calendar-day']"));
        expect(all.length).toBe(cells);
        expect(all[0]!.getAttribute("data-date")).toBe(first);
        expect(all[all.length - 1]!.getAttribute("data-date")).toBe(last);
        expect(all.filter((cell) => cell.hasAttribute("data-outside")).length).toBe(outside);
      }
    },
  );

  test.each(calendarVariants)(
    "$style drops february 29th in non-leap years and keeps it in leap years",
    (variant) => {
      const century = calendarRoot(variant, { defaultMonth: FEB_2100 });
      expect(dayCell(century, "2100-02-29")).toBeNull();
      expect(dayCell(century, "2100-02-28")).not.toBeNull();
      const leap = calendarRoot(variant, { defaultMonth: FEB_2024 });
      expect(dayCell(leap, "2024-02-29")).not.toBeNull();
    },
  );

  test.each(calendarVariants)(
    "$style tags outside days as disabled and hides them when showOutsideDays is false",
    (variant) => {
      const root = calendarRoot(variant, { defaultMonth: JAN_2024 });
      const first = dayCell(root, "2023-12-31")!;
      const inner = dayCell(root, "2024-01-15")!;
      expect(first.getAttribute("data-outside")).toBe("true");
      expect(first.getAttribute("data-disabled")).toBe("true");
      expect(first.querySelector("button")!.getAttribute("aria-disabled")).toBe("true");
      expect(inner.hasAttribute("data-outside")).toBe(false);
      expect(inner.hasAttribute("data-disabled")).toBe(false);
      const hidden = calendarRoot(variant, { defaultMonth: JAN_2024, showOutsideDays: false });
      expect(dayCell(hidden, "2023-12-31")!.getAttribute("data-hidden")).toBe("true");
      expect(dayCell(hidden, "2024-01-15")!.hasAttribute("data-hidden")).toBe(false);
    },
  );

  test.each(calendarVariants)(
    "$style navigates months from the nav buttons, over the december boundary, with controlled month winning",
    async (variant) => {
      let reported: Date | undefined;
      const root = calendarRoot(variant, {
        defaultMonth: MAR_2025,
        onMonthChange: (month) => {
          reported = month;
        },
      });
      root
        .querySelector("[data-slot='calendar-next']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      await awaitCell(root, "2025-04-14");
      expect(caption(root)).toBe("April 2025");
      expect(reported!.getMonth()).toBe(3);
      expect(reported!.getFullYear()).toBe(2025);
      root
        .querySelector("[data-slot='calendar-previous']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      await awaitCell(root, "2025-03-14");
      expect(caption(root)).toBe("March 2025");

      const rollover = calendarRoot(variant, { defaultMonth: DEC_2025 });
      rollover
        .querySelector("[data-slot='calendar-next']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      await awaitCell(rollover, "2026-01-14");
      expect(caption(rollover)).toBe("January 2026");

      const month = signal(new Date(2025, 0, 1));
      const controlled = calendarRoot(variant, { month: () => month() });
      controlled
        .querySelector("[data-slot='calendar-next']")!
        .dispatchEvent(new Event("click", { bubbles: true }));
      await awaitCell(controlled, "2025-02-14");
      expect(caption(controlled)).toBe("February 2025");
      month(new Date(2025, 5, 1));
      await awaitCell(controlled, "2025-06-14");
      expect(caption(controlled)).toBe("June 2025");
    },
  );

  test.each(calendarVariants)(
    "$style roves focus with arrows across week wrap and month spill, jumps by page and week bounds, and selects with Enter",
    async (variant) => {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025 });

      // Roving tabindex: exactly one day button is a tab stop (today in-month, else the first).
      const stops = Array.from(root.querySelectorAll("[data-slot='calendar-day-button']")).filter(
        (b) => (b as HTMLElement).tabIndex === 0,
      );
      expect(stops.length).toBe(1);

      press(root, "2025-03-14", "ArrowRight");
      await awaitFocus(root, "2025-03-15");
      press(root, "2025-03-15", "ArrowDown");
      await awaitFocus(root, "2025-03-22");

      press(root, "2025-03-31", "ArrowRight");
      await awaitCell(root, "2025-04-01");
      await awaitFocus(root, "2025-04-01");
      expect(caption(root)).toBe("April 2025");

      press(root, "2025-04-01", "PageUp");
      await awaitCell(root, "2025-03-01");
      expect(caption(root)).toBe("March 2025");
      await awaitFocus(root, "2025-03-01");
      press(root, "2025-03-01", "PageDown");
      await awaitCell(root, "2025-04-01");
      expect(caption(root)).toBe("April 2025");

      press(root, "2025-04-15", "Home");
      await awaitFocus(root, "2025-04-13");
      press(root, "2025-04-15", "End");
      await awaitFocus(root, "2025-04-19");

      press(root, "2025-04-19", "Enter");
      expect(dayCell(root, "2025-04-19")!.getAttribute("data-selected")).toBe("true");
      press(root, "2025-04-18", " ");
      expect(dayCell(root, "2025-04-18")!.getAttribute("data-selected")).toBe("true");
      expect(dayCell(root, "2025-04-19")!.hasAttribute("data-selected")).toBe(false);
    },
  );
});
