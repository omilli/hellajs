import { effect, signal, untracked } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import type { HTMLAttributes } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("calendar", {
  backgroundColor: tokens.background,
  padding: "0.75rem",
  width: "fit-content",
  "--cell-size": "2rem",
});

const months = style("calendar-months", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  position: "relative",
  "@media (min-width: 48rem)": {
    flexDirection: "row",
  },
});

const month = style("calendar-month", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
});

const monthCaption = style("calendar-caption", {
  alignItems: "center",
  display: "flex",
  height: "var(--cell-size)",
  justifyContent: "center",
  paddingInline: "var(--cell-size)",
  width: "100%",
});

const captionLabel = style("calendar-caption-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  userSelect: "none",
});

const nav = style("calendar-nav", {
  alignItems: "center",
  display: "flex",
  gap: "0.25rem",
  justifyContent: "space-between",
  left: "0",
  position: "absolute",
  right: "0",
  top: "0",
  width: "100%",
});

/** The ref's nav buttons: ghost icon-class button tokens with the default size tokens pre-merged out against `size-(--cell-size)`/`p-0`. */
const navButton = style("calendar-nav-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "var(--cell-size)",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  padding: "0",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  userSelect: "none",
  whiteSpace: "nowrap",
  width: "var(--cell-size)",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-disabled='true']": {
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
});

const icon = style("calendar-icon", {
  height: "1rem",
  width: "1rem",
});

const monthGrid = style("calendar-grid", {
  borderCollapse: "collapse",
  width: "100%",
});

const weekdays = style("calendar-weekdays", {
  display: "flex",
});

const weekday = style("calendar-weekday", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.mutedForeground,
  flex: "1 1 0%",
  fontSize: "0.8rem",
  fontWeight: "400",
  userSelect: "none",
});

const week = style("calendar-week", {
  display: "flex",
  marginTop: "0.5rem",
  width: "100%",
});

const day = style("calendar-day", {
  aspectRatio: "1 / 1",
  height: "100%",
  padding: "0",
  position: "relative",
  textAlign: "center",
  userSelect: "none",
  width: "100%",
});

/** The ref's CalendarDayButton: ghost icon-class tokens with the conflicts the ref's `cn()` resolves pre-merged; range/selection state rides the button's own data attributes. */
const dayButton = style("calendar-day-button", {
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  color: "inherit",
  display: "flex",
  flexDirection: "column",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "400",
  gap: "0.25rem",
  justifyContent: "center",
  lineHeight: "1",
  minWidth: "var(--cell-size)",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "100%",
  "& > span": {
    fontSize: "0.75rem",
    opacity: "0.7",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
      color: tokens.accentForeground,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
  "&[data-selected-single='true']": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&[data-range-start='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-end='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-middle='true']": {
    backgroundColor: tokens.accent,
    borderRadius: "0",
    color: tokens.accentForeground,
  },
});

css({
  "[data-slot='calendar-day'][data-today='true']": {
    backgroundColor: tokens.accent,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.accentForeground,
  },
  "[data-slot='calendar-day'][data-today='true'][data-selected='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-outside='true']": {
    color: tokens.mutedForeground,
  },
  "[data-slot='calendar-day'][data-disabled='true']": {
    color: tokens.mutedForeground,
    opacity: "0.5",
  },
  "[data-slot='calendar-day'][data-hidden='true']": {
    visibility: "hidden",
  },
  "[data-slot='calendar-day'][data-range-start='true']": {
    backgroundColor: tokens.accent,
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-range-middle='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-range-end='true']": {
    backgroundColor: tokens.accent,
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:first-child[data-selected='true'] button": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:last-child[data-selected='true'] button": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-focused='true'] [data-slot='calendar-day-button']": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    position: "relative",
    zIndex: "10",
  },
  "[data-slot='card-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
  "[data-slot='popover-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
});

/** Selection mode: one date, a set of dates, or a from/to span. */
type CalendarMode = "single" | "multiple" | "range";

/** Range selection shape; `from` without `to` is the dangling first click. */
interface CalendarRange {
  from?: Date;
  to?: Date;
}

/** Selected shape per mode: single → `Date`, multiple → `Date[]`, range → `CalendarRange`. */
type CalendarSelection = Date | Date[] | CalendarRange | undefined;

/** The ref's class hooks a caller may extend. The state hooks (today/outside/disabled/range/hidden) are data-attribute driven, so they are not class-mergeable. */
type CalendarClassKey =
  | "root"
  | "months"
  | "month"
  | "nav"
  | "button_previous"
  | "button_next"
  | "month_caption"
  | "caption_label"
  | "month_grid"
  | "weekdays"
  | "weekday"
  | "week"
  | "day"
  | "day_button";

interface CalendarProps extends HTMLAttributes<"div"> {
  /** Selection behavior; defaults to `"single"`. */
  mode?: CalendarMode;
  /** Initial selection in the shape the mode calls for; selection is uncontrolled, `onSelect` reports every change. */
  selected?: CalendarSelection;
  onSelect?: (selected: CalendarSelection) => void;
  /** Controlled visible-month accessor; when provided it snaps the view back on every change, winning over internal navigation. */
  month?: () => Date;
  onMonthChange?: (anchor: Date) => void;
  /** Initial visible month; defaults to the current month. */
  defaultMonth?: Date;
  /** Predicate blocking selection and keyboard activation; outside days are always disabled. */
  disabled?: (date: Date) => boolean;
  /** Renders leading/trailing adjacent-month days; defaults to `true`. */
  showOutsideDays?: boolean;
  /** Always renders six week rows so month-to-month navigation never resizes the grid. */
  fixedWeeks?: boolean;
  /** First day of the week; `0` = Sunday (default) through `6` = Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Omits the previous/next month navigation. */
  hideNavigation?: boolean;
  /** Per-part class hook overrides merged next to the component classes. */
  classNames?: Partial<Record<CalendarClassKey, string>>;
  class?: string;
}

interface CalendarDayButtonProps extends HTMLAttributes<"button"> {
  /** The day this button renders; also emitted as `data-day` (locale string, per the ref). */
  day: Date;
  /** Reactive-capable selected flag; renders `data-selected-single` when the day is selected outside a range span. */
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  /** Reactive-capable disabled flag; renders the disabled state attributes (wired, not spread). */
  disabled?: boolean | (() => boolean);
  /** Reactive-capable roving-focus flag; drives `tabindex` 0/-1. */
  focused?: boolean | (() => boolean);
  /** Marks the day as today with `aria-current="date"`. */
  today?: boolean;
  class?: string;
}

const WEEKDAY_COUNT = 7;

const FIXED_WEEKS = 6;

/** Fixed en-US labels keep caption/weekday text deterministic across hosts; all date math stays in local fields (no timezone conversion). */
const LOCALE = "en-US";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** ISO `yyyy-mm-dd` key from local date fields; lexicographically ordered, so ranges compare as strings. */
function dayKey(date: Date): string {
  const paddedMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const paddedDay = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${paddedMonth}-${paddedDay}`;
}

function startOfWeek(date: Date, weekStartsOn: number): Date {
  return addDays(date, -((date.getDay() - weekStartsOn + WEEKDAY_COUNT) % WEEKDAY_COUNT));
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

function weekdayLabels(weekStartsOn: number): string[] {
  const labels: string[] = [];
  let i = 0;
  while (i < WEEKDAY_COUNT) {
    labels.push(new Date(2024, 0, 7 + ((weekStartsOn + i) % WEEKDAY_COUNT)).toLocaleDateString(LOCALE, { weekday: "short" }));
    i++;
  }
  return labels;
}

/** One grid day: `key` is the stable ISO identity used for focus, selection, and range math. */
interface CalendarCell {
  key: string;
  date: Date;
  outside: boolean;
  today: boolean;
  disabled: boolean;
}

function buildMonth(anchor: Date, weekStartsOn: number, fixedWeeks: boolean, disabled: ((date: Date) => boolean) | undefined): CalendarCell[][] {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const days = daysInMonth(anchor.getFullYear(), anchor.getMonth());
  const offset = (monthStart.getDay() - weekStartsOn + WEEKDAY_COUNT) % WEEKDAY_COUNT;
  const weeks = fixedWeeks ? FIXED_WEEKS : Math.ceil((offset + days) / WEEKDAY_COUNT);
  const today = new Date();
  const rows: CalendarCell[][] = [];
  let w = 0;
  while (w < weeks) {
    const row: CalendarCell[] = [];
    let d = 0;
    while (d < WEEKDAY_COUNT) {
      const date = addDays(gridStart, w * WEEKDAY_COUNT + d);
      const outside = !isSameMonth(date, anchor);
      row.push({
        key: dayKey(date),
        date,
        outside,
        today: isSameDay(date, today),
        disabled: outside || disabled?.(date) === true,
      });
      d++;
    }
    rows.push(row);
    w++;
  }
  return rows;
}

/** Today's key when the month shows it, else the first in-month day — the roving focus lands there. */
function defaultFocusKey(rows: CalendarCell[][]): string | undefined {
  const today = new Date();
  const todayKey = dayKey(today);
  let fallback: string | undefined;
  let r = 0;
  while (r < rows.length) {
    let c = 0;
    while (c < rows[r]!.length) {
      const cell = rows[r]![c]!;
      if (cell.today) return todayKey;
      if (fallback === undefined && !cell.outside) fallback = cell.key;
      c++;
    }
    r++;
  }
  return fallback;
}

const resolveFlag = (value: boolean | (() => boolean) | undefined): boolean => (typeof value === "function" ? value() : value === true);

const chevronLeftIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={
      [icon]
    }
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const chevronRightIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={
      [icon]
    }
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/**
 * The ref's manual-composition day part: a ghost icon-class button carrying the
 * selection/range data attributes. State flags accept plain booleans or reactive
 * accessors, so a composed calendar drives them live while a standalone call
 * passes static values.
 */
export function CalendarDayButton({ day: dayProp, selectedSingle, rangeStart, rangeEnd, rangeMiddle, disabled, focused, today, class: cls, ...attrs }: CalendarDayButtonProps): JSX.Element {
  const selected = (): boolean => resolveFlag(selectedSingle);
  return (
    <button
      type="button"
      data-slot="calendar-day-button"
      data-day={dayProp.toLocaleDateString()}
      data-selected-single={selected() ? "true" : undefined}
      data-range-start={resolveFlag(rangeStart) ? "true" : undefined}
      data-range-end={resolveFlag(rangeEnd) ? "true" : undefined}
      data-range-middle={resolveFlag(rangeMiddle) ? "true" : undefined}
      aria-selected={selected() || resolveFlag(rangeStart) || resolveFlag(rangeEnd) || resolveFlag(rangeMiddle) ? "true" : "false"}
      aria-disabled={resolveFlag(disabled as boolean | (() => boolean) | undefined) ? "true" : undefined}
      aria-current={today === true ? "date" : undefined}
      tabindex={resolveFlag(focused) ? 0 : -1}
      class={
        [dayButton, cls]
      }
      {...attrs}
    >{dayProp.getDate()}</button>
  );
}

interface DayCellProps {
  cell: CalendarCell;
  selected: () => boolean;
  rangeStart: () => boolean;
  rangeMiddle: () => boolean;
  rangeEnd: () => boolean;
  focused: () => boolean;
  hidden: boolean;
  /** The ref's `day` class hook, applied to the grid cell. */
  dayClass?: string;
  /** The ref's `day_button` class hook, forwarded to the day button. */
  buttonClass?: string;
  onSelect: (cell: CalendarCell) => void;
  onHover: (cell: CalendarCell) => void;
  onLeave: () => void;
}

/** One grid cell: the td carries the today/outside/disabled/range data attributes, the day button the aria semantics. */
function DayCell(props: DayCellProps): JSX.Element {
  const selectedSingle = (): boolean => props.selected() && !props.rangeStart() && !props.rangeEnd() && !props.rangeMiddle();
  return (
    <td
      role="gridcell"
      data-slot="calendar-day"
      data-date={props.cell.key}
      data-outside={props.cell.outside ? "true" : undefined}
      data-today={props.cell.today ? "true" : undefined}
      data-disabled={props.cell.disabled ? "true" : undefined}
      data-hidden={props.hidden ? "true" : undefined}
      data-focused={props.focused() ? "true" : undefined}
      data-selected={props.selected() ? "true" : undefined}
      data-range-start={props.rangeStart() ? "true" : undefined}
      data-range-middle={props.rangeMiddle() ? "true" : undefined}
      data-range-end={props.rangeEnd() ? "true" : undefined}
      class={
        [day, props.dayClass]
      }
    >
      <CalendarDayButton
        day={props.cell.date}
        selectedSingle={selectedSingle}
        rangeStart={props.rangeStart}
        rangeEnd={props.rangeEnd}
        rangeMiddle={props.rangeMiddle}
        disabled={props.cell.disabled}
        today={props.cell.today}
        focused={props.focused}
        class={props.buttonClass}
        on:click={() => props.onSelect(props.cell)}
        on:pointerenter={() => props.onHover(props.cell)}
        on:pointerleave={() => props.onLeave()}
      />
    </td>
  );
}

/**
 * Zero-dependency month-grid calendar: a hand-rolled date engine (31/30/28/29-day
 * months, week-start offsets, adjacent-month spillover) renders one month of week
 * rows with single, multiple, and range selection, roving keyboard focus, and
 * previous/next month navigation. `numberOfMonths > 1`, `fromDate`/`toDate`
 * bounds, custom `formatters`, and week numbers are out of scope.
 */
export default function Calendar({ mode: modeProp, selected, onSelect, month: monthProp, onMonthChange, defaultMonth, disabled, showOutsideDays, fixedWeeks, weekStartsOn: weekStartProp, hideNavigation, classNames, class: cls, ...attrs }: CalendarProps): JSX.Element {
  const mode = modeProp ?? "single";
  const weekStartsOn = weekStartProp ?? 0;

  const view = signal(startOfMonth(defaultMonth ?? monthProp?.() ?? new Date()));
  const selection = signal<CalendarSelection>(
    mode === "multiple" ? (selected as Date[] | undefined ?? []) : (selected as CalendarSelection),
  );
  const hoverKey = signal<string | undefined>(undefined);
  const focusedKey = signal<string | undefined>(undefined);
  const pendingFocus = signal<string | undefined>(undefined);
  const weeks = signal<CalendarCell[][]>([]);

  let cellIndex = new Map<string, CalendarCell>();
  let gridEl: HTMLElement | undefined;

  const rebuild = (): void => {
    const rows = buildMonth(view(), weekStartsOn, fixedWeeks === true, disabled);
    cellIndex = new Map();
    let r = 0;
    while (r < rows.length) {
      let c = 0;
      while (c < rows[r]!.length) {
        cellIndex.set(rows[r]![c]!.key, rows[r]![c]!);
        c++;
      }
      r++;
    }
    weeks(rows);
    // Untracked: a focus move must not re-run this rebuild effect (only the view signal tracks).
    const focused = untracked(() => focusedKey());
    if (focused === undefined || !cellIndex.has(focused)) focusedKey(defaultFocusKey(rows));
  };

  // Controlled month wins: whenever the accessor's signals change the view snaps back.
  effect(() => {
    const controlled = monthProp?.();
    if (controlled !== undefined) view(startOfMonth(controlled));
  });

  effect(() => {
    view();
    rebuild();
  });

  // Roving-focus landing: tracks the grid so a month spill focuses the target
  // button after the rebuild effect has rendered it (same-flush ordering).
  effect(() => {
    const key = pendingFocus();
    if (key === undefined) return;
    weeks();
    const button = gridEl?.querySelector<HTMLButtonElement>(`[data-date="${key}"] button`);
    if (button) {
      button.focus();
      pendingFocus(undefined);
    }
  });

  const isSelected = (date: Date): boolean => {
    const value = selection();
    if (mode === "single") return value !== undefined && isSameDay(value as Date, date);
    if (mode === "multiple") return (value as Date[]).some((dateValue) => isSameDay(dateValue, date));
    const range = (value as CalendarRange) ?? {};
    if (range.from === undefined) return false;
    if (range.to === undefined) return isSameDay(range.from, date);
    const key = dayKey(date);
    const from = dayKey(range.from);
    const to = dayKey(range.to);
    return key >= (from < to ? from : to) && key <= (from < to ? to : from);
  };

  /** Range edges off the live selection; a dangling `from` borrows the hover preview as the end. */
  const rangeEdge = (cell: CalendarCell, edge: "start" | "middle" | "end"): boolean => {
    if (mode !== "range") return false;
    const range = (selection() as CalendarRange) ?? {};
    if (range.from === undefined) return false;
    const startKey = dayKey(range.from);
    // A dangling `from` borrows the hover preview (already an ISO key) as the end.
    const endKey = range.to !== undefined ? dayKey(range.to) : hoverKey();
    if (endKey === undefined) {
      if (edge === "start") return cell.key === startKey;
      return false;
    }
    const lo = startKey < endKey ? startKey : endKey;
    const hi = startKey < endKey ? endKey : startKey;
    if (edge === "start") return cell.key === lo;
    if (edge === "end") return cell.key === hi;
    return cell.key > lo && cell.key < hi;
  };

  const notify = (): void => {
    const value = selection();
    if (mode === "single") {
      onSelect?.(value === undefined ? undefined : new Date(value as Date));
    } else if (mode === "multiple") {
      onSelect?.((value as Date[]).map((dateValue) => new Date(dateValue)));
    } else {
      const range = (value as CalendarRange) ?? {};
      onSelect?.({
        from: range.from === undefined ? undefined : new Date(range.from),
        to: range.to === undefined ? undefined : new Date(range.to),
      });
    }
  };

  const selectDay = (cell: CalendarCell): void => {
    if (cell.disabled) return;
    if (mode === "single") {
      selection(new Date(cell.date));
    } else if (mode === "multiple") {
      const current = selection() as Date[];
      const at = current.findIndex((date) => isSameDay(date, cell.date));
      selection(at === -1 ? [...current, new Date(cell.date)] : current.filter((_, i) => i !== at));
    } else {
      const range = (selection() as CalendarRange) ?? {};
      if (range.from === undefined || range.to !== undefined) {
        selection({ from: new Date(cell.date) });
      } else if (cell.date.getTime() < range.from.getTime()) {
        selection({ from: new Date(cell.date), to: new Date(range.from) });
      } else {
        selection({ from: range.from, to: new Date(cell.date) });
      }
    }
    notify();
    focusedKey(cell.key);
  };

  const onDayHover = (cell: CalendarCell): void => {
    if (mode !== "range") return;
    const range = (selection() as CalendarRange) ?? {};
    if (range.from !== undefined && range.to === undefined && !cell.disabled) hoverKey(cell.key);
  };

  const navMonth = (delta: number): void => {
    const next = addMonths(view(), delta);
    view(startOfMonth(next));
    onMonthChange?.(next);
  };

  /** Moves roving focus to `date`, switching the visible month first when the target spills out; the button is focused once the grid rebuilds. */
  const focusDay = (date: Date): void => {
    const key = dayKey(date);
    if (!isSameMonth(date, view())) {
      view(startOfMonth(date));
      onMonthChange?.(view());
    }
    hoverKey(undefined);
    focusedKey(key);
    pendingFocus(key);
  };

  const onGridKeydown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    gridEl = target?.closest?.("[data-slot='calendar-grid']") as HTMLElement | undefined;
    const key = target?.closest?.("[data-slot='calendar-day']")?.getAttribute("data-date");
    const cell = key === null || key === undefined ? undefined : cellIndex.get(key);
    if (!cell) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDay(cell);
      return;
    }
    let nextDate: Date | undefined;
    if (event.key === "ArrowRight") nextDate = addDays(cell.date, 1);
    else if (event.key === "ArrowLeft") nextDate = addDays(cell.date, -1);
    else if (event.key === "ArrowDown") nextDate = addDays(cell.date, WEEKDAY_COUNT);
    else if (event.key === "ArrowUp") nextDate = addDays(cell.date, -WEEKDAY_COUNT);
    else if (event.key === "PageDown") nextDate = addMonths(cell.date, 1);
    else if (event.key === "PageUp") nextDate = addMonths(cell.date, -1);
    else if (event.key === "Home") nextDate = startOfWeek(cell.date, weekStartsOn);
    else if (event.key === "End") nextDate = addDays(startOfWeek(cell.date, weekStartsOn), WEEKDAY_COUNT - 1);
    if (nextDate === undefined) return;
    event.preventDefault();
    focusDay(nextDate);
  };

  return (
    <div
      data-slot="calendar"
      class={
        [base, classNames?.root, cls]
      }
      {...attrs}
    >
      <div
        data-slot="calendar-months"
        class={
          [months, classNames?.months]
        }
      >
        <div
          data-slot="calendar-month"
          class={
            [month, classNames?.month]
          }
        >
          <div
            data-slot="calendar-caption"
            class={
              [monthCaption, classNames?.month_caption]
            }
          >
            <div
              data-slot="calendar-caption-label"
              aria-live="polite"
              class={
                [captionLabel, classNames?.caption_label]
              }
            >{monthLabel(view())}</div>
          </div>
          {hideNavigation === true ? undefined : (
            <nav
              data-slot="calendar-nav"
              class={
                [nav, classNames?.nav]
              }
            >
              <button
                type="button"
                data-slot="calendar-previous"
                aria-label="Go to the previous month"
                class={
                  [navButton, classNames?.button_previous]
                }
                on:click={() => navMonth(-1)}
              >
                {chevronLeftIcon()}
              </button>
              <button
                type="button"
                data-slot="calendar-next"
                aria-label="Go to the next month"
                class={
                  [navButton, classNames?.button_next]
                }
                on:click={() => navMonth(1)}
              >
                {chevronRightIcon()}
              </button>
            </nav>
          )}
          <table
            role="grid"
            data-slot="calendar-grid"
            aria-label={monthLabel(view())}
            class={
              [monthGrid, classNames?.month_grid]
            }
            on:keydown={(event: KeyboardEvent) => onGridKeydown(event)}
          >
            <thead>
              <tr
                role="row"
                data-slot="calendar-weekdays"
                class={
                  [weekdays, classNames?.weekdays]
                }
              >
                {weekdayLabels(weekStartsOn).map((label, index) => (
                  <th
                    scope="col"
                    abbr={new Date(2024, 0, 7 + ((weekStartsOn + index) % WEEKDAY_COUNT)).toLocaleDateString(LOCALE, { weekday: "long" })}
                    data-slot="calendar-weekday"
                    class={
                      [weekday, classNames?.weekday]
                    }
                  >{label}</th>
                ))}
              </tr>
            </thead>
            <tbody data-slot="calendar-body">
              <ForEach each={weeks} use={(row: CalendarCell[]) => (
                <tr
                  role="row"
                  data-slot="calendar-week"
                  class={
                    [week, classNames?.week]
                  }
                >
                  <ForEach each={row} use={(cell: CalendarCell) => (
                    <DayCell
                      cell={cell}
                      selected={() => isSelected(cell.date)}
                      rangeStart={() => rangeEdge(cell, "start")}
                      rangeMiddle={() => rangeEdge(cell, "middle")}
                      rangeEnd={() => rangeEdge(cell, "end")}
                      focused={() => focusedKey() === cell.key}
                      hidden={showOutsideDays === false && cell.outside}
                      dayClass={classNames?.day}
                      buttonClass={classNames?.day_button}
                      onSelect={selectDay}
                      onHover={onDayHover}
                      onLeave={() => hoverKey(undefined)}
                    />
                  )} />
                </tr>
              )} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
