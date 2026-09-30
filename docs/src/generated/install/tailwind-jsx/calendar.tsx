import { effect, signal, untracked } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { cn } from "./cn.js";

const months = "relative flex flex-col gap-4 md:flex-row";

const month = "flex w-full flex-col gap-4";

const nav = "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1";

const weekday = "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none";

const week = "mt-2 flex w-full";

/** The ref's day cell plus its state hooks, data-attribute driven: today/outside/disabled/hidden/range land as conditioned utilities on one static string (the ref's outside `aria-selected:` color rule folds into the base outside color). */
const day = "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md data-[today=true]:rounded-md data-[today=true]:bg-accent data-[today=true]:text-accent-foreground data-[today=true]:data-[selected=true]:rounded-none data-[outside=true]:text-muted-foreground data-[disabled=true]:text-muted-foreground data-[disabled=true]:opacity-50 data-[hidden=true]:invisible data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-accent data-[range-middle=true]:rounded-none data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-accent";

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

interface CalendarProps {
  /** Selection behavior; defaults to `"single"`. */
  mode?: CalendarMode;
  /** Initial selection in the shape the mode calls for; selection is uncontrolled, `onSelect` reports every change. */
  selected?: CalendarSelection;
  onSelect?: (selected: CalendarSelection) => void;
  /** Controlled visible-month accessor; when provided it snaps the view back on every change, winning over internal navigation. */
  month?: () => Date;
  onMonthChange?: (month: Date) => void;
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

interface CalendarDayButtonProps {
  /** The day this button renders; also emitted as `data-day` (locale string, per the ref). */
  day: Date;
  /** Reactive-capable selected flag; renders `data-selected-single` when the day is selected outside a range span. */
  selectedSingle?: boolean | (() => boolean);
  rangeStart?: boolean | (() => boolean);
  rangeEnd?: boolean | (() => boolean);
  rangeMiddle?: boolean | (() => boolean);
  disabled?: boolean | (() => boolean);
  /** Reactive-capable roving-focus flag; drives `tabindex` 0/-1. */
  focused?: boolean | (() => boolean);
  /** Marks the day as today with `aria-current="date"`. */
  today?: boolean;
  class?: string;
  onclick?: (event: MouseEvent) => void;
  onpointerenter?: (event: PointerEvent) => void;
  onpointerleave?: (event: PointerEvent) => void;
}

const WEEKDAY_COUNT = 7;

const FIXED_WEEKS = 6;

/** Fixed en-US labels keep caption/weekday text deterministic across hosts; all date math stays in local fields (no timezone conversion). */
const LOCALE = "en-US";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
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
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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

/** One grid day: `key` is the stable ISO identity, `id` salts it with the view epoch so a month change rebuilds every cell (per-cell static attributes never go stale on reused nodes). */
interface CalendarCell {
  id: string;
  key: string;
  date: Date;
  outside: boolean;
  today: boolean;
  disabled: boolean;
}

function buildMonth(month: Date, weekStartsOn: number, fixedWeeks: boolean, disabled: ((date: Date) => boolean) | undefined, epoch: number): CalendarCell[][] {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const days = daysInMonth(month.getFullYear(), month.getMonth());
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
      const outside = !isSameMonth(date, month);
      row.push({
        id: `${epoch}:${dayKey(date)}`,
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
      cn("size-4")
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
      cn("size-4")
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
export function CalendarDayButton(props: CalendarDayButtonProps): JSX.Element {
  const selected = (): boolean => resolveFlag(props.selectedSingle);
  return (
    <button
      type="button"
      data-slot="calendar-day-button"
      data-day={props.day.toLocaleDateString()}
      data-selected-single={selected() ? "true" : undefined}
      data-range-start={resolveFlag(props.rangeStart) ? "true" : undefined}
      data-range-end={resolveFlag(props.rangeEnd) ? "true" : undefined}
      data-range-middle={resolveFlag(props.rangeMiddle) ? "true" : undefined}
      aria-selected={selected() || resolveFlag(props.rangeStart) || resolveFlag(props.rangeEnd) || resolveFlag(props.rangeMiddle) ? "true" : "false"}
      aria-disabled={resolveFlag(props.disabled) ? "true" : undefined}
      aria-current={props.today === true ? "date" : undefined}
      tabindex={resolveFlag(props.focused) ? 0 : -1}
      class={
        cn("flex shrink-0 aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm font-normal leading-none whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:text-xs [&>span]:opacity-70 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-accent-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground", props.class)
      }
      on:click={(event: MouseEvent) => props.onclick?.(event)}
      on:pointerenter={(event: PointerEvent) => props.onpointerenter?.(event)}
      on:pointerleave={(event: PointerEvent) => props.onpointerleave?.(event)}
    >{props.day.getDate()}</button>
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
  class?: string;
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
        cn(day, props.class)
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
        onclick={() => props.onSelect(props.cell)}
        onpointerenter={() => props.onHover(props.cell)}
        onpointerleave={() => props.onLeave()}
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
export default function Calendar(props: CalendarProps): JSX.Element {
  const mode = props.mode ?? "single";
  const weekStartsOn = props.weekStartsOn ?? 0;

  const view = signal(startOfMonth(props.defaultMonth ?? props.month?.() ?? new Date()));
  const selection = signal<CalendarSelection>(
    mode === "multiple" ? (props.selected as Date[] | undefined ?? []) : (props.selected as CalendarSelection),
  );
  const hoverKey = signal<string | undefined>(undefined);
  const focusedKey = signal<string | undefined>(undefined);
  const pendingFocus = signal<string | undefined>(undefined);
  const weeks = signal<CalendarCell[][]>([]);

  let epoch = 0;
  let cellIndex = new Map<string, CalendarCell>();
  let gridEl: HTMLElement | undefined;

  const rebuild = (): void => {
    epoch++;
    const rows = buildMonth(view(), weekStartsOn, props.fixedWeeks === true, props.disabled, epoch);
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
    const controlled = props.month?.();
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
    if (mode === "multiple") return (value as Date[]).some((day) => isSameDay(day, date));
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
      props.onSelect?.(value === undefined ? undefined : new Date(value as Date));
    } else if (mode === "multiple") {
      props.onSelect?.((value as Date[]).map((day) => new Date(day)));
    } else {
      const range = (value as CalendarRange) ?? {};
      props.onSelect?.({
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
      const at = current.findIndex((day) => isSameDay(day, cell.date));
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
    props.onMonthChange?.(next);
  };

  /** Moves roving focus to `date`, switching the visible month first when the target spills out; the button is focused once the grid rebuilds. */
  const focusDay = (date: Date): void => {
    const key = dayKey(date);
    if (!isSameMonth(date, view())) {
      view(startOfMonth(date));
      props.onMonthChange?.(view());
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
        cn("group/calendar w-fit bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent", props.classNames?.root, props.class)
      }
    >
      <div
        data-slot="calendar-months"
        class={
          cn(months, props.classNames?.months)
        }
      >
        <div
          data-slot="calendar-month"
          class={
            cn(month, props.classNames?.month)
          }
        >
          <div
            data-slot="calendar-caption"
            class={
              cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", props.classNames?.month_caption)
            }
          >
            <div
              data-slot="calendar-caption-label"
              aria-live="polite"
              class={
                cn("font-medium select-none text-sm", props.classNames?.caption_label)
              }
            >{monthLabel(view())}</div>
          </div>
          {props.hideNavigation === true ? undefined : (
            <nav
              data-slot="calendar-nav"
              class={
                cn(nav, props.classNames?.nav)
              }
            >
              <button
                type="button"
                data-slot="calendar-previous"
                aria-label="Go to the previous month"
                class={
                  cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-(--cell-size) p-0 select-none aria-disabled:opacity-50", props.classNames?.button_previous)
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
                  cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-(--cell-size) p-0 select-none aria-disabled:opacity-50", props.classNames?.button_next)
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
              cn("w-full border-collapse", props.classNames?.month_grid)
            }
            on:keydown={(event: KeyboardEvent) => onGridKeydown(event)}
          >
            <thead>
              <tr
                role="row"
                data-slot="calendar-weekdays"
                class={
                  cn("flex", props.classNames?.weekdays)
                }
              >
                {weekdayLabels(weekStartsOn).map((label, index) => (
                  <th
                    scope="col"
                    abbr={new Date(2024, 0, 7 + ((weekStartsOn + index) % WEEKDAY_COUNT)).toLocaleDateString(LOCALE, { weekday: "long" })}
                    data-slot="calendar-weekday"
                    class={
                      cn(weekday, props.classNames?.weekday)
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
                    cn(week, props.classNames?.week)
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
                      hidden={props.showOutsideDays === false && cell.outside}
                      class={props.classNames?.day}
                      buttonClass={props.classNames?.day_button}
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
