import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { calendar } from "@hellajs/headless";
import { pressKey } from "./helpers";
import type { CalendarComponents } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

const MAR_2025 = new Date(2025, 2, 1);
const DEC_2025 = new Date(2025, 11, 1);

/** Today's ISO key (the current-month tests anchor on it; the clock is real). */
const TODAY_KEY = (() => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
})();

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

/** Mounts the full composition — Root > Months > Month > Caption/Nav/Grid — and waits for the grid cells. `key` is the ISO day the wait lands on (a day the visible month actually renders). */
async function mountCalendar(
  parts: CalendarComponents,
  options: { key?: string } = {},
): Promise<HTMLElement> {
  const navChildren: JSX.Element[] = [parts.PrevButton({}), parts.NextButton({})];
  const root = mountPart(
    parts.Root({
      children: [
        parts.Months({
          children: [
            parts.Month({
              children: [
                parts.Caption({ children: parts.CaptionLabel({}) }),
                parts.Nav({ children: navChildren }),
                parts.Grid({}),
              ],
            }),
          ],
        }),
      ],
    }),
  );
  await awaitCell(root, options.key ?? "2025-03-14");
  return root;
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

/** Focuses a day button and dispatches the shared bubbling cancelable keydown at it. */
function press(root: HTMLElement, iso: string, key: string): void {
  const button = dayButton(root, iso);
  button.focus();
  pressKey(button, key);
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
  test("the parts compose the full grid tree with caption, nav aria, and weekday header", async () => {
    const parts = calendar({ defaultMonth: MAR_2025 });
    const root = await mountCalendar(parts);
    expect(root.getAttribute("data-slot")).toBe("calendar");
    expect(caption(root)).toBe("March 2025");
    expect(root.querySelector("[data-slot='calendar-grid']")!.getAttribute("role")).toBe("grid");
    expect(root.querySelector("[data-slot='calendar-grid']")!.getAttribute("aria-label")).toBe(
      "March 2025",
    );
    expect(root.querySelector("[data-slot='calendar-previous']")!.getAttribute("aria-label")).toBe(
      "Go to the previous month",
    );
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
    expect(root.querySelector("[data-slot='calendar-months']")).not.toBeNull();
    expect(root.querySelector("[data-slot='calendar-month']")).not.toBeNull();
    expect(root.querySelector("[data-slot='calendar-caption']")).not.toBeNull();
    expect(root.querySelector("[data-slot='calendar-body']")).not.toBeNull();
  });

  test("nav buttons page the month, report onMonthChange, and roll over year edges", async () => {
    const onMonthChange = vi.fn((anchor: Date) => anchor);
    const parts = calendar({ defaultMonth: MAR_2025, onMonthChange });
    const root = await mountCalendar(parts);
    root
      .querySelector("[data-slot='calendar-next']")!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(root, "2025-04-14");
    expect(caption(root)).toBe("April 2025");
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect(onMonthChange.mock.calls[0]![0].getMonth()).toBe(3);

    root
      .querySelector("[data-slot='calendar-previous']")!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(root, "2025-03-14");
    expect(caption(root)).toBe("March 2025");

    const rollover = calendar({ defaultMonth: DEC_2025 });
    const rolloverRoot = await mountCalendar(rollover, { key: "2025-12-14" });
    rolloverRoot
      .querySelector("[data-slot='calendar-next']")!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(rolloverRoot, "2026-01-14");
    expect(caption(rolloverRoot)).toBe("January 2026");
  });

  test("a controlled month accessor snaps the view back while navigation still reports", async () => {
    const onMonthChange = vi.fn(() => {});
    const month = signal(new Date(2025, 0, 1));
    const parts = calendar({ month: () => month(), onMonthChange });
    const root = await mountCalendar(parts, { key: "2025-01-14" });
    await awaitCell(root, "2025-01-14");
    expect(caption(root)).toBe("January 2025");

    root
      .querySelector("[data-slot='calendar-next']")!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await awaitCell(root, "2025-02-14");
    expect(caption(root)).toBe("February 2025");
    expect(onMonthChange).toHaveBeenCalledTimes(1);

    month(new Date(2025, 5, 1));
    await awaitCell(root, "2025-06-14");
    expect(caption(root)).toBe("June 2025");
  });

  test("selecting a day writes the internal value, reports, and marks the cell", async () => {
    const onValueChange = vi.fn((value: unknown) => value);
    const parts = calendar({ defaultMonth: MAR_2025, onValueChange });
    const root = await mountCalendar(parts);
    click(root, "2025-03-14");
    expect(dayCell(root, "2025-03-14")!.getAttribute("data-selected")).toBe("true");
    expect(dayButton(root, "2025-03-14").getAttribute("aria-selected")).toBe("true");
    expect(dayButton(root, "2025-03-14").getAttribute("data-selected-single")).toBe("true");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect((onValueChange.mock.calls[0]![0] as Date).getTime()).toBe(
      new Date(2025, 2, 14).getTime(),
    );
    click(root, "2025-03-20");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(dayCell(root, "2025-03-14")!.hasAttribute("data-selected")).toBe(false);
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-selected")).toBe("true");
  });

  test("a controlled value accessor reports without writing; the controller's write reflects", async () => {
    const picked = signal<Date | undefined>(undefined);
    const onValueChange = vi.fn((value: unknown) => {
      picked(value as Date);
    });
    const parts = calendar({ defaultMonth: MAR_2025, value: () => picked(), onValueChange });
    const root = await mountCalendar(parts);
    click(root, "2025-03-14");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(dayCell(root, "2025-03-14")!.getAttribute("data-selected")).toBe("true");
    expect(picked()!.getTime()).toBe(new Date(2025, 2, 14).getTime());

    const ignored = calendar({
      defaultMonth: MAR_2025,
      value: () => undefined,
      onValueChange: () => {},
    });
    const ignoredRoot = await mountCalendar(ignored);
    click(ignoredRoot, "2025-03-14");
    expect(dayCell(ignoredRoot, "2025-03-14")!.hasAttribute("data-selected")).toBe(false);
  });

  test("multiple mode toggles membership in insertion order", async () => {
    const onValueChange = vi.fn((value: unknown) => value);
    const parts = calendar({ defaultMonth: MAR_2025, mode: "multiple", onValueChange });
    const root = await mountCalendar(parts);
    click(root, "2025-03-10");
    click(root, "2025-03-20");
    expect((onValueChange.mock.calls[1]![0] as Date[]).map((day) => day.getDate())).toEqual([
      10, 20,
    ]);
    expect(dayButton(root, "2025-03-20").getAttribute("data-selected-single")).toBe("true");
    click(root, "2025-03-10");
    expect((onValueChange.mock.calls[2]![0] as Date[]).map((day) => day.getDate())).toEqual([20]);
    expect(dayCell(root, "2025-03-10")!.hasAttribute("data-selected")).toBe(false);
  });

  test("range mode builds, reorders backwards, resets on the third click, and previews on hover", async () => {
    const onValueChange = vi.fn((value: unknown) => value);
    const parts = calendar({ defaultMonth: MAR_2025, mode: "range", onValueChange });
    const root = await mountCalendar(parts);
    click(root, "2025-03-10");
    expect((onValueChange.mock.calls[0]![0] as { from?: Date }).from!.getDate()).toBe(10);
    expect(dayCell(root, "2025-03-10")!.getAttribute("data-range-start")).toBe("true");

    // While `from` dangles, hovering borrows the preview as the range end.
    const hoverButton = dayButton(root, "2025-03-20");
    hoverButton.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-range-end")).toBe("true");
    expect(dayCell(root, "2025-03-15")!.getAttribute("data-range-middle")).toBe("true");
    hoverButton.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    expect(dayCell(root, "2025-03-20")!.hasAttribute("data-range-end")).toBe(false);
    expect(dayCell(root, "2025-03-15")!.hasAttribute("data-range-middle")).toBe(false);

    click(root, "2025-03-20");
    expect((onValueChange.mock.calls[1]![0] as { from?: Date; to?: Date }).to!.getDate()).toBe(20);
    expect(dayCell(root, "2025-03-15")!.getAttribute("data-range-middle")).toBe("true");
    expect(dayCell(root, "2025-03-20")!.getAttribute("data-range-end")).toBe("true");

    click(root, "2025-03-25");
    click(root, "2025-03-05");
    const third = onValueChange.mock.calls[3]![0] as { from?: Date; to?: Date };
    expect(third.from!.getDate()).toBe(5);
    expect(third.to!.getDate()).toBe(25);
  });

  test("disabled days and outside days block selection and report nothing", async () => {
    const onValueChange = vi.fn(() => {});
    const parts = calendar({
      defaultMonth: MAR_2025,
      disabled: (date: Date) => date.getDate() === 14,
      onValueChange,
    });
    const root = await mountCalendar(parts);
    expect(dayCell(root, "2025-03-14")!.getAttribute("data-disabled")).toBe("true");
    expect(dayButton(root, "2025-03-14").getAttribute("aria-disabled")).toBe("true");
    click(root, "2025-03-14");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(dayCell(root, "2025-03-14")!.hasAttribute("data-selected")).toBe(false);

    const outside = dayCell(root, "2025-02-23")!;
    expect(outside.getAttribute("data-outside")).toBe("true");
    expect(outside.getAttribute("data-disabled")).toBe("true");
    click(root, "2025-02-23");
    expect(onValueChange).not.toHaveBeenCalled();

    click(root, "2025-03-15");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  test("day aria tracks selection, today, and the locale data-day", async () => {
    const now = new Date();
    const parts = calendar({
      defaultMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    });
    const root = await mountCalendar(parts, { key: TODAY_KEY });
    const todayCell = dayCell(root, TODAY_KEY)!;
    expect(todayCell.getAttribute("data-today")).toBe("true");
    expect(todayCell.querySelector("button")!.getAttribute("aria-current")).toBe("date");
    expect(todayCell.querySelector("button")!.getAttribute("data-day")).toBe(
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString(),
    );
    click(root, TODAY_KEY);
    expect(todayCell.querySelector("button")!.getAttribute("aria-selected")).toBe("true");
  });

  test("exactly one day button is a tab stop: today in-month, else the first in-month day", async () => {
    const absent = calendar({ defaultMonth: MAR_2025 });
    const absentRoot = await mountCalendar(absent);
    const stops = Array.from(
      absentRoot.querySelectorAll("[data-slot='calendar-day-button']"),
    ).filter((button) => (button as HTMLElement).tabIndex === 0);
    expect(stops.length).toBe(1);
    expect(stops[0]!.textContent).toBe("1");

    const now = new Date();
    const present = calendar({
      defaultMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    });
    const presentRoot = await mountCalendar(present, { key: TODAY_KEY });
    const todayStops = Array.from(
      presentRoot.querySelectorAll("[data-slot='calendar-day-button']"),
    ).filter((button) => (button as HTMLElement).tabIndex === 0);
    expect(todayStops.length).toBe(1);
    expect(todayStops[0]!.getAttribute("aria-current")).toBe("date");
  });

  test("keyboard moves focus within and across months, jumps pages and week bounds, and selects", async () => {
    const parts = calendar({ defaultMonth: MAR_2025 });
    const root = await mountCalendar(parts);

    press(root, "2025-03-14", "ArrowRight");
    await awaitFocus(root, "2025-03-15");
    press(root, "2025-03-15", "ArrowDown");
    await awaitFocus(root, "2025-03-22");
    press(root, "2025-03-22", "ArrowUp");
    await awaitFocus(root, "2025-03-15");
    press(root, "2025-03-15", "ArrowLeft");
    await awaitFocus(root, "2025-03-14");

    press(root, "2025-03-31", "ArrowRight");
    await awaitCell(root, "2025-04-01");
    await awaitFocus(root, "2025-04-01");
    expect(caption(root)).toBe("April 2025");

    press(root, "2025-04-01", "PageUp");
    await awaitCell(root, "2025-03-01");
    await awaitFocus(root, "2025-03-01");
    expect(caption(root)).toBe("March 2025");
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

  test("the DayButton part renders the manual composition flags", () => {
    const { DayButton } = calendar();
    const el = mountPart(
      DayButton({ day: new Date(2025, 2, 14), selectedSingle: true, focused: true, today: true }),
    );
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("data-slot")).toBe("calendar-day-button");
    expect(el.getAttribute("data-day")).toBe(new Date(2025, 2, 14).toLocaleDateString());
    expect(el.getAttribute("data-selected-single")).toBe("true");
    expect(el.getAttribute("aria-selected")).toBe("true");
    expect(el.getAttribute("aria-current")).toBe("date");
    expect(el.tabIndex).toBe(0);
    expect(el.textContent).toBe("14");

    const idle = mountPart(DayButton({ day: new Date(2025, 2, 14) }));
    expect(idle.hasAttribute("data-selected-single")).toBe(false);
    expect(idle.getAttribute("aria-selected")).toBe("false");
    expect(idle.tabIndex).toBe(-1);

    const flag = signal(false);
    const reactive = mountPart(DayButton({ day: new Date(2025, 2, 14), focused: () => flag() }));
    expect(reactive.tabIndex).toBe(-1);
    flag(true);
    expect(reactive.tabIndex).toBe(0);
  });

  test("parts forward class and native attributes", async () => {
    const parts = calendar({ defaultMonth: MAR_2025 });
    const root = mountPart(
      parts.Root({
        title: "Hella",
        class: "outer",
        children: [parts.Grid({ class: "grid-class", "aria-label": "Pick a day" })],
      }),
    );
    await awaitCell(root, "2025-03-14");
    expect(root.getAttribute("title")).toBe("Hella");
    expect(root.getAttribute("class")).toContain("outer");
    const grid = root.querySelector("[data-slot='calendar-grid']")!;
    expect(grid.getAttribute("class")).toContain("grid-class");
    expect(grid.getAttribute("aria-label")).toBe("Pick a day");
  });

  test("root disposal stops selection and keyboard wiring", async () => {
    const onValueChange = vi.fn(() => {});
    const parts = calendar({ defaultMonth: MAR_2025, onValueChange });
    const root = await mountCalendar(parts);
    const button = dayButton(root, "2025-03-14");
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    const before = document.activeElement;
    button.focus();
    pressKey(button, "Enter");
    expect(document.activeElement).toBe(before);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
