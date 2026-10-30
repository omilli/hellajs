import { effect, isFunction, signal, untracked } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import type {
  CalendarCell,
  CalendarClass,
  CalendarCaptionLabelProps,
  CalendarCaptionProps,
  CalendarDayButtonProps,
  CalendarGridProps,
  CalendarMonthProps,
  CalendarMonthsProps,
  CalendarNavButtonProps,
  CalendarNavProps,
  CalendarOptions,
  CalendarComponents,
  CalendarRange,
  CalendarRootProps,
  CalendarSelection,
} from "./types/components";

const WEEKDAY_COUNT = 7;

const FIXED_WEEKS = 6;

/** Fixed en-US labels keep caption/weekday text deterministic across hosts; all date math stays in local fields (no timezone conversion). */
const LOCALE = "en-US";

/** The day count of `monthIndex` (0-based) in `year`, leap years included. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** A new date at the first day of `date`'s month, local fields only. */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** `date` shifted `amount` months, clamping the day into the target month's length. */
function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth())),
  );
}

/** A new date `amount` days from `date`, across month and year edges. */
function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Year/month/day equality on local fields; time-of-day never enters. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Year/month equality on local fields; outside-day detection rides on this. */
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** ISO `yyyy-mm-dd` key from local date fields; lexicographically ordered, so ranges compare as strings. */
function dayKey(date: Date): string {
  const paddedMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const paddedDay = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${paddedMonth}-${paddedDay}`;
}

/** The week's first day for `weekStartsOn`, sliding back at most six days. */
function startOfWeek(date: Date, weekStartsOn: number): Date {
  return addDays(date, -((date.getDay() - weekStartsOn + WEEKDAY_COUNT) % WEEKDAY_COUNT));
}

/** The `"March 2025"` caption label, fixed to en-US for deterministic rendering. */
function monthLabel(date: Date): string {
  return date.toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

/** The seven short weekday names starting at `weekStartsOn`, fixed to en-US. */
function weekdayLabels(weekStartsOn: number): string[] {
  const labels: string[] = [];
  let i = 0;
  while (i < WEEKDAY_COUNT) {
    labels.push(
      new Date(2024, 0, 7 + ((weekStartsOn + i) % WEEKDAY_COUNT)).toLocaleDateString(LOCALE, {
        weekday: "short",
      }),
    );
    i++;
  }
  return labels;
}

/** The month grid: week rows of cells from the week-start offset, `fixedWeeks` padding, adjacent-month spillover, and the `disabled` predicate (outside days always disabled). */
function buildMonth(
  anchor: Date,
  weekStartsOn: number,
  fixedWeeks: boolean,
  disabled: ((date: Date) => boolean) | undefined,
): CalendarCell[][] {
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

/** Resolves a reactive-capable state flag: an accessor reads live, a boolean reads statically. */
const resolveFlag = (value: boolean | (() => boolean) | undefined): boolean =>
  isFunction(value) ? value() : value === true;

/** One grid cell's render props: the per-cell state accessors over the factory's selection/focus model. */
interface DayCellProps {
  cell: CalendarCell;
  selected: () => boolean;
  rangeStart: () => boolean;
  rangeMiddle: () => boolean;
  rangeEnd: () => boolean;
  focused: () => boolean;
  hidden: boolean;
  /** The grid's `day` class hook, applied to the cell. */
  dayClass?: CalendarClass;
  /** The grid's `day_button` class hook, forwarded to the day button. */
  buttonClass?: CalendarClass;
  onSelect: (cell: CalendarCell) => void;
  onHover: (cell: CalendarCell) => void;
  onLeave: () => void;
}

/**
 * Creates the calendar part set: `Root`, `Months`, `Month`, `Caption`,
 * `CaptionLabel`, `Nav`, `PrevButton`, `NextButton`, `Grid`, and `DayButton`.
 * The closure owns the visible month (paged by the nav buttons and spill-causing
 * keys), the selection in the mode's shape — single, multiple, or range — the
 * roving focus key, and the range hover preview, with the whole month grid
 * derived per view change: adjacent-month spillover, `fixedWeeks`, week-start
 * offsets, and `disabled` days (outside days are always disabled). `Grid`
 * renders the full `role="grid"` table from that view model, wiring the
 * keyboard model on the table: arrows move focus day to day and across month
 * edges, PageUp/PageDown jump a month, Home/End jump the week bounds, and
 * Enter/Space select. Call in component scope so the state signals dispose
 * with the component.
 *
 * ```tsx
 * const Cal = calendar({ value: picked, onValueChange: (next) => picked(next) });
 *
 * <Cal.Root>
 *   <Cal.Months>
 *     <Cal.Month>
 *       <Cal.Caption><Cal.CaptionLabel /></Cal.Caption>
 *       <Cal.Nav>
 *         <Cal.PrevButton>{leftChevron}</Cal.PrevButton>
 *         <Cal.NextButton>{rightChevron}</Cal.NextButton>
 *       </Cal.Nav>
 *       <Cal.Grid />
 *     </Cal.Month>
 *   </Cal.Months>
 * </Cal.Root>
 * ```
 * @param options controlled-or-internal selection `value`, `mode`, the month channel (`month`/`onMonthChange`/`defaultMonth`), and the day-model options (`disabled`, `showOutsideDays`, `fixedWeeks`, `weekStartsOn`).
 * @returns The part set, composed as `Cal.Root`-style members.
 */
export function calendar(options: CalendarOptions = {}): CalendarComponents {
  const mode = options.mode ?? "single";
  const weekStartsOn = options.weekStartsOn ?? 0;
  const disabled = options.disabled;
  const showOutsideDays = options.showOutsideDays;
  const fixedWeeks = options.fixedWeeks;
  const value = options.value;
  const onValueChange = options.onValueChange;
  const controlledMonth = options.month;
  const onMonthChange = options.onMonthChange;

  const seed = isFunction(value) ? undefined : value;
  const view = signal(startOfMonth(options.defaultMonth ?? controlledMonth?.() ?? new Date()));
  const internal = signal<CalendarSelection>(
    mode === "multiple" ? ((seed as Date[] | undefined) ?? []) : seed,
  );
  const accessor = isFunction(value) ? value : undefined;
  const selection = (): CalendarSelection => (accessor ? accessor() : internal());
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
    const controlled = controlledMonth?.();
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
    const current = selection();
    if (mode === "single") return current !== undefined && isSameDay(current as Date, date);
    if (mode === "multiple")
      return (current as Date[]).some((dateValue) => isSameDay(dateValue, date));
    const range = (current as CalendarRange) ?? {};
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

  const selectDay = (cell: CalendarCell): void => {
    if (cell.disabled) return;
    let next: CalendarSelection;
    if (mode === "single") {
      next = new Date(cell.date);
    } else if (mode === "multiple") {
      const current = selection() as Date[];
      const at = current.findIndex((date) => isSameDay(date, cell.date));
      next = at === -1 ? [...current, new Date(cell.date)] : current.filter((_, i) => i !== at);
    } else {
      const range = (selection() as CalendarRange) ?? {};
      if (range.from === undefined || range.to !== undefined) {
        next = { from: new Date(cell.date) };
      } else if (cell.date.getTime() < range.from.getTime()) {
        next = { from: new Date(cell.date), to: new Date(range.from) };
      } else {
        next = { from: new Date(range.from), to: new Date(cell.date) };
      }
    }
    if (accessor === undefined) internal(next);
    onValueChange?.(next);
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
    else if (event.key === "End")
      nextDate = addDays(startOfWeek(cell.date, weekStartsOn), WEEKDAY_COUNT - 1);
    if (nextDate === undefined) return;
    event.preventDefault();
    focusDay(nextDate);
  };

  const DayButton = (props: CalendarDayButtonProps): JSX.Element => {
    const {
      day,
      selectedSingle,
      rangeStart,
      rangeEnd,
      rangeMiddle,
      disabled: disabledProp,
      focused,
      today,
      class: cls,
      ...attrs
    } = props;
    const selected = (): boolean => resolveFlag(selectedSingle);
    return (
      <button
        type="button"
        data-slot="calendar-day-button"
        data-day={day.toLocaleDateString()}
        data-selected-single={selected() ? "true" : undefined}
        data-range-start={resolveFlag(rangeStart) ? "true" : undefined}
        data-range-end={resolveFlag(rangeEnd) ? "true" : undefined}
        data-range-middle={resolveFlag(rangeMiddle) ? "true" : undefined}
        aria-selected={
          selected() || resolveFlag(rangeStart) || resolveFlag(rangeEnd) || resolveFlag(rangeMiddle)
            ? "true"
            : "false"
        }
        aria-disabled={resolveFlag(disabledProp) ? "true" : undefined}
        aria-current={today === true ? "date" : undefined}
        tabindex={resolveFlag(focused) ? 0 : -1}
        class={cls}
        {...attrs}
      >
        {day.getDate()}
      </button>
    );
  };

  /** One grid cell: the td carries the today/outside/disabled/range data attributes, the day button the aria semantics. */
  const DayCell = (props: DayCellProps): JSX.Element => {
    const selectedSingle = (): boolean =>
      props.selected() && !props.rangeStart() && !props.rangeEnd() && !props.rangeMiddle();
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
        class={props.dayClass}
      >
        <DayButton
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
  };

  const Root = (props: CalendarRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="calendar" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Months = (props: CalendarMonthsProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="calendar-months" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Month = (props: CalendarMonthProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="calendar-month" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Caption = (props: CalendarCaptionProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="calendar-caption" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const CaptionLabel = (props: CalendarCaptionLabelProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return (
      <div data-slot="calendar-caption-label" aria-live="polite" class={cls} {...attrs}>
        {monthLabel(view())}
      </div>
    );
  };

  const Nav = (props: CalendarNavProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <nav data-slot="calendar-nav" class={cls} {...attrs}>
        {children}
      </nav>
    );
  };

  const PrevButton = (props: CalendarNavButtonProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="calendar-previous"
        aria-label="Go to the previous month"
        class={cls}
        on:click={() => navMonth(-1)}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const NextButton = (props: CalendarNavButtonProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="calendar-next"
        aria-label="Go to the next month"
        class={cls}
        on:click={() => navMonth(1)}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Grid = (props: CalendarGridProps): JSX.Element => {
    const {
      weekdaysClass,
      weekdayClass,
      weekClass,
      dayClass,
      dayButtonClass,
      class: cls,
      ...attrs
    } = props;
    return (
      <table
        role="grid"
        data-slot="calendar-grid"
        aria-label={monthLabel(view())}
        class={cls}
        on:keydown={(event: KeyboardEvent) => onGridKeydown(event)}
        {...attrs}
      >
        <thead>
          <tr role="row" data-slot="calendar-weekdays" class={weekdaysClass}>
            {weekdayLabels(weekStartsOn).map((label, index) => (
              <th
                scope="col"
                abbr={new Date(
                  2024,
                  0,
                  7 + ((weekStartsOn + index) % WEEKDAY_COUNT),
                ).toLocaleDateString(LOCALE, { weekday: "long" })}
                data-slot="calendar-weekday"
                class={weekdayClass}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody data-slot="calendar-body">
          <ForEach
            each={weeks}
            use={(row: CalendarCell[]) => (
              <tr role="row" data-slot="calendar-week" class={weekClass}>
                <ForEach
                  each={row}
                  use={(cell: CalendarCell) => (
                    <DayCell
                      cell={cell}
                      selected={() => isSelected(cell.date)}
                      rangeStart={() => rangeEdge(cell, "start")}
                      rangeMiddle={() => rangeEdge(cell, "middle")}
                      rangeEnd={() => rangeEdge(cell, "end")}
                      focused={() => focusedKey() === cell.key}
                      hidden={showOutsideDays === false && cell.outside}
                      dayClass={dayClass}
                      buttonClass={dayButtonClass}
                      onSelect={selectDay}
                      onHover={onDayHover}
                      onLeave={() => hoverKey(undefined)}
                    />
                  )}
                />
              </tr>
            )}
          />
        </tbody>
      </table>
    );
  };

  return {
    Root,
    Months,
    Month,
    Caption,
    CaptionLabel,
    Nav,
    PrevButton,
    NextButton,
    Grid,
    DayButton,
  };
}
