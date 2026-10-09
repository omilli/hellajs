import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the component's delegated events share one dom instance.
import {
  assertAttrForwarded,
  assertStructuralParity,
  calendarDayButtonVariants,
  calendarVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";
import type { CalendarVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

const JAN_2024 = new Date(2024, 0, 1);
const FEB_2024 = new Date(2024, 1, 1);
const FEB_2100 = new Date(2100, 1, 1);
const MAR_2025 = new Date(2025, 2, 1);
const DEC_2025 = new Date(2025, 11, 1);

/** Typed render through the shared harness: the calendar carries no hook wiring — delegated events and scoped effects manage themselves — so there is nothing to await beyond the synchronous render. */
function calendarRoot(variant: { render: (props: CalendarVariantProps) => unknown }, props: CalendarVariantProps): HTMLElement {
  return renderVariant(variant as never, props) as HTMLElement;
}

/** The day cell (td) for an ISO key, or null between rebuilds. */
function dayCell(root: HTMLElement, iso: string): HTMLElement | null {
  return root.querySelector(`[data-slot='calendar-day'][data-date='${iso}']`);
}

/** The day button inside an ISO-keyed cell. */
function dayButton(root: HTMLElement, iso: string): HTMLButtonElement {
  const cell = dayCell(root, iso);
  expect(cell).not.toBeNull();
  return cell!.querySelector("button")!;
}

/** Polls (microtask hops) until a month rebuild has landed the cell for an ISO key. */
async function awaitCell(root: HTMLElement, iso: string): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const cell = dayCell(root, iso);
    if (cell) return cell;
    await delay();
  }
  expect(dayCell(root, iso)).not.toBeNull();
  return dayCell(root, iso)!;
}

/** Dispatches a bubbling click at a day button; delegated handlers resolve it on the body listener. */
function click(root: HTMLElement, iso: string): void {
  dayButton(root, iso).dispatchEvent(new Event("click", { bubbles: true }));
}

/** Focuses a day button and dispatches a bubbling keydown at it. */
function press(root: HTMLElement, iso: string, key: string): void {
  const button = dayButton(root, iso);
  button.focus();
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** Polls (microtask hops) until the roving focus has landed on the ISO-keyed day button. */
async function awaitFocus(root: HTMLElement, iso: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const button = dayCell(root, iso)?.querySelector("button");
    if (button && document.activeElement === button) return;
    await delay();
  }
  expect(document.activeElement).toBe(dayCell(root, iso)?.querySelector("button") ?? null);
}

/** The caption text ("March 2025"). */
function caption(root: HTMLElement): string {
  return root.querySelector("[data-slot='calendar-caption-label']")!.textContent ?? "";
}

describe("calendar", () => {
  test.each(calendarVariants)("$format/$style renders caption, nav aria-labels, weekday header, and the grid", (variant) => {
    const root = calendarRoot(variant, { defaultMonth: MAR_2025 });
    expect(root.getAttribute("data-slot")).toBe("calendar");
    expect(caption(root)).toBe("March 2025");
    expect(root.querySelector("[data-slot='calendar-grid']")!.getAttribute("role")).toBe("grid");
    expect(root.querySelector("[data-slot='calendar-previous']")!.getAttribute("aria-label")).toBe("Go to the previous month");
    expect(root.querySelector("[data-slot='calendar-next']")!.getAttribute("aria-label")).toBe("Go to the next month");
    const weekdays = Array.from(root.querySelectorAll("[data-slot='calendar-weekday']"));
    expect(weekdays.map((th) => th.textContent)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  test.each(calendarVariants)("$format/$style builds month grids: 31/30/28/29-day months, offsets, fixedWeeks, leap and century years", (variant) => {
    const cases: [props: CalendarVariantProps, cells: number, first: string, last: string, outside: number][] = [
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
  });

  test.each(calendarVariants)("$format/$style drops february 29th in non-leap years and keeps it in leap years", (variant) => {
    const century = calendarRoot(variant, { defaultMonth: FEB_2100 });
    expect(dayCell(century, "2100-02-29")).toBeNull();
    expect(dayCell(century, "2100-02-28")).not.toBeNull();
    const leap = calendarRoot(variant, { defaultMonth: FEB_2024 });
    expect(dayCell(leap, "2024-02-29")).not.toBeNull();
  });

  test.each(calendarVariants)("$format/$style tags outside days as disabled and hides them when showOutsideDays is false", (variant) => {
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
  });

  test.each(calendarVariants)("$format/$style navigates months from the nav buttons, over the december boundary, with controlled month winning", async (variant) => {
    let reported: Date | undefined;
    const root = calendarRoot(variant, { defaultMonth: MAR_2025, onMonthChange: (month) => { reported = month; } });
    root.querySelector("[data-slot='calendar-next']")!.dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(root, "2025-04-14");
    expect(caption(root)).toBe("April 2025");
    expect(reported!.getMonth()).toBe(3);
    expect(reported!.getFullYear()).toBe(2025);
    root.querySelector("[data-slot='calendar-previous']")!.dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(root, "2025-03-14");
    expect(caption(root)).toBe("March 2025");

    const rollover = calendarRoot(variant, { defaultMonth: DEC_2025 });
    rollover.querySelector("[data-slot='calendar-next']")!.dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(rollover, "2026-01-14");
    expect(caption(rollover)).toBe("January 2026");

    const month = signal(new Date(2025, 0, 1));
    const controlled = calendarRoot(variant, { month: () => month() });
    controlled.querySelector("[data-slot='calendar-next']")!.dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(controlled, "2025-02-14");
    expect(caption(controlled)).toBe("February 2025");
    month(new Date(2025, 5, 1));
    await awaitCell(controlled, "2025-06-14");
    expect(caption(controlled)).toBe("June 2025");
  });

  test.each(calendarVariants)("$format/$style selects, keeps, and replaces a single date", (variant) => {
    const onSelect = mock<(selected: unknown) => void>(() => undefined);
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

  test.each(calendarVariants)("$format/$style toggles multiple membership in stable order", (variant) => {
    let latest: Date[] = [];
    const root = calendarRoot(variant, {
      defaultMonth: MAR_2025,
      mode: "multiple",
      onSelect: (selected) => { latest = selected as Date[]; },
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

  test.each(calendarVariants)("$format/$style builds a range with ordering, reorders a backwards second click, and resets on the third", (variant) => {
    let latest: { from?: Date; to?: Date } = {};
    const root = calendarRoot(variant, {
      defaultMonth: MAR_2025,
      mode: "range",
      onSelect: (selected) => { latest = selected as { from?: Date; to?: Date }; },
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
      onSelect: (selected) => { latest = selected as { from?: Date; to?: Date }; },
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
  });

  test.each(calendarVariants)("$format/$style previews the dangling range end on hover and clears it on leave", (variant) => {
    const root = calendarRoot(variant, { defaultMonth: MAR_2025, mode: "range" });
    click(root, "2025-03-10");
    const hoverButton = dayButton(root, "2025-03-20");
    hoverButton.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-range-end")).toBe("true");
    expect(dayCell(root, "2025-03-15")!.getAttribute("data-range-middle")).toBe("true");
    hoverButton.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    expect(dayCell(root, "2025-03-20")!.hasAttribute("data-range-end")).toBe(false);
    expect(dayCell(root, "2025-03-15")!.hasAttribute("data-range-middle")).toBe(false);
  });

  test.each(calendarVariants)("$format/$style marks today with data-today, aria-current, and the locale data-day", (variant) => {
    const now = new Date();
    const root = calendarRoot(variant, { defaultMonth: new Date(now.getFullYear(), now.getMonth(), 1) });
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    const cell = dayCell(root, `${now.getFullYear()}-${month}-${day}`)!;
    expect(cell).not.toBeNull();
    expect(cell.getAttribute("data-today")).toBe("true");
    expect(cell.querySelector("button")!.getAttribute("aria-current")).toBe("date");
    expect(cell.querySelector("button")!.getAttribute("data-day")).toBe(new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString());
  });

  test.each(calendarVariants)("$format/$style blocks selection on disabled days and reports nothing", (variant) => {
    const onSelect = mock<(selected: unknown) => void>(() => undefined);
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
  });

  test.each(calendarVariants)("$format/$style omits the navigation when hideNavigation is set", (variant) => {
    const root = calendarRoot(variant, { defaultMonth: MAR_2025, hideNavigation: true });
    expect(root.querySelector("[data-slot='calendar-nav']")).toBeNull();
    expect(root.querySelector("[data-slot='calendar-previous']")).toBeNull();
  });

  test.each(calendarVariants)("$format/$style roves focus with arrows across week wrap and month spill, jumps by page and week bounds, and selects with Enter", async (variant) => {
    const root = calendarRoot(variant, { defaultMonth: MAR_2025 });

    // Roving tabindex: exactly one day button is a tab stop (today in-month, else the first).
    const stops = Array.from(root.querySelectorAll("[data-slot='calendar-day-button']")).filter((b) => (b as HTMLElement).tabIndex === 0);
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
  });

  test.each(calendarVariants)("$format/$style merges the class hooks and root class into the composed parts", (variant) => {
    const root = calendarRoot(variant, {
      defaultMonth: MAR_2025,
      class: "outer",
      classNames: { day: "hooked-day", day_button: "hooked-button", nav: "hooked-nav" },
    });
    expect(root.getAttribute("class")).toContain("outer");
    expect(dayCell(root, "2025-03-14")!.getAttribute("class")).toContain("hooked-day");
    expect(dayButton(root, "2025-03-14").getAttribute("class")).toContain("hooked-button");
    expect(root.querySelector("[data-slot='calendar-nav']")!.getAttribute("class")).toContain("hooked-nav");
    if (variant.style === "css") {
      expect(classTokens(dayCell(root, "2025-03-14")!).some((token) => token.startsWith("calendar-day"))).toBe(true);
    } else {
      expect(classTokens(dayCell(root, "2025-03-14")!)).toContain("group/day");
      expect(classTokens(dayButton(root, "2025-03-14"))).toContain("min-w-(--cell-size)");
    }
  });

  test.each(calendarDayButtonVariants)("$format/$style renders the manual day part with static flags, data-day, and aria semantics", (variant) => {
    const el = renderVariant(variant, { day: new Date(2025, 2, 14), selectedSingle: true, focused: true, today: true }) as HTMLElement;
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
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025 });
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025, mode: "range" });
    assertStructuralParity(calendarVariants, { defaultMonth: MAR_2025, hideNavigation: true });
    assertStructuralParity(calendarDayButtonVariants, { day: new Date(2025, 2, 14), selectedSingle: true }, ["data-day"]);
  });

  test("day-cell user on:click fires alongside the owned date-select across all four variants", () => {
    for (const variant of calendarVariants) {
      const userClick = mock(() => {});
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, "on:click": userClick });
      click(root, "2025-03-14");
      expect(userClick).toHaveBeenCalledTimes(1);
      const cell = dayCell(root, "2025-03-14")!;
      expect(cell.getAttribute("data-selected")).toBe("true");
    }
  });

  test("forwards user attrs onto the calendar root across all four variants", () => {
    assertAttrForwarded(calendarVariants, { defaultMonth: MAR_2025, title: "Hella" } as never, "title", "Hella");
  });

  test("merges a user class into the calendar root class across all four variants", () => {
    for (const variant of calendarVariants) {
      const root = calendarRoot(variant, { defaultMonth: MAR_2025, class: "my-calendar" });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-calendar");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });

  test("manual day button spreads a user on:click handler across all four variants", () => {
    for (const variant of calendarDayButtonVariants) {
      const userClick = mock(() => {});
      const root = renderVariant(variant, { day: new Date(2025, 2, 14), "on:click": userClick });
      root.dispatchEvent(new Event("click", { bubbles: true }));
      expect(userClick).toHaveBeenCalledTimes(1);
    }
  });
});
